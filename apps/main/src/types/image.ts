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

export const presignedUrlSchema = z.object({
  type: imageTypeSchema,
  userId: z.string(),
  fileName: z.string(),
  contentType: imageContentTypeSchema,
  size: z
    .number()
    .int()
    .positive()
    .max(5 * 1024 * 1024), // 5MB
  listingId: z.string().optional(),
  userProfileId: z.string().optional(),
});

export const reorderImagesSchema = z.object({
  type: imageTypeSchema,
  images: z.array(
    z.object({
      id: z.string(),
      order: z.number().int().min(0),
    }),
  ),
});

export const deleteImageSchema = z.object({
  type: imageTypeSchema,
  imageId: z.string(),
});
