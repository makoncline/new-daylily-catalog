import type { E2EPrismaClient } from "../../../src/lib/test-utils/e2e-db";
import { normalizeCultivarName } from "../../../src/lib/utils/cultivar-utils";

interface SeedAhsListingInput {
  db: E2EPrismaClient;
  id?: string;
  name: string;
  hybridizer?: string;
  year?: string;
  color?: string;
  bloomSeason?: string;
}

export async function seedAhsListing({
  db,
  id,
  name,
  hybridizer,
  year,
  color,
  bloomSeason,
}: SeedAhsListingInput) {
  const ahsListing = await db.ahsListing.create({
    data: {
      id,
      name,
      hybridizer,
      year,
      color,
      bloomSeason,
    },
  });

  // Auto-create corresponding CultivarReference to keep dual-write in sync
  await db.cultivarReference.upsert({
    where: { ahsId: ahsListing.id },
    create: {
      id: `cr-ahs-${ahsListing.id}`,
      ahsId: ahsListing.id,
      normalizedName: normalizeCultivarName(name),
    },
    update: {
      normalizedName: normalizeCultivarName(name),
    },
  });

  return ahsListing;
}
