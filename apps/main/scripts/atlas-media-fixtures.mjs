import { DatabaseSync } from "node:sqlite";
import { createDisposableRealisticDataSnapshot } from "./realistic-data-snapshot.mjs";

export const ATLAS_MEDIA_FLOW_IDS = ["listing-media", "profile-management"];
export const ATLAS_MEDIA_POPULATED_TITLE = "Atlas Media Populated";
export const ATLAS_MEDIA_EMPTY_TITLE = "Atlas Media Empty";
export const ATLAS_MEDIA_IMAGE_URLS = [
  "/assets/catalog-blooms.webp",
  "/assets/hero-garden.webp",
  "/assets/aerial-garden.webp",
  "/assets/cta-garden.webp",
  "/assets/cultivar-grid.webp",
  "/assets/home-redesign/grower-garden.webp",
  "/assets/home-redesign/open-garden-path.webp",
  "/assets/home-redesign/closing-garden.webp",
  "/assets/home-redesign/collection-planning.webp",
];

/** @param {{ sourcePath: string; flowIds: string[] }} options */
export async function createAtlasMediaSnapshot({ sourcePath, flowIds }) {
  const snapshot = await createDisposableRealisticDataSnapshot({ sourcePath });
  const database = new DatabaseSync(snapshot.databasePath);
  try {
    database.exec("PRAGMA foreign_keys = ON; BEGIN IMMEDIATE;");
    const profile = database
      .prepare(
        "SELECT id, userId FROM UserProfile WHERE slug = 'rollingoaksdaylilies'",
      )
      .get();
    if (typeof profile?.id !== "string" || typeof profile.userId !== "string")
      throw new Error("The realistic Rolling Oaks Atlas profile is missing.");

    const now = Date.now();
    const insertImage = database.prepare(`
      INSERT INTO Image (id, url, "order", listingId, userProfileId, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    if (flowIds.includes("listing-media")) {
      const insertListing = database.prepare(`
        INSERT INTO Listing (id, userId, title, slug, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      insertListing.run(
        "atlas-media-populated",
        profile.userId,
        ATLAS_MEDIA_POPULATED_TITLE,
        "atlas-media-populated",
        now,
        now,
      );
      insertListing.run(
        "atlas-media-empty",
        profile.userId,
        ATLAS_MEDIA_EMPTY_TITLE,
        "atlas-media-empty",
        now,
        now,
      );
      for (const [order, url] of ATLAS_MEDIA_IMAGE_URLS.entries())
        insertImage.run(
          `atlas-media-listing-${order}`,
          url,
          order,
          "atlas-media-populated",
          null,
          now,
          now,
        );
    }
    if (flowIds.includes("profile-management")) {
      database
        .prepare("DELETE FROM ImageAsset WHERE userProfileId = ?")
        .run(profile.id);
      database
        .prepare("DELETE FROM Image WHERE userProfileId = ?")
        .run(profile.id);
      for (const [order, url] of ATLAS_MEDIA_IMAGE_URLS.slice(0, 5).entries())
        insertImage.run(
          `atlas-media-profile-${order}`,
          url,
          order,
          null,
          profile.id,
          now,
          now,
        );
    }
    database.exec("COMMIT;");
  } catch (error) {
    database.close();
    snapshot.cleanup();
    throw error;
  }
  database.close();
  return snapshot;
}
