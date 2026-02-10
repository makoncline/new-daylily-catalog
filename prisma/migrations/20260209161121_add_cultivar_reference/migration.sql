-- CreateTable
CREATE TABLE "CultivarReference" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ahsId" TEXT,
    "normalizedName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CultivarReference_ahsId_fkey" FOREIGN KEY ("ahsId") REFERENCES "AhsListing" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Listing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "price" REAL,
    "description" TEXT,
    "privateNote" TEXT,
    "ahsId" TEXT,
    "cultivarReferenceId" TEXT,
    "status" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Listing_ahsId_fkey" FOREIGN KEY ("ahsId") REFERENCES "AhsListing" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Listing_cultivarReferenceId_fkey" FOREIGN KEY ("cultivarReferenceId") REFERENCES "CultivarReference" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Listing_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Listing" ("ahsId", "createdAt", "description", "id", "price", "privateNote", "slug", "status", "title", "updatedAt", "userId") SELECT "ahsId", "createdAt", "description", "id", "price", "privateNote", "slug", "status", "title", "updatedAt", "userId" FROM "Listing";
DROP TABLE "Listing";
ALTER TABLE "new_Listing" RENAME TO "Listing";
CREATE INDEX "Listing_ahsId_idx" ON "Listing"("ahsId");
CREATE INDEX "Listing_cultivarReferenceId_idx" ON "Listing"("cultivarReferenceId");
CREATE INDEX "Listing_userId_idx" ON "Listing"("userId");
CREATE INDEX "Listing_slug_idx" ON "Listing"("slug");
CREATE UNIQUE INDEX "Listing_userId_slug_key" ON "Listing"("userId", "slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "CultivarReference_ahsId_key" ON "CultivarReference"("ahsId");

-- CreateIndex
CREATE INDEX "CultivarReference_ahsId_idx" ON "CultivarReference"("ahsId");

-- CreateIndex
CREATE INDEX "CultivarReference_normalizedName_idx" ON "CultivarReference"("normalizedName");
