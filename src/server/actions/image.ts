"use server";

import { db } from "@/server/db";
import { revalidatePath } from "next/cache";

export async function deleteImage(imageId: string) {
  const image = await db.image.delete({
    where: { id: imageId },
  });

  revalidatePath("/listings");
  return image;
}
