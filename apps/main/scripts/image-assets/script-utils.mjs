import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { PrismaClient } from "@prisma/client";
import sharp from "sharp";

export const DEFAULT_CONCURRENCY = 5;
export const DEFAULT_BATCH_SIZE = 50;
export const DEFAULT_TIMEOUT_SECONDS = 60;
export const DEFAULT_MAX_SOURCE_BYTES = 25 * 1024 * 1024;
export const VARIANT_CACHE_CONTROL = "public, max-age=31536000, immutable";

export function readIntEnv(name, fallback) {
  const value = process.env[name];
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

export async function createDb() {
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

export function createR2Client() {
  return new S3Client({
    region: "auto",
    endpoint: `https://${requireEnv("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
    },
  });
}

export function publicUrlForKey(key) {
  const baseUrl = requireEnv("R2_PUBLIC_BASE_URL").replace(/\/+$/, "");
  return `${baseUrl}/${key
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;
}

export function extensionFromUrl(url) {
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
  return "image/jpeg";
}

export async function getDecodedImageContentType(buffer, fallbackUrl) {
  const metadata = await sharp(buffer).metadata();

  if (metadata.format === "png") return "image/png";
  if (metadata.format === "webp") return "image/webp";
  if (metadata.format === "jpeg") return "image/jpeg";

  return contentTypeFromExtension(fallbackUrl);
}

export function variantKeysFromOriginalKey(originalKey) {
  const baseKey = originalKey.replace(/\/original\.[a-z0-9]+$/i, "");
  if (baseKey === originalKey) {
    throw new Error(`Invalid ImageAsset original key: ${originalKey}`);
  }

  return {
    displayKey: `${baseKey}/display-800.webp`,
    thumbKey: `${baseKey}/thumb-200.webp`,
    blurKey: `${baseKey}/blur-20.webp`,
  };
}

export async function fetchSourceBuffer(url) {
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

export async function buildWebpVariants(source) {
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

  return { display, thumb, blur };
}

export async function uploadObject(
  r2,
  bucket,
  key,
  body,
  contentType,
  cacheControl,
) {
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

export async function runConcurrent(items, concurrency, worker) {
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
