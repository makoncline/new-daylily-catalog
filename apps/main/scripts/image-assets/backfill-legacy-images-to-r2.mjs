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
  const limitIndex = args.indexOf("--limit");
  const limitValue = limitIndex >= 0 ? args[limitIndex + 1] : null;

  return {
    dryRun: args.includes("--dry-run"),
    retryFailed: args.includes("--retry-failed"),
    limit:
      Number.parseInt(limitValue ?? "", 10) ||
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
  if (!value) throw new Error(`${name} is required.`);
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

function extensionFromUrl(url) {
  try {
    const pathname = new URL(url).pathname;
    const match = pathname.match(/\.([a-z0-9]+)$/i);
    return match ? `.${match[1].toLowerCase()}` : ".jpg";
  } catch {
    return ".jpg";
  }
}

function contentTypeFromExtension(url) {
  const ext = extensionFromUrl(url);
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  return "image/jpeg";
}

function detectImageContentType(buffer, fallback) {
  if (
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return "image/jpeg";
  }

  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "image/png";
  }

  if (
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }

  if (buffer.subarray(0, 3).toString("ascii") === "GIF") {
    return "image/gif";
  }

  return fallback;
}

function originalKeyForImage(image) {
  const ext = extensionFromUrl(image.url);

  if (image.listingId) {
    return `users/${image.listing.userId}/listing-images/${image.listingId}/${image.id}/original${ext}`;
  }

  if (image.userProfileId) {
    return `users/${image.userProfile.userId}/profile-images/${image.id}/original${ext}`;
  }

  throw new Error(`Image ${image.id} has no supported owner.`);
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

    const responseContentType = response.headers.get("content-type");
    const contentLength = Number.parseInt(
      response.headers.get("content-length") ?? "",
      10,
    );
    if (Number.isFinite(contentLength) && contentLength > maxBytes) {
      throw new Error(`Source image exceeds ${maxBytes} bytes.`);
    }

    const buffer = await readResponseBuffer(response, maxBytes);

    return {
      buffer,
      contentType: detectImageContentType(
        buffer,
        responseContentType?.startsWith("image/")
          ? responseContentType
          : contentTypeFromExtension(url),
      ),
    };
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

async function uploadObject(r2, bucket, key, body, contentType, cacheControl) {
  await r2.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: cacheControl,
    }),
  );
}

async function backfillImage({ image, db, r2, bucket, dryRun }) {
  const originalKey = originalKeyForImage(image);
  const variantKeys = variantKeysFromOriginalKey(originalKey);
  const ownerData = image.listingId
    ? { listingId: image.listingId, kind: "listing" }
    : { userProfileId: image.userProfileId, kind: "profile" };

  if (dryRun) {
    console.log("[dry-run] would backfill", image.id, originalKey, variantKeys);
    return;
  }

  const { buffer, contentType } = await fetchSourceBuffer(image.url);
  const base = sharp(buffer, { failOn: "error" }).rotate();
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
    uploadObject(r2, bucket, originalKey, buffer, contentType, undefined),
    uploadObject(
      r2,
      bucket,
      variantKeys.displayKey,
      display,
      "image/webp",
      VARIANT_CACHE_CONTROL,
    ),
    uploadObject(
      r2,
      bucket,
      variantKeys.thumbKey,
      thumb,
      "image/webp",
      VARIANT_CACHE_CONTROL,
    ),
    uploadObject(
      r2,
      bucket,
      variantKeys.blurKey,
      blur,
      "image/webp",
      VARIANT_CACHE_CONTROL,
    ),
  ]);

  const asset = await db.imageAsset.upsert({
    where: { id: image.id },
    create: {
      id: image.id,
      legacyImageId: image.id,
      order: image.order,
      status: "ready",
      originalKey,
      originalUrl: publicUrlForKey(originalKey),
      displayKey: variantKeys.displayKey,
      displayUrl: publicUrlForKey(variantKeys.displayKey),
      thumbKey: variantKeys.thumbKey,
      thumbUrl: publicUrlForKey(variantKeys.thumbKey),
      blurKey: variantKeys.blurKey,
      blurUrl: publicUrlForKey(variantKeys.blurKey),
      ...ownerData,
    },
    update: {
      legacyImageId: image.id,
      order: image.order,
      status: "ready",
      originalKey,
      originalUrl: publicUrlForKey(originalKey),
      displayKey: variantKeys.displayKey,
      displayUrl: publicUrlForKey(variantKeys.displayKey),
      thumbKey: variantKeys.thumbKey,
      thumbUrl: publicUrlForKey(variantKeys.thumbKey),
      blurKey: variantKeys.blurKey,
      blurUrl: publicUrlForKey(variantKeys.blurKey),
      ...ownerData,
    },
  });

  await db.image.update({
    where: { id: image.id },
    data: { updatedAt: new Date() },
  });

  try {
    await revalidatePublicCacheForAsset({ asset, db });
  } catch (error) {
    console.error("[image-assets] public cache revalidation failed", {
      imageAssetId: asset.id,
      error,
    });
    captureScriptException(error, {
      tags: { source: "image-assets:backfill-revalidation" },
      extra: { imageAssetId: asset.id },
    });
  }

  console.log("[backfilled]", image.id);
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

async function findRetryImages(db, limit) {
  const failedAssets = await db.imageAsset.findMany({
    where: { status: "backfill_failed" },
    select: { id: true, legacyImageId: true },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
  const imageIds = failedAssets.map((asset) => asset.legacyImageId ?? asset.id);

  if (imageIds.length === 0) {
    return [];
  }

  return db.image.findMany({
    where: {
      id: { in: imageIds },
      OR: [
        { listingId: { not: null }, listing: { isNot: null } },
        { userProfileId: { not: null }, userProfile: { isNot: null } },
      ],
    },
    include: {
      listing: { select: { userId: true } },
      userProfile: { select: { userId: true } },
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: limit,
  });
}

async function findNewImages(db, limit) {
  const images = [];
  let cursor;
  const pageSize = Math.max(limit, DEFAULT_BATCH_SIZE);

  while (images.length < limit) {
    const page = await db.image.findMany({
      where: {
        OR: [
          { listingId: { not: null }, listing: { isNot: null } },
          { userProfileId: { not: null }, userProfile: { isNot: null } },
        ],
      },
      include: {
        listing: { select: { userId: true } },
        userProfile: { select: { userId: true } },
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      ...(cursor ? { cursor, skip: 1 } : {}),
      take: pageSize,
    });

    if (page.length === 0) {
      break;
    }

    for (const image of page) {
      const existingAsset = await db.imageAsset.findFirst({
        where: {
          OR: [{ id: image.id }, { legacyImageId: image.id }],
        },
        select: { id: true },
      });

      if (!existingAsset) {
        images.push(image);
      }

      if (images.length >= limit) {
        break;
      }
    }

    cursor = { id: page[page.length - 1].id };
  }

  return images;
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
    const images = args.retryFailed
      ? await findRetryImages(db, args.limit)
      : await findNewImages(db, args.limit);

    console.log(
      `[image-assets] backfilling ${images.length} images with concurrency ${concurrency}`,
    );

    let failedCount = 0;

    await runConcurrent(images, concurrency, async (image) => {
      try {
        await backfillImage({ image, db, r2, bucket, dryRun: args.dryRun });
      } catch (error) {
        failedCount += 1;
        console.error("[failed]", image.id, error);
        captureScriptException(error, {
          tags: { source: "image-assets:backfill" },
          extra: { imageId: image.id },
        });
        if (!args.dryRun) {
          await db.imageAsset.upsert({
            where: { id: image.id },
            create: {
              id: image.id,
              legacyImageId: image.id,
              order: image.order,
              kind: image.listingId ? "listing" : "profile",
              status: "backfill_failed",
              ...(image.listingId
                ? { listingId: image.listingId }
                : { userProfileId: image.userProfileId }),
            },
            update: { status: "backfill_failed" },
          });
        }
      }
    });

    if (failedCount > 0) {
      console.error(
        `[image-assets] ${failedCount} of ${images.length} backfill items failed`,
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
