import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import {
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "../../..");
const REVIEW_ROOT = path.join(REPO_ROOT, "downloads", "v2-ahs-image-review");
const REVIEW_EDITED_DIR = path.join(REVIEW_ROOT, "edited");
const S3_MANIFEST_DB_PATH = path.join(REVIEW_ROOT, "s3-manifest.sqlite");
const PROD_COPY_DB_PATH = path.join(
  REPO_ROOT,
  "prisma",
  "local-prod-copy-daylily-catalog.db",
);
const LOCAL_S3_ENV_PATH = path.join(
  REPO_ROOT,
  "local",
  "v2-ahs-image-review",
  "s3.env",
);

dotenv.config({
  path: path.join(REPO_ROOT, ".env.development"),
  quiet: true,
});

dotenv.config({
  path: LOCAL_S3_ENV_PATH,
  override: true,
  quiet: true,
});

function parseArgs(argv) {
  const args = {
    bucket: process.env.V2_IMAGE_REVIEW_S3_BUCKET?.trim() || "",
    prefix:
      process.env.V2_IMAGE_REVIEW_S3_PREFIX?.trim() || "cultivar-images",
    region: process.env.AWS_REGION?.trim() || "us-east-1",
    dryRun: false,
    limit: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--limit") {
      args.limit = Number(argv[index + 1] ?? "");
      index += 1;
      continue;
    }

    if (arg === "--dry-run") {
      args.dryRun = true;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!args.bucket) {
    throw new Error(
      "Missing S3 bucket. Set V2_IMAGE_REVIEW_S3_BUCKET in local/v2-ahs-image-review/s3.env.",
    );
  }

  args.prefix = normalizePrefix(args.prefix);

  return args;
}

function printHelp() {
  console.log(`Usage:
  node scripts/image-processing/v2-ahs-image-review/backup-to-s3.mjs [options]

Options:
  --dry-run              Print what would happen without uploading
  --limit <n>            Process only the first n edited image files
  --help                 Show this help
`);
}

function normalizePrefix(prefix) {
  return String(prefix || "")
    .trim()
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
}

function joinS3Key(prefix, relativePath) {
  const cleanedRelative = String(relativePath).replace(/^\/+/, "");
  return [prefix, cleanedRelative].filter(Boolean).join("/");
}

function inferContentType(filePath) {
  const extension = path.extname(filePath).toLowerCase();

  if (extension === ".png") return "image/png";
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".webp") return "image/webp";
  if (extension === ".gif") return "image/gif";
  if (extension === ".sqlite" || extension === ".db")
    return "application/vnd.sqlite3";

  return "application/octet-stream";
}

function toS3NamePart(value, fallback) {
  const normalized = String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);

  return normalized || fallback;
}

function parseEditedImageStem(stem) {
  const match = String(stem).match(/^(.+?)_(\d+)$/);

  if (!match) {
    return {
      v2CultivarId: String(stem),
      isVariant: false,
    };
  }

  return {
    v2CultivarId: match[1],
    isVariant: true,
  };
}

async function readCultivarReferenceMetadataByV2Id() {
  const { DatabaseSync } = await import("node:sqlite");
  const database = new DatabaseSync(PROD_COPY_DB_PATH, {
    open: true,
    readOnly: true,
  });

  try {
    const rows = database
      .prepare(`
        SELECT
          "id",
          "v2AhsCultivarId",
          "normalizedName"
        FROM "CultivarReference"
        WHERE "v2AhsCultivarId" IS NOT NULL
      `)
      .all();

    return new Map(
      rows.map((row) => [
        String(row.v2AhsCultivarId),
        {
          cultivarReferenceId: String(row.id),
          normalizedName:
            typeof row.normalizedName === "string" ? row.normalizedName : null,
        },
      ]),
    );
  } finally {
    database.close();
  }
}

function buildImageRelativeKey(fileName, metadataByV2Id) {
  const parsed = path.parse(fileName);
  const { v2CultivarId } = parseEditedImageStem(parsed.name);
  const metadata = metadataByV2Id.get(v2CultivarId);

  if (!metadata) {
    throw new Error(
      `No CultivarReference found for edited image ${fileName} (expected V2 cultivar id ${v2CultivarId}).`,
    );
  }

  const namePart = toS3NamePart(metadata.normalizedName, parsed.name);
  const idPart = toS3NamePart(
    metadata.cultivarReferenceId,
    metadata.cultivarReferenceId,
  );

  return {
    relativeKey: `${namePart}-${idPart}${parsed.ext.toLowerCase()}`,
    v2CultivarId,
    cultivarReferenceId: metadata.cultivarReferenceId,
    normalizedName: metadata.normalizedName,
  };
}

async function listEditedFiles(limit) {
  if (!fs.existsSync(REVIEW_EDITED_DIR)) {
    return [];
  }

  const metadataByV2Id = await readCultivarReferenceMetadataByV2Id();

  return fs
    .readdirSync(REVIEW_EDITED_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .filter(
      (entry) => !entry.name.startsWith("_") && !entry.name.endsWith(".part"),
    )
    .filter((entry) => !parseEditedImageStem(path.parse(entry.name).name).isVariant)
    .sort((left, right) => left.name.localeCompare(right.name))
    .slice(0, limit ?? undefined)
    .map((entry) => {
      const keyInfo = buildImageRelativeKey(entry.name, metadataByV2Id);

      return {
        localPath: path.join(REVIEW_EDITED_DIR, entry.name),
        originalFileName: entry.name,
        relativeKey: keyInfo.relativeKey,
        contentType: inferContentType(entry.name),
        v2CultivarId: keyInfo.v2CultivarId,
        cultivarReferenceId: keyInfo.cultivarReferenceId,
        normalizedName: keyInfo.normalizedName,
      };
    });
}

async function sha256File(filePath) {
  return await new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);

    stream.on("data", (chunk) => {
      hash.update(chunk);
    });

    stream.on("end", () => {
      resolve(hash.digest("hex"));
    });

    stream.on("error", reject);
  });
}

async function readRemoteSha256(client, bucket, key) {
  try {
    const response = await client.send(
      new HeadObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );

    return response.Metadata?.sha256 ?? null;
  } catch {
    return null;
  }
}

async function readCompletedManifestEntries() {
  if (!fs.existsSync(S3_MANIFEST_DB_PATH)) {
    return new Map();
  }

  const { DatabaseSync } = await import("node:sqlite");
  const database = new DatabaseSync(S3_MANIFEST_DB_PATH, {
    open: true,
    readOnly: true,
  });

  try {
    const rows = database
      .prepare(`
        SELECT
          "localPath",
          "bucket",
          "key",
          "sha256",
          "status"
        FROM "s3_image_backup_manifest"
        WHERE "status" IN ('uploaded', 'already_uploaded')
      `)
      .all();

    return new Map(rows.map((row) => [row.localPath, row]));
  } finally {
    database.close();
  }
}

async function uploadOne(client, options, asset, previousManifest) {
  const key = joinS3Key(options.prefix, asset.relativeKey);
  const stat = fs.statSync(asset.localPath);
  const sha256 = await sha256File(asset.localPath);
  const localPath = path.relative(REPO_ROOT, asset.localPath);
  const previous = previousManifest.get(localPath);

  if (
    previous?.bucket === options.bucket &&
    previous?.key === key &&
    previous?.sha256 === sha256
  ) {
    return {
      action: "skip",
      key,
      bytes: stat.size,
      sha256,
    };
  }

  const remoteSha256 = await readRemoteSha256(client, options.bucket, key);

  if (remoteSha256 === sha256) {
    return {
      action: "skip",
      key,
      bytes: stat.size,
      sha256,
    };
  }

  if (options.dryRun) {
    return {
      action: "upload",
      key,
      bytes: stat.size,
      sha256,
    };
  }

  await client.send(
    new PutObjectCommand({
      Bucket: options.bucket,
      Key: key,
      Body: fs.createReadStream(asset.localPath),
      ContentType: asset.contentType,
      Metadata: {
        sha256,
      },
    }),
  );

  return {
    action: "upload",
    key,
    bytes: stat.size,
    sha256,
  };
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

async function openManifestDb() {
  fs.mkdirSync(path.dirname(S3_MANIFEST_DB_PATH), { recursive: true });
  const { DatabaseSync } = await import("node:sqlite");
  const database = new DatabaseSync(S3_MANIFEST_DB_PATH);

  database.exec(`
    CREATE TABLE IF NOT EXISTS "s3_image_backup_manifest" (
      "localPath" TEXT NOT NULL PRIMARY KEY,
      "originalFileName" TEXT NOT NULL,
      "v2AhsCultivarId" TEXT NOT NULL,
      "cultivarReferenceId" TEXT NOT NULL,
      "normalizedName" TEXT,
      "bucket" TEXT NOT NULL,
      "key" TEXT NOT NULL,
      "contentType" TEXT NOT NULL,
      "bytes" INTEGER NOT NULL,
      "sha256" TEXT NOT NULL,
      "status" TEXT NOT NULL,
      "lastUploadedAt" TEXT,
      "lastCheckedAt" TEXT NOT NULL,
      "lastError" TEXT,
      "createdAt" TEXT NOT NULL,
      "updatedAt" TEXT NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS "s3_image_backup_manifest_key_idx"
      ON "s3_image_backup_manifest"("bucket", "key");

    CREATE INDEX IF NOT EXISTS "s3_image_backup_manifest_cultivar_reference_idx"
      ON "s3_image_backup_manifest"("cultivarReferenceId");

    CREATE INDEX IF NOT EXISTS "s3_image_backup_manifest_status_idx"
      ON "s3_image_backup_manifest"("status");
  `);

  return database;
}

async function updateManifest({ assets, bucket, dryRun, results }) {
  const database = await openManifestDb();
  const now = new Date().toISOString();
  const upsert = database.prepare(`
    INSERT INTO "s3_image_backup_manifest" (
      "localPath",
      "originalFileName",
      "v2AhsCultivarId",
      "cultivarReferenceId",
      "normalizedName",
      "bucket",
      "key",
      "contentType",
      "bytes",
      "sha256",
      "status",
      "lastUploadedAt",
      "lastCheckedAt",
      "lastError",
      "createdAt",
      "updatedAt"
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT("localPath") DO UPDATE SET
      "originalFileName" = excluded."originalFileName",
      "v2AhsCultivarId" = excluded."v2AhsCultivarId",
      "cultivarReferenceId" = excluded."cultivarReferenceId",
      "normalizedName" = excluded."normalizedName",
      "bucket" = excluded."bucket",
      "key" = excluded."key",
      "contentType" = excluded."contentType",
      "bytes" = excluded."bytes",
      "sha256" = excluded."sha256",
      "status" = excluded."status",
      "lastUploadedAt" = COALESCE(excluded."lastUploadedAt", "s3_image_backup_manifest"."lastUploadedAt"),
      "lastCheckedAt" = excluded."lastCheckedAt",
      "lastError" = excluded."lastError",
      "updatedAt" = excluded."updatedAt"
  `);

  database.exec("BEGIN TRANSACTION");

  for (let index = 0; index < results.length; index += 1) {
    const asset = assets[index];
    const result = results[index];
    const status =
      dryRun && result.action === "upload"
        ? "would_upload"
        : result.action === "skip"
          ? "already_uploaded"
          : "uploaded";
    const localPath = path.relative(REPO_ROOT, asset.localPath);
    const uploadedAt = status === "uploaded" ? now : null;

    upsert.run(
      localPath,
      asset.originalFileName,
      asset.v2CultivarId,
      asset.cultivarReferenceId,
      asset.normalizedName,
      bucket,
      result.key,
      asset.contentType,
      result.bytes,
      result.sha256,
      status,
      uploadedAt,
      now,
      null,
      now,
      now,
    );
  }

  database.exec("COMMIT");
  database.close();
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const assets = await listEditedFiles(options.limit);

  if (assets.length === 0) {
    console.log("[v2-image-review-backup] nothing to upload");
    return;
  }

  console.log(`[v2-image-review-backup] bucket=${options.bucket}`);
  console.log(
    `[v2-image-review-backup] prefix=${options.prefix || "(root)"}`,
  );
  console.log(`[v2-image-review-backup] region=${options.region}`);
  console.log(`[v2-image-review-backup] files=${assets.length}`);
  console.log(`[v2-image-review-backup] mode=${options.dryRun ? "dry-run" : "upload"}`);
  console.log(
    `[v2-image-review-backup] manifestDb=${path.relative(REPO_ROOT, S3_MANIFEST_DB_PATH)}`,
  );

  const s3Client = new S3Client({
    region: options.region,
  });
  const previousManifest = await readCompletedManifestEntries();
  const results = [];

  for (const asset of assets) {
    const result = await uploadOne(s3Client, options, asset, previousManifest);
    results.push(result);
    console.log(
      `[v2-image-review-backup] ${result.action} ${result.key} (${formatBytes(result.bytes)})`,
    );
  }

  let uploaded = 0;
  let skipped = 0;
  let totalBytesUploaded = 0;

  for (const result of results) {
    if (result.action === "upload") {
      uploaded += 1;
      totalBytesUploaded += result.bytes;
      continue;
    }

    if (result.action === "skip") {
      skipped += 1;
    }
  }

  if (!options.dryRun) {
    await updateManifest({
      assets,
      bucket: options.bucket,
      dryRun: options.dryRun,
      results,
    });
  }

  console.log(`[v2-image-review-backup] uploaded=${uploaded}`);
  console.log(`[v2-image-review-backup] skipped=${skipped}`);
  console.log(
    `[v2-image-review-backup] uploadedBytes=${formatBytes(totalBytesUploaded)}`,
  );
  console.log(
    `[v2-image-review-backup] manifestDb=${path.relative(REPO_ROOT, S3_MANIFEST_DB_PATH)}`,
  );
}

await main();
