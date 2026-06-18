-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ImageAsset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "legacyImageId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "kind" TEXT NOT NULL,
    "status" TEXT,
    "originalKey" TEXT,
    "originalUrl" TEXT,
    "displayKey" TEXT,
    "displayUrl" TEXT,
    "thumbKey" TEXT,
    "thumbUrl" TEXT,
    "blurKey" TEXT,
    "blurUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userProfileId" TEXT,
    "listingId" TEXT,
    "cultivarReferenceId" TEXT,
    CHECK (
      ("kind" = 'listing' AND "listingId" IS NOT NULL AND "userProfileId" IS NULL AND "cultivarReferenceId" IS NULL)
      OR
      ("kind" = 'profile' AND "userProfileId" IS NOT NULL AND "listingId" IS NULL AND "cultivarReferenceId" IS NULL)
      OR
      ("kind" = 'cultivar' AND "cultivarReferenceId" IS NOT NULL AND "listingId" IS NULL AND "userProfileId" IS NULL)
    ),
    CONSTRAINT "ImageAsset_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "UserProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ImageAsset_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ImageAsset_cultivarReferenceId_fkey" FOREIGN KEY ("cultivarReferenceId") REFERENCES "CultivarReference" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ImageAsset" ("blurKey", "blurUrl", "createdAt", "displayKey", "displayUrl", "id", "kind", "legacyImageId", "listingId", "order", "originalKey", "originalUrl", "status", "thumbKey", "thumbUrl", "updatedAt", "userProfileId") SELECT "blurKey", "blurUrl", "createdAt", "displayKey", "displayUrl", "id", "kind", "legacyImageId", "listingId", "order", "originalKey", "originalUrl", "status", "thumbKey", "thumbUrl", "updatedAt", "userProfileId" FROM "ImageAsset";
DROP TABLE "ImageAsset";
ALTER TABLE "new_ImageAsset" RENAME TO "ImageAsset";
CREATE UNIQUE INDEX "ImageAsset_legacyImageId_key" ON "ImageAsset"("legacyImageId");
CREATE INDEX "ImageAsset_userProfileId_idx" ON "ImageAsset"("userProfileId");
CREATE INDEX "ImageAsset_listingId_idx" ON "ImageAsset"("listingId");
CREATE INDEX "ImageAsset_cultivarReferenceId_idx" ON "ImageAsset"("cultivarReferenceId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
