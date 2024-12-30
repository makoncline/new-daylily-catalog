"use server";

import { createCaller } from "@/server/api/root";
import { createTRPCContext } from "@/server/api/trpc";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { headers } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { listingSchema } from "@/types/schemas/listing";

export type ListingFormData = z.infer<typeof listingSchema>;

export async function updateListing(id: string, formData: FormData) {
  try {
    const data = {
      name: formData.get("name") as string,
      price: formData.get("price") ? Number(formData.get("price")) : null,
      publicNote: (formData.get("publicNote") as string) || null,
      privateNote: (formData.get("privateNote") as string) || null,
      ahsId: (formData.get("ahsId") as string) || null,
      listId: (formData.get("listId") as string) || null,
    };

    const validatedData = listingSchema.parse(data);
    const caller = createCaller(
      await createTRPCContext({
        headers: headers(),
        auth: auth(),
      }),
    );
    await caller.listing.update({ id, data: validatedData });
    revalidatePath("/listings");
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message };
    }
    return { error: "Failed to update listing" };
  }
}

export async function deleteListing(id: string) {
  try {
    const caller = createCaller(
      await createTRPCContext({
        headers: headers(),
        auth: auth(),
      }),
    );
    await caller.listing.delete({ id });
    revalidatePath("/listings");
    return { success: true };
  } catch (error) {
    return { error: "Failed to delete listing" };
  }
}
