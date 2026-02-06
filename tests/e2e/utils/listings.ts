import type { E2EPrismaClient } from "../../../src/lib/test-utils/e2e-db";

interface CreateListingInput {
  db: E2EPrismaClient;
  userId: string;
  title: string;
  description?: string;
  price?: number;
  privateNote?: string;
}

/**
 * Simple slugify function for test use
 */
function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(/[^\w-]+/g, "") // Remove all non-word chars
    .replace(/--+/g, "-") // Replace multiple - with single -
    .replace(/^-+/, "") // Trim - from start of text
    .replace(/-+$/, ""); // Trim - from end of text
}

/**
 * Generates a unique slug for a listing
 */
async function generateUniqueSlug(
  title: string,
  userId: string,
  db: E2EPrismaClient,
): Promise<string> {
  const baseSlug = slugify(title);
  let counter = 0;
  let uniqueSlug = baseSlug;

  while (true) {
    // Check if slug exists for this user
    const existing = await db.listing.findFirst({
      where: {
        userId,
        slug: uniqueSlug,
      },
    });

    if (!existing) {
      return uniqueSlug;
    }

    // If slug exists, append counter and try again
    counter++;
    uniqueSlug = `${baseSlug}-${counter}`;
  }
}

export async function createListing({
  db,
  userId,
  title,
  description,
  price,
  privateNote,
}: CreateListingInput) {
  const slug = await generateUniqueSlug(title, userId, db);

  return db.listing.create({
    data: {
      title,
      slug,
      userId,
      description,
      price,
      privateNote,
    },
  });
}
