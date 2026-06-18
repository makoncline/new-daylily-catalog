import fs from "node:fs";
import os from "node:os";
import path from "node:path";
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

function readManifestItems({ dataRoot }) {
  const manifestPath = getManifestPath(dataRoot);
  const manifest = new DatabaseSync(manifestPath, { readOnly: true });

  try {
    return manifest
      .prepare(
        `
          SELECT
            "localPath",
            "originalFileName",
            "v2AhsCultivarId",
            "cultivarReferenceId",
            "normalizedName",
            "bytes",
            "sha256",
            "status"
          FROM "s3_image_backup_manifest"
          WHERE "status" IN ('uploaded', 'already_uploaded')
          ORDER BY "cultivarReferenceId" ASC
        `,
      )
      .all()
      .map((row) => ({
        localPath: String(row.localPath),
        originalFileName: String(row.originalFileName),
        v2AhsCultivarId: String(row.v2AhsCultivarId),
        cultivarReferenceId: String(row.cultivarReferenceId),
        normalizedName:
          typeof row.normalizedName === "string" ? row.normalizedName : null,
        bytes: Number(row.bytes),
        sha256: String(row.sha256),
        status: String(row.status),
      }));
  } finally {
    manifest.close();
  }
}

function cultivarImageAssetId(cultivarReferenceId) {
  return `cultivar-${cultivarReferenceId}`;
}

function cultivarOriginalKey(item, imageAssetId) {
  return `cultivars/${item.cultivarReferenceId}/${imageAssetId}/original.png`;
}

function variantKeysFromOriginalKey(originalKey) {
  const baseKey = originalKey.replace(/\/original\.png$/i, "");
  if (baseKey === originalKey) {
    throw new Error(`Invalid generated cultivar original key: ${originalKey}`);
  }

  return {
    displayKey: `${baseKey}/display-800.webp`,
    thumbKey: `${baseKey}/thumb-200.webp`,
    blurKey: `${baseKey}/blur-20.webp`,
  };
}

async function filterItemsForRun({ db, items, retryFailed, limit }) {
  const existingAssets = await db.imageAsset.findMany({
    where: { kind: "cultivar" },
    select: { cultivarReferenceId: true, status: true },
  });
  const existingStatusByCultivarReferenceId = new Map(
    existingAssets
      .filter((asset) => asset.cultivarReferenceId)
      .map((asset) => [asset.cultivarReferenceId, asset.status]),
  );
  const selected = [];

  for (const item of items) {
    const existingStatus = existingStatusByCultivarReferenceId.get(
      item.cultivarReferenceId,
    );

    if (!existingStatus) {
      selected.push(item);
    } else if (retryFailed && existingStatus !== "ready") {
      selected.push(item);
    }

    if (selected.length >= limit) {
      break;
    }
  }

  return selected;
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

  if (!fs.existsSync(item.localPath)) {
    throw new Error(`Generated image is missing: ${item.localPath}`);
  }

  const imageAssetId = cultivarImageAssetId(item.cultivarReferenceId);
  const originalKey = cultivarOriginalKey(item, imageAssetId);
  const variantKeys = variantKeysFromOriginalKey(originalKey);

  if (dryRun) {
    console.log("[dry-run] would backfill generated cultivar image", {
      cultivarReferenceId: item.cultivarReferenceId,
      v2AhsCultivarId: item.v2AhsCultivarId,
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

  await db.imageAsset.upsert({
    where: { id: imageAssetId },
    create: {
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
    update: {
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
    imageAssetId,
  });
}

async function markBackfillFailed(db, item, error) {
  const imageAssetId = cultivarImageAssetId(item.cultivarReferenceId);
  const message = error instanceof Error ? error.message : String(error);

  await db.imageAsset.upsert({
    where: { id: imageAssetId },
    create: {
      id: imageAssetId,
      order: 0,
      kind: "cultivar",
      status: "backfill_failed",
      cultivarReferenceId: item.cultivarReferenceId,
    },
    update: {
      status: "backfill_failed",
      cultivarReferenceId: item.cultivarReferenceId,
    },
  });

  console.error("[generated-cultivar-backfill-failed]", {
    cultivarReferenceId: item.cultivarReferenceId,
    v2AhsCultivarId: item.v2AhsCultivarId,
    error: message,
  });
}

async function main() {
  const args = parseArgs();
  assertLocalDatabaseUnlessExplicitlyAllowed(args.allowRemoteDb);

  const db = await createDb();
  const r2 = args.dryRun ? null : createR2Client();
  const bucket = args.dryRun ? null : requireEnv("R2_BUCKET_NAME");
  const concurrency = readIntEnv(
    "IMAGE_ASSET_BACKFILL_CONCURRENCY",
    DEFAULT_CONCURRENCY,
  );

  try {
    const manifestItems = readManifestItems({
      dataRoot: args.dataRoot,
    });
    const items = await filterItemsForRun({
      db,
      items: manifestItems,
      retryFailed: args.retryFailed,
      limit: args.limit,
    });

    console.log(
      `[image-assets] generated cultivar backfill candidates=${items.length} manifestRows=${manifestItems.length} limit=${args.limit} concurrency=${concurrency}`,
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
        if (!args.dryRun) {
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
