import "server-only";

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
const ORIGINAL_IMAGE_ASSET_FILE_PATTERN =
  "original(?:-[a-f0-9]{64})?\\.(?:jpe?g|png|webp)";
const ORIGINAL_IMAGE_ASSET_KEY_PATTERN = new RegExp(
  `^${ORIGINAL_IMAGE_ASSET_FILE_PATTERN}$`,
);
let r2Client: S3Client | undefined;

function getR2Endpoint() {
  const integrationEndpoint = process.env.INTEGRATION_R2_ENDPOINT_URL;
  if (!integrationEndpoint) {
    return `https://${requireEnv("R2_ACCOUNT_ID", env.R2_ACCOUNT_ID)}.r2.cloudflarestorage.com`;
  }

  const url = new URL(integrationEndpoint);
  if (
    process.env.INTEGRATION_MODE !== "1" ||
    process.env.NODE_ENV === "production" ||
    url.protocol !== "http:" ||
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error("Integration R2 endpoint must be loopback HTTP.");
  }
  return url.toString();
}

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
  r2Client ??= new S3Client({
    region: "auto",
    endpoint: getR2Endpoint(),
    forcePathStyle: true,
    credentials: {
      accessKeyId: requireEnv("R2_ACCESS_KEY_ID", env.R2_ACCESS_KEY_ID),
      secretAccessKey: requireEnv(
        "R2_SECRET_ACCESS_KEY",
        env.R2_SECRET_ACCESS_KEY,
      ),
    },
  });

  return r2Client;
}

export function getR2BucketName() {
  return requireEnv("R2_BUCKET_NAME", env.R2_BUCKET_NAME);
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
  args: UserImageAssetKeyArgs & {
    contentType: ImageContentType;
    contentDigest?: string;
  },
) {
  if (args.contentDigest && !/^[a-f0-9]{64}$/.test(args.contentDigest)) {
    throw new Error("Image content digest must be SHA-256 hex.");
  }
  return `${buildUserImageAssetBaseKey(args)}/original${
    args.contentDigest ? `-${args.contentDigest}` : ""
  }${
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

export function buildVariantImageAssetKeysFromOriginalKey(originalKey: string) {
  assertCanonicalImageAssetKey(originalKey);

  const baseKey = originalKey.replace(
    /\/original(?:-[a-f0-9]{64})?\.[a-z0-9]+$/i,
    "",
  );
  if (baseKey === originalKey) {
    throw new Error(`Invalid ImageAsset original key: ${originalKey}`);
  }

  return buildVariantImageAssetKeys(baseKey);
}

export async function getR2PresignedPutUrl(args: {
  key: string;
  contentType: ImageContentType;
  contentMd5?: string;
  cacheControl?: string;
}) {
  const command = new PutObjectCommand({
    Bucket: getR2BucketName(),
    Key: args.key,
    ContentType: args.contentType,
    ContentMD5: args.contentMd5,
    CacheControl: args.cacheControl,
  });

  return getSignedUrl(getR2Client(), command, { expiresIn: 3600 });
}

export async function uploadR2ImageBuffer(args: {
  body: Buffer;
  contentType: ImageContentType;
  key: string;
}) {
  await getR2Client().send(
    new PutObjectCommand({
      Bucket: getR2BucketName(),
      Key: args.key,
      Body: args.body,
      ContentType: args.contentType,
      ContentLength: args.body.byteLength,
    }),
  );
}

export async function getR2OriginalUploadMetadata(args: {
  kind: ImageType;
  userId: string;
  listingId: string | null;
  imageAssetId: string;
  contentType: ImageContentType;
  contentMd5?: string;
  contentDigest?: string;
}) {
  if (!areImageAssetUploadsConfigured()) return null;

  const key = buildOriginalImageAssetKey(args);

  return {
    key,
    url: buildR2PublicUrl(key),
    presignedUrl: await getR2PresignedPutUrl({
      key,
      contentType: args.contentType,
      contentMd5: args.contentMd5,
    }),
  };
}
