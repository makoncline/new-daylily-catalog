import { z } from "zod";
import { SLUG_INPUT_PATTERN } from "@/lib/utils/slugify";
import { nullableText, nullableSlug } from "./helpers";

export const editorJsSchema = z.object({
  time: z.number(),
  blocks: z.array(
    z.object({
      id: z.string(),
      type: z.string(),
      data: z.record(z.string(), z.any()),
    }),
  ),
  version: z.string(),
});

// Dedicated slug validation schema that can be reused
export const slugSchema = nullableSlug(
  SLUG_INPUT_PATTERN,
  5,
  "URL must be at least 5 characters",
  "Only letters, numbers, and hyphens are allowed",
);

export const profileFormSchema = z.object({
  title: nullableText(),
  slug: slugSchema,
  description: nullableText(),
  location: nullableText(),
  logoUrl: nullableText(),
});

export type ProfileFormData = z.infer<typeof profileFormSchema>;
export type EditorJsData = z.infer<typeof editorJsSchema>;
