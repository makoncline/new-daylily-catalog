import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { PrismaClient } from "@prisma/client";
import sharp from "sharp";
import { revalidatePublicCacheForAsset } from "./public-cache-revalidation.mjs";

const DEFAULT_CONCURRENCY = 5;
const DEFAULT_BATCH_SIZE = 50;
const DEFAULT_TIMEOUT_SECONDS = 60;
const DEFAULT_MAX_SOURCE_BYTES = 25 * 1024 * 1024;
const VARIANT_CACHE_CONTROL = "public, max-age=31536000, immutable";
const R2_BUCKET_NAME = "daylily-catalog-media";
const R2_PUBLIC_BASE_URL = "https://media.daylilycatalog.com";
const SENTRY_DSN =
  "https://b3773458fec6aa0c594a9c1c73ed046a@o1136137.ingest.us.sentry.io/4508939597643776";

let sentryCaptureException = null;
if (process.env.NEXT_PUBLIC_SENTRY_ENABLED !== "false") {
  try {
    const Sentry = await import("@sentry/nextjs");
    Sentry.init({ dsn: SENTRY_DSN, enableLogs: true });
    sentryCaptureException = Sentry.captureException;
  } catch (error) {
    console.warn("[image-assets] sentry unavailable", error);
  }
}

function readIntEnv(name, fallback) {
  const value = process.env[name];
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const assetIdIndex = args.indexOf("--asset-id");
  const assetId = assetIdIndex >= 0 ? args[assetIdIndex + 1] : null;

  if (assetIdIndex >= 0 && (!assetId || assetId.startsWith("--"))) {
    throw new Error("--asset-id requires a value.");
  }

  return {
    dryRun: args.includes("--dry-run"),
    retryFailed: args.includes("--retry-failed"),
    assetId,
    limit:
      Number.parseInt(args[args.indexOf("--limit") + 1] ?? "", 10) ||
      readIntEnv("IMAGE_ASSET_BACKFILL_BATCH_SIZE", DEFAULT_BATCH_SIZE),
  };
}

function captureScriptException(error, context) {
  try {
    sentryCaptureException?.(error, context);
  } catch (captureError) {
    console.warn("[image-assets] sentry capture failed", captureError);
  }
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

async function createDb() {
  const url = requireEnv("DATABASE_URL");

  if (url.startsWith("file:")) {
    const { PrismaBetterSqlite3 } = await import(
      "@prisma/adapter-better-sqlite3"
    );

    return new PrismaClient({
      adapter: new PrismaBetterSqlite3(
        { url },
        { timestampFormat: "unixepoch-ms" },
      ),
      log: ["error", "warn"],
    });
  }

  if (url.startsWith("libsql://")) {
    const { PrismaLibSql } = await import("@prisma/adapter-libsql");

    return new PrismaClient({
      adapter: new PrismaLibSql(
        {
          url,
          authToken: process.env.TURSO_DATABASE_AUTH_TOKEN,
        },
        { timestampFormat: "unixepoch-ms" },
      ),
      log: ["error"],
    });
  }

  throw new Error(`Unsupported DATABASE_URL: ${url}`);
}

function createR2Client() {
  return new S3Client({
    region: "auto",
    endpoint: `https://${requireEnv("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
    },
  });
}

function publicUrlForKey(key) {
  const baseUrl = (
    process.env.R2_PUBLIC_BASE_URL ?? R2_PUBLIC_BASE_URL
  ).replace(/\/+$/, "");
  return `${baseUrl}/${key
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;
}

function variantKeysFromOriginalKey(originalKey) {
  const baseKey = originalKey.replace(
    /\/(?:original|source-original|generated-original)\.[a-z0-9]+$/i,
    "",
  );
  return {
    displayKey: `${baseKey}/display-800.webp`,
    thumbKey: `${baseKey}/thumb-200.webp`,
    blurKey: `${baseKey}/blur-20.webp`,
  };
}

async function fetchSourceBuffer(url) {
  const timeoutSeconds = readIntEnv(
    "IMAGE_ASSET_BACKFILL_DOWNLOAD_TIMEOUT_SECONDS",
    DEFAULT_TIMEOUT_SECONDS,
  );
  const maxBytes = readIntEnv(
    "IMAGE_ASSET_BACKFILL_MAX_SOURCE_BYTES",
    DEFAULT_MAX_SOURCE_BYTES,
  );
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutSeconds * 1000);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Source download failed: ${response.status}`);
    }

    const contentLength = Number.parseInt(
      response.headers.get("content-length") ?? "",
      10,
    );
    if (Number.isFinite(contentLength) && contentLength > maxBytes) {
      throw new Error(`Source image exceeds ${maxBytes} bytes.`);
    }

    return readResponseBuffer(response, maxBytes);
  } finally {
    clearTimeout(timer);
  }
}

async function readResponseBuffer(response, maxBytes) {
  if (!response.body) {
    const fallbackBuffer = Buffer.from(await response.arrayBuffer());
    if (fallbackBuffer.byteLength > maxBytes) {
      throw new Error(`Source image exceeds ${maxBytes} bytes.`);
    }
    return fallbackBuffer;
  }

  const reader = response.body.getReader();
  const chunks = [];
  let totalBytes = 0;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        throw new Error(`Source image exceeds ${maxBytes} bytes.`);
      }

      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }

  return Buffer.concat(chunks, totalBytes);
}

async function uploadWebp(r2, bucket, key, body) {
  await r2.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: "image/webp",
      CacheControl: VARIANT_CACHE_CONTROL,
    }),
  );
}

async function processAsset({ asset, db, r2, bucket, dryRun }) {
  if (!asset.originalUrl || !asset.originalKey) {
    throw new Error(`ImageAsset ${asset.id} has no originalUrl/originalKey.`);
  }

  const keys = variantKeysFromOriginalKey(asset.originalKey);
  if (dryRun) {
    console.log("[dry-run] would process", asset.id, keys);
    return;
  }

  const source = await fetchSourceBuffer(asset.originalUrl);
  const base = sharp(source, { failOn: "error" }).rotate();
  const [display, thumb, blur] = await Promise.all([
    base
      .clone()
      .resize(800, 800, { fit: "cover" })
      .webp({ quality: 82 })
      .toBuffer(),
    base
      .clone()
      .resize(200, 200, { fit: "cover" })
      .webp({ quality: 78 })
      .toBuffer(),
    base
      .clone()
      .resize(20, 20, { fit: "cover" })
      .webp({ quality: 35 })
      .toBuffer(),
  ]);

  await Promise.all([
    uploadWebp(r2, bucket, keys.displayKey, display),
    uploadWebp(r2, bucket, keys.thumbKey, thumb),
    uploadWebp(r2, bucket, keys.blurKey, blur),
  ]);

  await db.imageAsset.update({
    where: { id: asset.id },
    data: {
      displayKey: keys.displayKey,
      displayUrl: publicUrlForKey(keys.displayKey),
      thumbKey: keys.thumbKey,
      thumbUrl: publicUrlForKey(keys.thumbKey),
      blurKey: keys.blurKey,
      blurUrl: publicUrlForKey(keys.blurKey),
      status: "ready",
    },
  });

  if (asset.legacyImageId) {
    await db.image.update({
      where: { id: asset.legacyImageId },
      data: { updatedAt: new Date() },
    });
  }

  try {
    await revalidatePublicCacheForAsset({ asset, db });
  } catch (error) {
    console.error("[image-assets] public cache revalidation failed", {
      imageAssetId: asset.id,
      error,
    });
    captureScriptException(error, {
      tags: { source: "image-assets:variants-revalidation" },
      extra: { imageAssetId: asset.id },
    });
  }

  console.log("[processed]", asset.id);
}

async function runConcurrent(items, concurrency, worker) {
  let index = 0;
  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (index < items.length) {
        const item = items[index++];
        await worker(item);
      }
    },
  );
  await Promise.all(workers);
}

async function main() {
  const args = parseArgs();
  const db = await createDb();
  const r2 = args.dryRun ? null : createR2Client();
  const bucket = process.env.R2_BUCKET_NAME ?? R2_BUCKET_NAME;
  const concurrency = readIntEnv(
    "IMAGE_ASSET_BACKFILL_CONCURRENCY",
    DEFAULT_CONCURRENCY,
  );

  try {
    const assets = await db.imageAsset.findMany({
      where: {
        ...(args.assetId ? { id: args.assetId } : {}),
        status: args.retryFailed
          ? { in: ["pending_variants", "variant_failed"] }
          : "pending_variants",
        originalUrl: { not: null },
        originalKey: { not: null },
        OR: [{ displayUrl: null }, { thumbUrl: null }, { blurUrl: null }],
      },
      orderBy: { createdAt: "asc" },
      take: args.limit,
    });

    console.log(
      `[image-assets] processing ${assets.length} assets with concurrency ${concurrency}`,
    );

    let failedCount = 0;

    await runConcurrent(assets, concurrency, async (asset) => {
      try {
        await processAsset({ asset, db, r2, bucket, dryRun: args.dryRun });
      } catch (error) {
        failedCount += 1;
        console.error("[failed]", asset.id, error);
        captureScriptException(error, {
          tags: { source: "image-assets:variants" },
          extra: { imageAssetId: asset.id },
        });
        if (!args.dryRun) {
          await db.imageAsset.update({
            where: { id: asset.id },
            data: { status: "variant_failed" },
          });
        }
      }
    });

    if (failedCount > 0) {
      console.error(
        `[image-assets] ${failedCount} of ${assets.length} variant items failed`,
      );
      process.exitCode = 1;
    }
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error("[image-assets] fatal", error);
  process.exitCode = 1;
});
