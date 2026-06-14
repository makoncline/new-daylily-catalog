import {
  buildWebpVariants,
  captureScriptException,
  createDb,
  createR2Client,
  DEFAULT_BATCH_SIZE,
  DEFAULT_CONCURRENCY,
  extensionFromUrl,
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
  const { display, thumb, blur } = await buildWebpVariants(buffer);

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

  console.log("[backfilled]", image.id);
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
  const bucket = args.dryRun ? null : getR2BucketName();
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
