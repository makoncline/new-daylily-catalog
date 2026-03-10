import type { E2EPrismaClient } from "../../../src/lib/test-utils/e2e-db";
import { createAuthedUser } from "../../../src/lib/test-utils/e2e-users";
import { addListingImage } from "./images";
import { createListing } from "./listings";

interface SeedListingImageManagerInput {
  db: E2EPrismaClient;
}

export interface ListingImageManagerSeedMeta {
  listingId: string;
  imageIds: string[];
  imageUrlTokens: string[];
}

export async function seedListingImageManagerData({
  db,
}: SeedListingImageManagerInput): Promise<ListingImageManagerSeedMeta> {
  const user = await createAuthedUser(db);

  const listing = await createListing({
    db,
    userId: user.id,
    title: "Image Manager Seed Listing",
    description: "Listing used to test image manager e2e behavior",
  });

  const imageUrlTokens = ["img-a", "img-b", "img-c"];
  const imageIds: string[] = [];

  for (const [index, token] of imageUrlTokens.entries()) {
    const image = await addListingImage({
      db,
      listingId: listing.id,
      imageUrl: `/assets/bouquet.png?token=${token}`,
      order: index,
    });

    imageIds.push(image.id);
  }

  return {
    listingId: listing.id,
    imageIds,
    imageUrlTokens,
  };
}
