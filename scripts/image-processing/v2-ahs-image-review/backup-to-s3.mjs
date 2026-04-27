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
const REVIEW_DB_PATH = path.join(REVIEW_ROOT, "review.sqlite");
const REVIEW_EDITED_DIR = path.join(REVIEW_ROOT, "edited");

dotenv.config({
  path: path.join(REPO_ROOT, ".env.development"),
  quiet: true,
});

function parseArgs(argv) {
  const args = {
    bucket: process.env.V2_IMAGE_REVIEW_S3_BUCKET?.trim() || "",
    prefix:
      process.env.V2_IMAGE_REVIEW_S3_PREFIX?.trim() || "v2-ahs-image-review",
    region: process.env.AWS_REGION?.trim() || "us-east-1",
    dryRun: false,
    force: false,
    includeDb: false,
    concurrency: 4,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--bucket") {
      args.bucket = argv[index + 1] ?? "";
      index += 1;
      continue;
    }

    if (arg === "--prefix") {
      args.prefix = argv[index + 1] ?? "";
      index += 1;
      continue;
    }

    if (arg === "--region") {
      args.region = argv[index + 1] ?? "";
      index += 1;
      continue;
    }

    if (arg === "--concurrency") {
      args.concurrency = Number(argv[index + 1] ?? "4");
      index += 1;
      continue;
    }

    if (arg === "--dry-run") {
      args.dryRun = true;
      continue;
    }

    if (arg === "--force") {
      args.force = true;
      continue;
    }

    if (arg === "--include-db") {
      args.includeDb = true;
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
      "Missing S3 bucket. Pass --bucket <name> or set V2_IMAGE_REVIEW_S3_BUCKET.",
    );
  }

  if (!args.region) {
    throw new Error("Missing AWS region.");
  }

  if (!Number.isInteger(args.concurrency) || args.concurrency < 1) {
    throw new Error("--concurrency must be a positive integer.");
  }

  args.prefix = normalizePrefix(args.prefix);

  return args;
}

function printHelp() {
  console.log(`Usage:
  node scripts/image-processing/v2-ahs-image-review/backup-to-s3.mjs [options]

Options:
  --bucket <name>        S3 bucket name
  --prefix <path>        Key prefix (default: v2-ahs-image-review)
  --region <name>        AWS region (default: AWS_REGION or us-east-1)
  --include-db           Also upload downloads/v2-ahs-image-review/review.sqlite
  --force                Re-upload even when the remote sha256 matches
  --dry-run              Print what would happen without uploading
  --concurrency <n>      Parallel upload workers (default: 4)
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

function listEditedFiles() {
  if (!fs.existsSync(REVIEW_EDITED_DIR)) {
    return [];
  }

  return fs
    .readdirSync(REVIEW_EDITED_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .filter(
      (entry) => !entry.name.startsWith("_") && !entry.name.endsWith(".part"),
    )
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((entry) => ({
      localPath: path.join(REVIEW_EDITED_DIR, entry.name),
      relativeKey: `edited/${entry.name}`,
      contentType: inferContentType(entry.name),
    }));
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

async function readRemoteMetadata(client, bucket, key) {
  try {
    const response = await client.send(
      new HeadObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );

    return {
      exists: true,
      sha256: response.Metadata?.sha256 ?? null,
    };
  } catch (error) {
    const statusCode = error?.$metadata?.httpStatusCode;
    const code = typeof error?.Code === "string" ? error.Code : null;
    const name = typeof error?.name === "string" ? error.name : null;

    if (
      statusCode === 404 ||
      code === "NotFound" ||
      code === "NoSuchKey" ||
      name === "NotFound"
    ) {
      return {
        exists: false,
        sha256: null,
      };
    }

    throw error;
  }
}

async function uploadOne(client, options, asset) {
  const key = joinS3Key(options.prefix, asset.relativeKey);
  const stat = fs.statSync(asset.localPath);
  const sha256 = await sha256File(asset.localPath);
  const remote = await readRemoteMetadata(client, options.bucket, key);

  if (!options.force && remote.exists && remote.sha256 === sha256) {
    return {
      action: "skip",
      key,
      bytes: stat.size,
    };
  }

  if (options.dryRun) {
    return {
      action: "upload",
      key,
      bytes: stat.size,
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
  };
}

async function runWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function runWorker() {
    while (true) {
      const currentIndex = nextIndex;
      nextIndex += 1;

      if (currentIndex >= items.length) {
        return;
      }

      results[currentIndex] = await worker(items[currentIndex], currentIndex);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => runWorker()),
  );

  return results;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const assets = listEditedFiles();

  if (options.includeDb && fs.existsSync(REVIEW_DB_PATH)) {
    assets.push({
      localPath: REVIEW_DB_PATH,
      relativeKey: "review.sqlite",
      contentType: inferContentType(REVIEW_DB_PATH),
    });
  }

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

  const s3Client = new S3Client({
    region: options.region,
  });

  const results = await runWithConcurrency(
    assets,
    options.concurrency,
    async (asset) => {
      const result = await uploadOne(s3Client, options, asset);
      console.log(
        `[v2-image-review-backup] ${result.action} ${result.key} (${formatBytes(result.bytes)})`,
      );
      return result;
    },
  );

  let uploaded = 0;
  let skipped = 0;
  let totalBytesUploaded = 0;

  for (const result of results) {
    if (!result) {
      continue;
    }

    if (result.action === "upload") {
      uploaded += 1;
      totalBytesUploaded += result.bytes;
      continue;
    }

    if (result.action === "skip") {
      skipped += 1;
    }
  }

  console.log(`[v2-image-review-backup] uploaded=${uploaded}`);
  console.log(`[v2-image-review-backup] skipped=${skipped}`);
  console.log(
    `[v2-image-review-backup] uploadedBytes=${formatBytes(totalBytesUploaded)}`,
  );
}

await main();
