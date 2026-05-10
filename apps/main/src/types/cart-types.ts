import { z } from "zod";

// Cart Item Schema
export const cartItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  price: z.number().nullable(),
  quantity: z.number().default(1),
  listingId: z.string(),
  userId: z.string(),
});

export type CartItem = z.infer<typeof cartItemSchema>;

// Custom schema that includes cart validation
export const contactFormWithCartSchema = z
  .object({
    email: z.string().email("Please enter a valid email address"),
    name: z.string().optional(),
    message: z.string(),
    userId: z.string(),
    hasItems: z.boolean().optional(),
  })
  .refine(
    (data) => {
      // Message is required only if there are no items
      if (!data.hasItems && (!data.message || data.message.trim() === "")) {
        return false;
      }
      return true;
    },
    {
      message: "Please include a message when not adding items to cart",
      path: ["message"],
    },
  );
export type ContactFormWithCartData = z.infer<typeof contactFormWithCartSchema>;
