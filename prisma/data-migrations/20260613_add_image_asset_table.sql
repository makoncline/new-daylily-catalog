CREATE TABLE IF NOT EXISTS "ImageAsset" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "legacyImageId" TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  "kind" TEXT NOT NULL,
  "status" TEXT,
  "originalKey" TEXT,
  "originalUrl" TEXT,
  "generatedOriginalKey" TEXT,
  "displayKey" TEXT,
  "displayUrl" TEXT,
  "thumbKey" TEXT,
  "thumbUrl" TEXT,
  "blurKey" TEXT,
  "blurUrl" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userProfileId" TEXT,
  "listingId" TEXT,
  "cultivarReferenceId" TEXT,
  CONSTRAINT "ImageAsset_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "UserProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ImageAsset_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ImageAsset_cultivarReferenceId_fkey" FOREIGN KEY ("cultivarReferenceId") REFERENCES "CultivarReference" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "ImageAsset_legacyImageId_key" ON "ImageAsset"("legacyImageId");
CREATE INDEX IF NOT EXISTS "ImageAsset_userProfileId_idx" ON "ImageAsset"("userProfileId");
CREATE INDEX IF NOT EXISTS "ImageAsset_listingId_idx" ON "ImageAsset"("listingId");
CREATE INDEX IF NOT EXISTS "ImageAsset_cultivarReferenceId_idx" ON "ImageAsset"("cultivarReferenceId");
