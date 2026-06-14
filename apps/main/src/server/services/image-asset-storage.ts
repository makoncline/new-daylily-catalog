import path from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env, requireEnv } from "@/env";
import type { ImageType } from "@/types/image";

export const IMAGE_ASSET_VARIANT_CACHE_CONTROL =
  "public, max-age=31536000, immutable";
const IMAGE_ASSET_VERSION_ID_PATTERN = /^[a-f0-9]{12,32}$/;
const SAFE_IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

export interface UserImageAssetKeyArgs {
  kind: ImageType;
  userId: string;
  imageAssetId: string;
  listingId?: string | null;
  versionId?: string | null;
}

export function areImageAssetsEnabled() {
  return env.USE_IMAGE_ASSETS === "true";
}

export function areImageAssetUploadsConfigured() {
  return Boolean(
    env.R2_ACCOUNT_ID &&
      env.R2_ACCESS_KEY_ID &&
      env.R2_SECRET_ACCESS_KEY &&
      env.R2_BUCKET_NAME &&
      env.R2_PUBLIC_BASE_URL,
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
  assertCanonicalImageAssetKey(key);
  const publicBaseUrl = requireEnv(
    "R2_PUBLIC_BASE_URL",
    env.R2_PUBLIC_BASE_URL,
  ).replace(/\/+$/, "");

  const encodedKey = key
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `${publicBaseUrl}/${encodedKey}`;
}

export function getSafeImageExtension(fileName: string) {
  const ext = path.extname(fileName).toLowerCase();

  if (SAFE_IMAGE_EXTENSIONS.has(ext)) {
    return ext;
  }

  return ".jpg";
}

export function assertCanonicalImageAssetKey(key: string) {
  if (
    !key ||
    key.startsWith("/") ||
    key.includes("\\") ||
    key.includes("//")
  ) {
    throw new Error("ImageAsset key must be a canonical relative R2 key.");
  }

  const segments = key.split("/");
  if (
    segments.some(
      (segment) => segment === "" || segment === "." || segment === "..",
    )
  ) {
    throw new Error("ImageAsset key must not contain empty or dot segments.");
  }
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

  if (!IMAGE_ASSET_VERSION_ID_PATTERN.test(args.versionId)) {
    throw new Error("versionId must be 12 to 32 lowercase hex characters.");
  }

  return `${baseKey}/versions/${args.versionId}`;
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
    ? /^versions\/[a-f0-9]{12,32}\/original\.[a-z0-9]+$/
    : /^(?:versions\/[a-f0-9]{12,32}\/)?original\.[a-z0-9]+$/;

  return expectedPattern.test(relativeKey);
}

export function buildVariantImageAssetKeys(baseKeyOrArgs: string | UserImageAssetKeyArgs) {
  const baseKey =
    typeof baseKeyOrArgs === "string"
      ? baseKeyOrArgs
      : buildVersionedImageAssetBaseKey(baseKeyOrArgs);
  assertCanonicalImageAssetKey(baseKey);

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
    Bucket: requireEnv("R2_BUCKET_NAME", env.R2_BUCKET_NAME),
    Key: args.key,
    ContentType: args.contentType,
    CacheControl: args.cacheControl,
  });

  return getSignedUrl(getR2Client(), command, { expiresIn: 3600 });
}
