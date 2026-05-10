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
