import { z } from "zod";
import { type Image } from "@prisma/client";

export interface ImageUploadResponse {
  success: boolean;
  error?: string;
  url: string;
  key: string;
  image: Image;
}

// Zod schemas for validation
export const imageTypeSchema = z.enum(["listing", "profile"]);
export type ImageType = z.infer<typeof imageTypeSchema>;
export const imageContentTypeSchema = z.enum([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
export type ImageContentType = z.infer<typeof imageContentTypeSchema>;

export function getSupportedImageContentType(
  contentType: string | undefined,
): ImageContentType | undefined {
  if (!contentType) {
    return "image/jpeg";
  }

  const parsed = imageContentTypeSchema.safeParse(contentType);
  return parsed.success ? parsed.data : undefined;
}
