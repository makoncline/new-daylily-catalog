import { z } from "zod";

export const transformNullToUndefined = <T>(value: T): T | undefined => {
  if (value === null) return undefined;
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [
        key,
        val === null ? undefined : val,
      ]),
    ) as T;
  }
  return value;
};

export const listingFormSchema = z.object({
  title: z.string().min(1, "Name is required").optional(),
  price: z.number().min(0).optional().nullable(),
  description: z.string().optional().nullable(),
  privateNote: z.string().optional().nullable(),
  ahsId: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
});

export type ListingFormData = z.infer<typeof listingFormSchema>;
