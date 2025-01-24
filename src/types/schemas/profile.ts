import { z } from "zod";
import { SLUG_INPUT_PATTERN } from "@/lib/utils/slugify";

export const editorJsSchema = z.object({
  time: z.number(),
  blocks: z.array(
    z.object({
      id: z.string(),
      type: z.string(),
      data: z.record(z.any()),
    }),
  ),
  version: z.string(),
});

// Dedicated slug validation schema that can be reused
export const slugSchema = z
  .string()
  .min(5, "URL must be at least 5 characters")
  .regex(SLUG_INPUT_PATTERN, "Only letters, numbers, and hyphens are allowed")
  .transform((val) => (val === "" ? null : val))
  .optional()
  .nullable();

export const profileFormSchema = z.object({
  title: z.string().optional().nullable(),
  slug: slugSchema,
  description: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  logoUrl: z.string().optional().nullable(),
});

export type ProfileFormData = z.infer<typeof profileFormSchema>;
export type EditorJsData = z.infer<typeof editorJsSchema>;
