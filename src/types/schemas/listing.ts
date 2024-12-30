import { z } from "zod";

export const listingSchema = z.object({
  name: z.string().min(1, "Name is required"),
  price: z.number().min(0).optional().nullable(),
  publicNote: z.string().optional().nullable(),
  privateNote: z.string().optional().nullable(),
  listId: z.string().optional().nullable(),
  ahsId: z.string().optional().nullable(),
});

export type ListingFormData = z.infer<typeof listingSchema>;
