import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";

import {
  buildWebpVariants,
  createDb,
  createR2Client,
  DEFAULT_BATCH_SIZE,
  DEFAULT_CONCURRENCY,
  publicUrlForKey,
  readIntEnv,
  requireEnv,
  runConcurrent,
  uploadObject,
  VARIANT_CACHE_CONTROL,
  variantKeysFromOriginalKey,
} from "./script-utils.mjs";

const DEFAULT_DATA_ROOT = path.join(
  os.homedir(),
  "daylily-catalog-image-processing",
);

function parseArgs() {
  const args = process.argv.slice(2);
  const valueAfter = (name) => {
    const index = args.indexOf(name);
    return index >= 0 ? args[index + 1] : null;
  };

  return {
    dryRun: args.includes("--dry-run"),
    retryFailed: args.includes("--retry-failed"),
    includeS3Manifest: args.includes("--include-s3-manifest"),
    allowRemoteDb: args.includes("--allow-remote-db"),
    limit:
      Number.parseInt(valueAfter("--limit") ?? "", 10) ||
      readIntEnv("IMAGE_ASSET_BACKFILL_BATCH_SIZE", DEFAULT_BATCH_SIZE),
    dataRoot:
      valueAfter("--data-root") ||
      process.env.V2_AHS_IMAGE_REVIEW_DATA_ROOT ||
      DEFAULT_DATA_ROOT,
  };
}

function assertLocalDatabaseUnlessExplicitlyAllowed(allowRemoteDb) {
  const databaseUrl = requireEnv("DATABASE_URL");
  if (!allowRemoteDb && !databaseUrl.startsWith("file:")) {
    throw new Error(
      "Refusing to run generated cultivar image backfill against a non-file DATABASE_URL. Use a local prod copy.",
    );
  }
}

function getManifestPath(dataRoot) {
  return path.join(dataRoot, "v2-ahs-image-review", "s3-manifest.sqlite");
}

function getReviewDbPath(dataRoot) {
  return path.join(dataRoot, "v2-ahs-image-review", "review.sqlite");
}

function readManifestItems({ dataRoot }) {
  const manifestPath = getManifestPath(dataRoot);
  if (!fs.existsSync(manifestPath)) {
    return [];
  }

  const manifest = new DatabaseSync(manifestPath, { readOnly: true });

  try {
    return manifest
      .prepare(
        `
          SELECT
            "localPath",
            "v2AhsCultivarId",
            "cultivarReferenceId"
          FROM "s3_image_backup_manifest"
          WHERE "status" IN ('uploaded', 'already_uploaded')
          ORDER BY "cultivarReferenceId" ASC
        `,
      )
      .all()
      .map((row) => ({
        localPath: String(row.localPath),
        v2AhsCultivarId: String(row.v2AhsCultivarId),
        cultivarReferenceId: String(row.cultivarReferenceId),
        source: "s3-manifest",
      }));
  } finally {
    manifest.close();
  }
}

function readReviewItems({ dataRoot }) {
  const reviewDbPath = getReviewDbPath(dataRoot);
  if (!fs.existsSync(reviewDbPath)) {
    return [];
  }

  const reviewDb = new DatabaseSync(reviewDbPath, { readOnly: true });

  try {
    return reviewDb
      .prepare(
        `
          SELECT
            "id" AS "cultivarReferenceId",
            "editedPath" AS "localPath"
          FROM "v2_image_review_queue"
          WHERE "status" IN ('review', 'approved')
            AND "editedPath" IS NOT NULL
            AND "id" LIKE 'cr-%'
          ORDER BY "id" ASC
        `,
      )
      .all()
      .map((row) => ({
        localPath: String(row.localPath),
        v2AhsCultivarId: "",
        cultivarReferenceId: String(row.cultivarReferenceId),
        source: "review-db",
      }));
  } finally {
    reviewDb.close();
  }
}

function mergeItems(...itemGroups) {
  const byCultivarReferenceId = new Map();

  for (const item of itemGroups.flat()) {
    byCultivarReferenceId.set(item.cultivarReferenceId, item);
  }

  return [...byCultivarReferenceId.values()].sort((left, right) =>
    left.cultivarReferenceId.localeCompare(right.cultivarReferenceId),
  );
}

function cultivarOriginalKey(item, imageAssetId) {
  return `cultivars/${item.cultivarReferenceId}/${imageAssetId}/original.png`;
}

async function filterItemsForRun({ db, items, retryFailed, limit }) {
  const candidateCultivarReferenceIds = [
    ...new Set(items.map((item) => item.cultivarReferenceId)),
  ];
  const validCultivarReferences = await db.cultivarReference.findMany({
    where: { id: { in: candidateCultivarReferenceIds } },
    select: { id: true },
  });
  const validCultivarReferenceIds = new Set(
    validCultivarReferences.map((cultivarReference) => cultivarReference.id),
  );
  const existingAssets = await db.imageAsset.findMany({
    where: { kind: "cultivar" },
    select: { cultivarReferenceId: true, status: true },
  });
  const existingStatusesByCultivarReferenceId = new Map();
  for (const asset of existingAssets) {
    if (!asset.cultivarReferenceId) continue;

    const statuses =
      existingStatusesByCultivarReferenceId.get(asset.cultivarReferenceId) ??
      new Set();
    statuses.add(asset.status);
    existingStatusesByCultivarReferenceId.set(
      asset.cultivarReferenceId,
      statuses,
    );
  }
  const selected = [];
  const missingReferenceSamples = [];
  let missingReferenceCount = 0;

  for (const item of items) {
    if (!validCultivarReferenceIds.has(item.cultivarReferenceId)) {
      missingReferenceCount += 1;
      if (missingReferenceSamples.length < 5) {
        missingReferenceSamples.push({
          cultivarReferenceId: item.cultivarReferenceId,
          source: item.source,
        });
      }
      continue;
    }

    const existingStatuses = existingStatusesByCultivarReferenceId.get(
      item.cultivarReferenceId,
    );

    if (!existingStatuses) {
      selected.push(item);
    } else if (existingStatuses.has("ready")) {
      continue;
    } else if (retryFailed) {
      console.warn("[generated-cultivar-backfill-retrying-non-ready]", {
        cultivarReferenceId: item.cultivarReferenceId,
        existingStatuses: [...existingStatuses],
      });
      selected.push(item);
    }

    if (selected.length >= limit) {
      break;
    }
  }

  if (missingReferenceCount > 0) {
    console.warn("[generated-cultivar-backfill-skipped-missing-references]", {
      count: missingReferenceCount,
      samples: missingReferenceSamples,
    });
  }

  return selected;
}

function findExistingReadyCultivarImageAsset(db, cultivarReferenceId) {
  return db.imageAsset.findFirst({
    where: {
      kind: "cultivar",
      cultivarReferenceId,
      status: "ready",
    },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
}

function isMissingCultivarReferenceError(error, item) {
  return (
    error instanceof Error &&
    error.message === `Missing CultivarReference ${item.cultivarReferenceId}`
  );
}

async function existingReadyCultivarImageAsset(db, item) {
  const existing = await findExistingReadyCultivarImageAsset(
    db,
    item.cultivarReferenceId,
  );
  return existing ?? null;
}

function generateImageAssetId() {
  return randomUUID();
}

async function backfillGeneratedCultivarImage({
  db,
  r2,
  bucket,
  item,
  dryRun,
}) {
  const cultivarReference = await db.cultivarReference.findUnique({
    where: { id: item.cultivarReferenceId },
    select: { id: true },
  });
  if (!cultivarReference) {
    throw new Error(`Missing CultivarReference ${item.cultivarReferenceId}`);
  }

  const existingReadyAsset = dryRun
    ? null
    : await existingReadyCultivarImageAsset(db, item);
  if (existingReadyAsset) {
    console.log("[generated-cultivar-backfill-skipped-existing-ready]", {
      cultivarReferenceId: item.cultivarReferenceId,
      v2AhsCultivarId: item.v2AhsCultivarId,
      source: item.source,
      imageAssetId: existingReadyAsset.id,
    });
    return;
  }

  const imageAssetId = dryRun
    ? "<generated-image-asset-id>"
    : generateImageAssetId();
  const originalKey = cultivarOriginalKey(item, imageAssetId);
  const variantKeys = variantKeysFromOriginalKey(originalKey);

  if (dryRun) {
    console.log("[dry-run] would backfill generated cultivar image", {
      cultivarReferenceId: item.cultivarReferenceId,
      v2AhsCultivarId: item.v2AhsCultivarId,
      source: item.source,
      imageAssetId,
      originalKey,
      ...variantKeys,
    });
    return;
  }

  const urls = {
    originalUrl: publicUrlForKey(originalKey),
    displayUrl: publicUrlForKey(variantKeys.displayKey),
    thumbUrl: publicUrlForKey(variantKeys.thumbKey),
    blurUrl: publicUrlForKey(variantKeys.blurKey),
  };

  if (!fs.existsSync(item.localPath)) {
    throw new Error(`Generated image is missing: ${item.localPath}`);
  }

  const source = await fs.promises.readFile(item.localPath);
  const { display, thumb, blur } = await buildWebpVariants(source);

  await Promise.all([
    uploadObject(r2, bucket, originalKey, source, "image/png", undefined),
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

  await db.imageAsset.create({
    data: {
      id: imageAssetId,
      order: 0,
      kind: "cultivar",
      status: "ready",
      cultivarReferenceId: item.cultivarReferenceId,
      originalKey,
      originalUrl: urls.originalUrl,
      displayKey: variantKeys.displayKey,
      displayUrl: urls.displayUrl,
      thumbKey: variantKeys.thumbKey,
      thumbUrl: urls.thumbUrl,
      blurKey: variantKeys.blurKey,
      blurUrl: urls.blurUrl,
    },
  });

  console.log("[backfilled-generated-cultivar]", {
    cultivarReferenceId: item.cultivarReferenceId,
    v2AhsCultivarId: item.v2AhsCultivarId,
    source: item.source,
    imageAssetId,
  });
}

async function markBackfillFailed(db, item, error) {
  const message = error instanceof Error ? error.message : String(error);

  console.error("[generated-cultivar-backfill-failed]", {
    cultivarReferenceId: item.cultivarReferenceId,
    v2AhsCultivarId: item.v2AhsCultivarId,
    source: item.source,
    error: message,
  });
}

function logSkippedMissingCultivarReference(item, error) {
  const message = error instanceof Error ? error.message : String(error);

  console.error("[generated-cultivar-backfill-skipped]", {
    cultivarReferenceId: item.cultivarReferenceId,
    v2AhsCultivarId: item.v2AhsCultivarId,
    source: item.source,
    error: message,
  });
}

async function main() {
  const args = parseArgs();
  assertLocalDatabaseUnlessExplicitlyAllowed(args.allowRemoteDb);

  const db = await createDb();
  if (!args.dryRun) {
    requireEnv("R2_PUBLIC_BASE_URL");
  }
  const r2 = args.dryRun ? null : createR2Client();
  const bucket = args.dryRun ? null : requireEnv("R2_BUCKET_NAME");
  const concurrency = readIntEnv(
    "IMAGE_ASSET_BACKFILL_CONCURRENCY",
    DEFAULT_CONCURRENCY,
  );

  try {
    const manifestItems = args.includeS3Manifest
      ? readManifestItems({
          dataRoot: args.dataRoot,
        })
      : [];
    const reviewItems = readReviewItems({
      dataRoot: args.dataRoot,
    });
    const backfillItems = mergeItems(manifestItems, reviewItems);
    const items = await filterItemsForRun({
      db,
      items: backfillItems,
      retryFailed: args.retryFailed,
      limit: args.limit,
    });

    console.log(
      `[image-assets] generated cultivar backfill candidates=${items.length} manifestRows=${manifestItems.length} reviewRows=${reviewItems.length} mergedRows=${backfillItems.length} limit=${args.limit} concurrency=${concurrency}`,
    );

    let failedCount = 0;

    await runConcurrent(items, concurrency, async (item) => {
      try {
        await backfillGeneratedCultivarImage({
          db,
          r2,
          bucket,
          item,
          dryRun: args.dryRun,
        });
      } catch (error) {
        failedCount += 1;
        if (!args.dryRun && isMissingCultivarReferenceError(error, item)) {
          logSkippedMissingCultivarReference(item, error);
        } else if (!args.dryRun) {
          await markBackfillFailed(db, item, error);
        } else {
          console.error("[dry-run-failed]", item.cultivarReferenceId, error);
        }
      }
    });

    if (failedCount > 0) {
      console.error(
        `[image-assets] ${failedCount} of ${items.length} generated cultivar items failed`,
      );
      process.exitCode = 1;
    }
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error("[image-assets] generated cultivar fatal", error);
  process.exitCode = 1;
});
