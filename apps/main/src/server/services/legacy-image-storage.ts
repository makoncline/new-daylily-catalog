import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { env, requireEnv } from "@/env";
import {
  imageExtensionByContentType,
  type ImageContentType,
} from "@/types/image";
import { isHermeticMode } from "@/lib/hermetic/runtime.js";

let legacyS3Client: S3Client | undefined;

export function areLegacyImageUploadsConfigured() {
  return Boolean(
    env.AWS_ACCESS_KEY_ID &&
      env.AWS_SECRET_ACCESS_KEY &&
      env.AWS_REGION &&
      env.AWS_BUCKET_NAME,
  );
}

export function getLegacyImageUploadBucketName() {
  return requireEnv("AWS_BUCKET_NAME", env.AWS_BUCKET_NAME);
}

export function getLegacyImageUploadRegion() {
  return requireEnv("AWS_REGION", env.AWS_REGION);
}

export function getLegacyS3Client() {
  legacyS3Client ??= new S3Client({
    region: getLegacyImageUploadRegion(),
    credentials: {
      accessKeyId: requireEnv("AWS_ACCESS_KEY_ID", env.AWS_ACCESS_KEY_ID),
      secretAccessKey: requireEnv(
        "AWS_SECRET_ACCESS_KEY",
        env.AWS_SECRET_ACCESS_KEY,
      ),
    },
  });

  return legacyS3Client;
}

export function getLegacyImageUrl(key: string) {
  if (isHermeticMode()) {
    const baseUrl = process.env.APP_BASE_URL;
    if (!baseUrl) throw new Error("APP_BASE_URL is required in hermetic mode.");
    const encodedKey = key
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/");
    return `${baseUrl}/api/hermetic/images/${encodedKey}`;
  }

  return `https://${getLegacyImageUploadBucketName()}.s3.${getLegacyImageUploadRegion()}.amazonaws.com/${key}`;
}

export function getHermeticImageUploadUrl(key: string) {
  if (!isHermeticMode()) return null;
  return `${getLegacyImageUrl(key)}?upload=1`;
}

export function buildLegacyImageKey(args: {
  contentType: ImageContentType;
  fileId: string;
  referenceId: string;
  userId: string;
}) {
  const extension = imageExtensionByContentType[args.contentType];
  return `${args.userId}/${args.referenceId}/${args.fileId}${extension}`;
}

export async function uploadLegacyImageBuffer(args: {
  body: Buffer;
  contentType: ImageContentType;
  key: string;
}) {
  await getLegacyS3Client().send(
    new PutObjectCommand({
      Bucket: getLegacyImageUploadBucketName(),
      Key: args.key,
      Body: args.body,
      ContentType: args.contentType,
      ContentLength: args.body.byteLength,
    }),
  );
}

export function isLegacyImageKeyForTarget(args: {
  key: string;
  referenceId: string;
  userId: string;
}) {
  const prefix = `${args.userId}/${args.referenceId}/`;
  const hasAllowedExtension = Object.values(imageExtensionByContentType).some(
    (extension) => args.key.endsWith(extension),
  );

  return args.key.startsWith(prefix) && hasAllowedExtension;
}

function parseLegacyImageKey(url: string) {
  try {
    const parsed = new URL(url);
    const expectedHost = `${getLegacyImageUploadBucketName()}.s3.${getLegacyImageUploadRegion()}.amazonaws.com`;

    if (parsed.protocol !== "https:" || parsed.host !== expectedHost) {
      return null;
    }

    return decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));
  } catch {
    return null;
  }
}

export function getValidatedLegacyImageUrl(args: {
  key: string;
  referenceId: string;
  url: string;
  userId: string;
}) {
  if (isHermeticMode()) {
    return isLegacyImageKeyForTarget(args) &&
      args.url === getLegacyImageUrl(args.key)
      ? args.url
      : null;
  }

  const parsedKey = parseLegacyImageKey(args.url);
  if (
    !isLegacyImageKeyForTarget(args) ||
    parsedKey !== args.key ||
    args.url !== getLegacyImageUrl(args.key)
  ) {
    return null;
  }

  return getLegacyImageUrl(args.key);
}
