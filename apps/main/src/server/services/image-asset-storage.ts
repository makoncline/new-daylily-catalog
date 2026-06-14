import path from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env, requireEnv } from "@/env";

export const IMAGE_ASSET_BUCKET_NAME = "daylily-catalog-media";
export const IMAGE_ASSET_PUBLIC_BASE_URL = "https://media.daylilycatalog.com";
export const IMAGE_ASSET_VARIANT_CACHE_CONTROL =
  "public, max-age=31536000, immutable";

export type UserImageAssetKind = "profile" | "listing";
export type ImageAssetKind = UserImageAssetKind | "cultivar";

export interface UserImageAssetKeyArgs {
  kind: UserImageAssetKind;
  userId: string;
  imageAssetId: string;
  listingId?: string | null;
  versionId?: string | null;
}

export interface CultivarImageAssetKeyArgs {
  cultivarReferenceId: string;
  normalizedName: string | null | undefined;
  imageAssetId: string;
}

export function areImageAssetsEnabled() {
  return env.USE_IMAGE_ASSETS === "true";
}

export function areImageAssetUploadsConfigured() {
  return Boolean(
    env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY,
  );
}

export function getR2BucketName() {
  return env.R2_BUCKET_NAME ?? IMAGE_ASSET_BUCKET_NAME;
}

export function getR2PublicBaseUrl() {
  return (env.R2_PUBLIC_BASE_URL ?? IMAGE_ASSET_PUBLIC_BASE_URL).replace(
    /\/+$/,
    "",
  );
}

export function getR2Client() {
  const accountId = requireEnv("R2_ACCOUNT_ID", env.R2_ACCOUNT_ID);

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: requireEnv("R2_ACCESS_KEY_ID", env.R2_ACCESS_KEY_ID),
      secretAccessKey: requireEnv(
        "R2_SECRET_ACCESS_KEY",
        env.R2_SECRET_ACCESS_KEY,
      ),
    },
  });
}

export function buildR2PublicUrl(key: string) {
  const encodedKey = key
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `${getR2PublicBaseUrl()}/${encodedKey}`;
}

export function getSafeImageExtension(fileName: string) {
  const ext = path.extname(fileName).toLowerCase();

  if (/^\.[a-z0-9]+$/.test(ext)) {
    return ext;
  }

  return ".jpg";
}

function sanitizePathSegment(value: string) {
  const sanitized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return sanitized || "unknown";
}

export function buildUserImageAssetBaseKey(args: UserImageAssetKeyArgs) {
  if (args.kind === "profile") {
    return `users/${args.userId}/profile-images/${args.imageAssetId}`;
  }

  if (!args.listingId) {
    throw new Error("listingId is required for listing image assets.");
  }

  return `users/${args.userId}/listing-images/${args.listingId}/${args.imageAssetId}`;
}

function buildVersionedImageAssetBaseKey(args: UserImageAssetKeyArgs) {
  const baseKey = buildUserImageAssetBaseKey(args);

  if (!args.versionId) {
    return baseKey;
  }

  return `${baseKey}/versions/${args.versionId}`;
}

export function buildCultivarImageAssetBaseKey(
  args: CultivarImageAssetKeyArgs,
) {
  return `cultivars/${sanitizePathSegment(args.normalizedName ?? "unknown")}-${args.cultivarReferenceId}/${args.imageAssetId}`;
}

export function buildOriginalImageAssetKey(
  args: UserImageAssetKeyArgs & { fileName: string },
) {
  return `${buildVersionedImageAssetBaseKey(args)}/original${getSafeImageExtension(
    args.fileName,
  )}`;
}

export function isExpectedOriginalImageAssetKey(
  args: UserImageAssetKeyArgs & { key: string; requireVersion?: boolean },
) {
  const baseKey = buildUserImageAssetBaseKey(args);
  if (!args.key.startsWith(`${baseKey}/`)) {
    return false;
  }

  const relativeKey = args.key.slice(baseKey.length + 1);
  const expectedPattern = args.requireVersion
    ? /^versions\/[a-f0-9]{12}\/original\.[a-z0-9]+$/
    : /^(?:versions\/[a-f0-9]{12}\/)?original\.[a-z0-9]+$/;

  return expectedPattern.test(relativeKey);
}

export function buildVariantImageAssetKeys(baseKey: string) {
  return {
    displayKey: `${baseKey}/display-800.webp`,
    thumbKey: `${baseKey}/thumb-200.webp`,
    blurKey: `${baseKey}/blur-20.webp`,
  } as const;
}

export async function getR2PresignedPutUrl(args: {
  key: string;
  contentType: string;
  cacheControl?: string;
}) {
  const command = new PutObjectCommand({
    Bucket: getR2BucketName(),
    Key: args.key,
    ContentType: args.contentType,
    CacheControl: args.cacheControl,
  });

  return getSignedUrl(getR2Client(), command, { expiresIn: 3600 });
}
