import { z } from "zod";
import { type Image } from "@prisma/client";

export interface ImageVariants {
  original: string;
  thumbnail: string;
  blur: string;
}

export interface ImageUploadProps {
  type: ImageType;
  referenceId: string;
  onUploadComplete?: (result: ImageUploadResponse) => void;
  maxFiles?: number;
}

export interface ImageDisplayProps {
  imageKey: string;
  variant?: keyof ImageVariants;
  alt?: string;
  className?: string;
  priority?: boolean;
}

export interface ImageGridProps {
  images: Image[];
  onReorder: (images: Image[]) => void;
  type: ImageType;
}

// Utility interfaces
export interface GenerateImageKeyParams {
  userId: string;
  fileName: string;
  listingId?: string;
  userProfileId?: string;
}

export interface ImageUtils {
  generateImageKey: (type: ImageType, params: GenerateImageKeyParams) => string;
  getImageUrl: (key: string, variant?: keyof ImageVariants) => string;
  handleCloudflareError: (error: unknown, originalUrl: string) => string;
}

// API input/output interfaces
export interface PresignedUrlInput {
  type: ImageType;
  fileName: string;
  contentType: string;
  size: number;
  listingId?: string;
  userProfileId?: string;
}

export interface PresignedUrlResponse {
  presignedUrl: string;
  key: string;
  url: string;
}

export interface ReorderImagesInput {
  type: ImageType;
  images: { id: string; order: number }[];
}

export interface DeleteImageInput {
  type: ImageType;
  imageId: string;
}

export interface ImageUploadResponse {
  success: boolean;
  error?: string;
  url: string;
  key: string;
  image?: Image | null;
}

// Database operation interfaces
export interface CreateImageData {
  key: string;
  type: ImageType;
  listingId?: string;
  userProfileId?: string;
  order: number;
}

export interface DatabaseOperations {
  createImage: (data: CreateImageData) => Promise<Image>;
  updateImageOrder: (images: { id: string; order: number }[]) => Promise<void>;
  deleteImage: (id: string) => Promise<void>;
  getImages: (params: {
    listingId?: string;
    userProfileId?: string;
  }) => Promise<Image[]>;
}

// Error handling
export enum ImageErrorType {
  VALIDATION_ERROR = "VALIDATION_ERROR",
  UPLOAD_ERROR = "UPLOAD_ERROR",
  CLOUDFLARE_ERROR = "CLOUDFLARE_ERROR",
  DATABASE_ERROR = "DATABASE_ERROR",
  NOT_FOUND = "NOT_FOUND",
}

export interface ImageError {
  type: ImageErrorType;
  message: string;
  cause?: unknown;
}

// Zod schemas for validation
export const imageTypeSchema = z.enum(["listing", "profile"]);
export type ImageType = z.infer<typeof imageTypeSchema>;

export const presignedUrlSchema = z.object({
  type: imageTypeSchema,
  userId: z.string(),
  fileName: z.string(),
  contentType: z.string(),
  size: z.number().max(5 * 1024 * 1024), // 5MB
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
