import { z } from "zod";

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

export const profileFormSchema = z.object({
  intro: z.string().optional().nullable(),
  userLocation: z.string().optional().nullable(),
  logoUrl: z.string().optional().nullable(),
});

export type ProfileFormData = z.infer<typeof profileFormSchema>;
export type EditorJsData = z.infer<typeof editorJsSchema>;
