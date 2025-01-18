import { z } from "zod";

export const profileFormSchema = z.object({
  intro: z.string().optional().nullable(),
  bio: z.string().optional().nullable(),
  userLocation: z.string().optional().nullable(),
  logoUrl: z.string().optional().nullable(),
});

export type ProfileFormData = z.infer<typeof profileFormSchema>;
