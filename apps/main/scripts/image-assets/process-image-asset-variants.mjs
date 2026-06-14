import { revalidatePublicCacheForAsset } from "./public-cache-revalidation.mjs";
import {
  buildWebpVariants,
  captureScriptException,
  createDb,
  createR2Client,
  DEFAULT_BATCH_SIZE,
  DEFAULT_CONCURRENCY,
  fetchSourceBuffer,
  getR2BucketName,
  publicUrlForKey,
  readIntEnv,
  runConcurrent,
  uploadObject,
  VARIANT_CACHE_CONTROL,
  variantKeysFromOriginalKey,
} from "./script-utils.mjs";

function parseArgs() {
  const args = process.argv.slice(2);
  const assetIdIndex = args.indexOf("--asset-id");
  const assetId = assetIdIndex >= 0 ? args[assetIdIndex + 1] : null;
  const limitIndex = args.indexOf("--limit");
  const limitValue = limitIndex >= 0 ? args[limitIndex + 1] : null;

  if (assetIdIndex >= 0 && (!assetId || assetId.startsWith("--"))) {
    throw new Error("--asset-id requires a value.");
  }

  return {
    dryRun: args.includes("--dry-run"),
    retryFailed: args.includes("--retry-failed"),
    assetId,
    limit:
      Number.parseInt(limitValue ?? "", 10) ||
      readIntEnv("IMAGE_ASSET_BACKFILL_BATCH_SIZE", DEFAULT_BATCH_SIZE),
  };
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

  const { buffer } = await fetchSourceBuffer(asset.originalUrl);
  const { display, thumb, blur } = await buildWebpVariants(buffer);

  await Promise.all([
    uploadObject(
      r2,
      bucket,
      keys.displayKey,
      display,
      "image/webp",
      VARIANT_CACHE_CONTROL,
    ),
    uploadObject(
      r2,
      bucket,
      keys.thumbKey,
      thumb,
      "image/webp",
      VARIANT_CACHE_CONTROL,
    ),
    uploadObject(
      r2,
      bucket,
      keys.blurKey,
      blur,
      "image/webp",
      VARIANT_CACHE_CONTROL,
    ),
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

async function main() {
  const args = parseArgs();
  const db = await createDb();
  const r2 = args.dryRun ? null : createR2Client();
  const bucket = args.dryRun ? null : getR2BucketName();
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
