import type { E2EPrismaClient } from "../../../src/lib/test-utils/e2e-db";

/**
 * Populates CultivarReference records for all AhsListings that don't have one
 * and backfills cultivarReferenceId for all Listings with ahsId
 */
export async function populateCultivarReferences(db: E2EPrismaClient) {
  // Step 1: Create CultivarReference records for all AhsListings that don't have one
  const ahsListings = await db.ahsListing.findMany();

  for (const ahsListing of ahsListings) {
    // Check if a CultivarReference already exists for this ahsId
    const existingRef = await db.cultivarReference.findUnique({
      where: {
        ahsId: ahsListing.id,
      },
    });

    if (!existingRef) {
      await db.cultivarReference.create({
        data: {
          id: `cr-ahs-${ahsListing.id}`,
          ahsId: ahsListing.id,
          normalizedName:
            ahsListing.name && ahsListing.name.trim()
              ? ahsListing.name.trim().toLowerCase()
              : null,
        },
      });
    } else {
      // Update normalizedName if it's different
      const normalizedName =
        ahsListing.name && ahsListing.name.trim()
          ? ahsListing.name.trim().toLowerCase()
          : null;
      if (existingRef.normalizedName !== normalizedName) {
        await db.cultivarReference.update({
          where: { id: existingRef.id },
          data: { normalizedName },
        });
      }
    }
  }

  // Step 2: Backfill cultivarReferenceId for all Listings with ahsId
  const listingsWithAhsId = await db.listing.findMany({
    where: {
      ahsId: { not: null },
    },
  });

  for (const listing of listingsWithAhsId) {
    if (!listing.ahsId) continue;

    // Find the CultivarReference for this ahsId
    const cultivarRef = await db.cultivarReference.findUnique({
      where: {
        ahsId: listing.ahsId,
      },
    });

    if (cultivarRef) {
      // Get the current listing to check cultivarReferenceId
      const currentListing = await db.listing.findUnique({
        where: { id: listing.id },
        select: { cultivarReferenceId: true },
      });

      // Update if cultivarReferenceId is missing or incorrect
      if (currentListing?.cultivarReferenceId !== cultivarRef.id) {
        await db.listing.update({
          where: { id: listing.id },
          data: {
            cultivarReferenceId: cultivarRef.id,
          },
        });
      }
    }
  }
}
