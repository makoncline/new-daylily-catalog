-- CreateTable
CREATE TABLE "ImageAsset" (
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
    CONSTRAINT "ImageAsset_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "UserProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ImageAsset_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ImageAsset_legacyImageId_key" ON "ImageAsset"("legacyImageId");

-- CreateIndex
CREATE INDEX "ImageAsset_userProfileId_idx" ON "ImageAsset"("userProfileId");

-- CreateIndex
CREATE INDEX "ImageAsset_listingId_idx" ON "ImageAsset"("listingId");

