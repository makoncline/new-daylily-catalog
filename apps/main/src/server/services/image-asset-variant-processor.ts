import "server-only";

import { PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { APP_CONFIG } from "@/config/constants";
import { env, requireEnv } from "@/env";
import type { db as appDb } from "@/server/db";
import {
  buildR2PublicUrl,
  buildVariantImageAssetKeysFromOriginalKey,
  getR2Client,
  IMAGE_ASSET_VARIANT_CACHE_CONTROL,
} from "@/server/services/image-asset-storage";

const DEFAULT_LIMIT = 1;
const DEFAULT_TIMEOUT_SECONDS = 60;

type DbClient = typeof appDb;

interface ProcessImageAssetVariantsOptions {
  db: DbClient;
  assetId?: string;
  limit?: number;
  retryFailed?: boolean;
}

interface ImageAssetVariantResult {
  id: string;
  status: "ready" | "failed";
  error?: string;
}

async function fetchSourceBuffer(url: string) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(DEFAULT_TIMEOUT_SECONDS * 1000),
  });
  if (!response.ok) {
    throw new Error(`Source download failed: ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.byteLength > APP_CONFIG.UPLOAD.MAX_FILE_SIZE) {
    throw new Error(
      `Source image exceeds ${APP_CONFIG.UPLOAD.MAX_FILE_SIZE} bytes.`,
    );
  }

  return buffer;
}

async function buildWebpVariants(source: Buffer) {
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

async function uploadWebp(args: {
  body: Buffer;
  bucket: string;
  client: ReturnType<typeof getR2Client>;
  key: string;
}) {
  await args.client.send(
    new PutObjectCommand({
      Bucket: args.bucket,
      Key: args.key,
      Body: args.body,
      ContentType: "image/webp",
      CacheControl: IMAGE_ASSET_VARIANT_CACHE_CONTROL,
    }),
  );
}

async function processOneImageAsset(
  db: DbClient,
  asset: Awaited<ReturnType<DbClient["imageAsset"]["findMany"]>>[number],
): Promise<ImageAssetVariantResult> {
  try {
    if (!asset.originalUrl || !asset.originalKey) {
      throw new Error("ImageAsset has no originalUrl/originalKey.");
    }

    const keys = buildVariantImageAssetKeysFromOriginalKey(asset.originalKey);
    const source = await fetchSourceBuffer(asset.originalUrl);
    const { display, thumb, blur } = await buildWebpVariants(source);
    const bucket = requireEnv("R2_BUCKET_NAME", env.R2_BUCKET_NAME);
    const client = getR2Client();

    await Promise.all([
      uploadWebp({ bucket, client, key: keys.displayKey, body: display }),
      uploadWebp({ bucket, client, key: keys.thumbKey, body: thumb }),
      uploadWebp({ bucket, client, key: keys.blurKey, body: blur }),
    ]);

    await db.imageAsset.update({
      where: { id: asset.id },
      data: {
        displayKey: keys.displayKey,
        displayUrl: buildR2PublicUrl(keys.displayKey),
        thumbKey: keys.thumbKey,
        thumbUrl: buildR2PublicUrl(keys.thumbKey),
        blurKey: keys.blurKey,
        blurUrl: buildR2PublicUrl(keys.blurKey),
        status: "ready",
      },
    });

    if (asset.legacyImageId) {
      await db.image.update({
        where: { id: asset.legacyImageId },
        data: { updatedAt: new Date() },
      });
    }

    console.info("[image-assets] variants ready", { imageAssetId: asset.id });
    return { id: asset.id, status: "ready" };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    console.error("[image-assets] variants failed", {
      imageAssetId: asset.id,
      error,
    });

    await db.imageAsset.updateMany({
      where: { id: asset.id, status: { not: "ready" } },
      data: { status: "variant_failed" },
    });

    return { id: asset.id, status: "failed", error: message };
  }
}

function findProcessableImageAssets(args: {
  db: DbClient;
  assetId?: string;
  status: "pending_variants" | "variant_failed";
  limit: number;
}) {
  return args.db.imageAsset.findMany({
    where: {
      ...(args.assetId ? { id: args.assetId } : {}),
      status: args.status,
      originalUrl: { not: null },
      originalKey: { not: null },
      OR: [{ displayUrl: null }, { thumbUrl: null }, { blurUrl: null }],
    },
    orderBy: { createdAt: "asc" },
    take: args.limit,
  });
}

export async function processPendingImageAssetVariants(
  options: ProcessImageAssetVariantsOptions,
) {
  const limit = options.limit ?? DEFAULT_LIMIT;
  const pendingAssets = await findProcessableImageAssets({
    db: options.db,
    assetId: options.assetId,
    status: "pending_variants",
    limit,
  });
  const retryLimit = options.retryFailed ? limit - pendingAssets.length : 0;
  const failedAssets =
    retryLimit > 0
      ? await findProcessableImageAssets({
          db: options.db,
          assetId: options.assetId,
          status: "variant_failed",
          limit: retryLimit,
        })
      : [];
  const assets = [...pendingAssets, ...failedAssets];

  console.info("[image-assets] variants started", {
    assetId: options.assetId,
    count: assets.length,
    retryFailed: Boolean(options.retryFailed),
  });

  const results: ImageAssetVariantResult[] = [];
  for (const asset of assets) {
    results.push(await processOneImageAsset(options.db, asset));
  }

  const failed = results.filter((result) => result.status === "failed").length;
  console.info("[image-assets] variants finished", {
    processed: results.length,
    failed,
  });

  return {
    processed: results.length,
    failed,
    results,
  };
}
