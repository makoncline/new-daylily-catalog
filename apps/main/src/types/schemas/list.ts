import { z } from "zod";

export const listFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
});

export type ListFormData = z.infer<typeof listFormSchema>;

export const listUpdateSchema = z.object({
  id: z.string().min(1),
  data: listFormSchema,
});

export type ListUpdateInput = z.infer<typeof listUpdateSchema>;
