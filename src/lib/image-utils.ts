import { v4 as uuidv4 } from "uuid";
import { env } from "@/env";
import path from "path";
import {
  ImageType,
  ImageVariants,
  GenerateImageKeyParams,
  ImageError,
  ImageErrorType,
} from "@/types/image";
import { APP_CONFIG } from "@/config/constants";

class ImageProcessingError extends Error implements ImageError {
  type: ImageErrorType;

  constructor(message: string, type: ImageErrorType) {
    super(message);
    this.name = "ImageProcessingError";
    this.type = type;
  }
}

/**
 * Creates a typed ImageError
 */
function createImageError(
  message: string,
  type: ImageErrorType,
): ImageProcessingError {
  return new ImageProcessingError(message, type);
}

/**
 * Generates a unique key for storing an image in S3
 */
export function generateImageKey(
  type: ImageType,
  params: GenerateImageKeyParams,
): string {
  const { userId, fileName, listingId, userProfileId } = params;
  const extension = path.extname(fileName);
  const uuid = uuidv4();

  switch (type) {
    case "listing":
      if (!listingId) {
        throw createImageError(
          "listingId is required for listing images",
          ImageErrorType.VALIDATION_ERROR,
        );
      }
      return `listings/${userId}/${listingId}/${uuid}${extension}`;
    case "profile":
      if (!userProfileId) {
        throw createImageError(
          "userProfileId is required for profile images",
          ImageErrorType.VALIDATION_ERROR,
        );
      }
      return `profiles/${userId}/${userProfileId}/${uuid}${extension}`;
    default:
      throw createImageError(
        `Invalid image type: ${type as string}`,
        ImageErrorType.VALIDATION_ERROR,
      );
  }
}

/**
 * Gets the Cloudflare-delivered URL for an image with optional variant
 */
export function getImageUrl(
  key: string,
  variant?: keyof ImageVariants,
): string {
  const baseUrl = env.NEXT_PUBLIC_CLOUDFLARE_DELIVERY_URL;
  if (!baseUrl) {
    throw createImageError(
      "NEXT_PUBLIC_CLOUDFLARE_DELIVERY_URL is not configured",
      ImageErrorType.VALIDATION_ERROR,
    );
  }

  // Remove leading slash if present
  const cleanKey = key.startsWith("/") ? key.slice(1) : key;

  switch (variant) {
    case "thumbnail":
      return `${baseUrl}/image/resize,w_300,h_300,fit_cover/${cleanKey}`;
    case "blur":
      return `${baseUrl}/image/resize,w_20,h_20,blur_50/${cleanKey}`;
    case "original":
    default:
      return `${baseUrl}/${cleanKey}`;
  }
}

/**
 * Validates file size and type
 */
export function validateImage(file: File): void {
  if (file.size > APP_CONFIG.UPLOAD.MAX_FILE_SIZE) {
    throw createImageError(
      `File size exceeds maximum allowed size of ${
        APP_CONFIG.UPLOAD.MAX_FILE_SIZE / (1024 * 1024)
      }MB`,
      ImageErrorType.VALIDATION_ERROR,
    );
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];

  if (!allowedTypes.includes(file.type)) {
    throw createImageError(
      `Invalid file type. Allowed types: ${allowedTypes.join(", ")}`,
      ImageErrorType.VALIDATION_ERROR,
    );
  }
}

/**
 * Handles Cloudflare-specific errors and returns a fallback URL if needed
 */
export function handleCloudflareError(
  error: unknown,
  originalUrl: string,
): string {
  console.error("Cloudflare image transformation error:", error);

  // Return the original S3 URL as fallback
  const s3Url = `https://${env.AWS_BUCKET_NAME}.s3.${env.AWS_REGION}.amazonaws.com/${originalUrl}`;

  return s3Url;
}

/**
 * Gets the content type from a file name
 */
export function getContentType(fileName: string): string {
  const extension = path.extname(fileName).toLowerCase();
  const contentTypes: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
  };

  return contentTypes[extension] ?? "application/octet-stream";
}

/**
 * Creates a blur data URL for an image
 */
export async function getBlurDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.src = reader.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(
            createImageError(
              "Could not get canvas context",
              ImageErrorType.VALIDATION_ERROR,
            ),
          );
          return;
        }

        // Create a small 20x20 blur
        canvas.width = 20;
        canvas.height = 20;
        ctx.drawImage(img, 0, 0, 20, 20);

        resolve(canvas.toDataURL("image/jpeg", 0.5));
      };
      img.onerror = () =>
        reject(
          createImageError(
            "Failed to load image",
            ImageErrorType.VALIDATION_ERROR,
          ),
        );
    };
    reader.onerror = () =>
      reject(
        createImageError(
          "Failed to read file",
          ImageErrorType.VALIDATION_ERROR,
        ),
      );
    reader.readAsDataURL(file);
  });
}
