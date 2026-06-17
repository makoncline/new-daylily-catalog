import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env, requireEnv } from "@/env";
import {
  imageExtensionByContentType,
  type ImageContentType,
  type ImageType,
} from "@/types/image";

export const IMAGE_ASSET_VARIANT_CACHE_CONTROL =
  "public, max-age=31536000, immutable";
const ORIGINAL_IMAGE_ASSET_FILE_PATTERN = "original\\.(?:jpe?g|png|webp)";
const ORIGINAL_IMAGE_ASSET_KEY_PATTERN = new RegExp(
  `^${ORIGINAL_IMAGE_ASSET_FILE_PATTERN}$`,
);

export interface UserImageAssetKeyArgs {
  kind: ImageType;
  userId: string;
  imageAssetId: string;
  listingId?: string | null;
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

export function assertCanonicalImageAssetKey(key: string) {
  if (!key || key.startsWith("/") || key.includes("\\") || key.includes("//")) {
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

export function buildOriginalImageAssetKey(
  args: UserImageAssetKeyArgs & { contentType: ImageContentType },
) {
  return `${buildUserImageAssetBaseKey(args)}/original${
    imageExtensionByContentType[args.contentType]
  }`;
}

export function isExpectedOriginalImageAssetKey(
  args: UserImageAssetKeyArgs & { key: string },
) {
  const baseKey = buildUserImageAssetBaseKey(args);
  if (!args.key.startsWith(`${baseKey}/`)) {
    return false;
  }

  const relativeKey = args.key.slice(baseKey.length + 1);
  return ORIGINAL_IMAGE_ASSET_KEY_PATTERN.test(relativeKey);
}

export function buildVariantImageAssetKeys(
  baseKeyOrArgs: string | UserImageAssetKeyArgs,
) {
  const baseKey =
    typeof baseKeyOrArgs === "string"
      ? baseKeyOrArgs
      : buildUserImageAssetBaseKey(baseKeyOrArgs);
  assertCanonicalImageAssetKey(baseKey);

  return {
    displayKey: `${baseKey}/display-800.webp`,
    thumbKey: `${baseKey}/thumb-200.webp`,
    blurKey: `${baseKey}/blur-20.webp`,
  } as const;
}

export async function getR2PresignedPutUrl(args: {
  key: string;
  contentType: ImageContentType;
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

export async function getR2OriginalUploadMetadata(args: {
  kind: ImageType;
  userId: string;
  listingId: string | null;
  imageAssetId: string;
  contentType: ImageContentType;
}) {
  if (!areImageAssetUploadsConfigured()) return null;

  const key = buildOriginalImageAssetKey(args);

  return {
    key,
    url: buildR2PublicUrl(key),
    presignedUrl: await getR2PresignedPutUrl({
      key,
      contentType: args.contentType,
    }),
  };
}
