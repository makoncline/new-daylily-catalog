import { db } from "@/server/db";
import { slugify } from "./slugify";

export async function generateUniqueSlug(
  title: string,
  userId: string,
  currentId?: string,
): Promise<string> {
  const slug = slugify(title);
  let counter = 0;
  let uniqueSlug = slug;

  while (true) {
    // Check if slug exists for this user
    const existing = await db.listing.findFirst({
      where: {
        userId,
        slug: uniqueSlug,
        // Exclude current listing when updating
        ...(currentId ? { NOT: { id: currentId } } : {}),
      },
    });

    if (!existing) {
      return uniqueSlug;
    }

    // If slug exists, append counter and try again
    counter++;
    uniqueSlug = `${slug}-${counter}`;
  }
}
