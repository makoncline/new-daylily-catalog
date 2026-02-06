import type { E2EPrismaClient } from "../../../src/lib/test-utils/e2e-db";

interface SeedAhsListingInput {
  db: E2EPrismaClient;
  name: string;
  hybridizer?: string;
  year?: string;
}

export async function seedAhsListing({
  db,
  name,
  hybridizer,
  year,
}: SeedAhsListingInput) {
  return db.ahsListing.create({
    data: {
      name,
      hybridizer,
      year,
    },
  });
}
