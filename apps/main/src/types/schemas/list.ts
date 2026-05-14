import { z } from "zod";

export const listFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
});

export type ListFormData = z.infer<typeof listFormSchema>;
