import { z } from "zod";

export const listFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  intro: z.string().optional(),
});

export type ListFormData = z.infer<typeof listFormSchema>;

export const listUpdateSchema = z.object({
  id: z.string().min(1),
  data: listFormSchema,
});

export type ListUpdateInput = z.infer<typeof listUpdateSchema>;
