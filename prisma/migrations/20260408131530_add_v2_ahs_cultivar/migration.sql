-- CreateTable
CREATE TABLE "V2AhsCultivar" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "post_id" TEXT,
    "link_normalized_name" TEXT,
    "post_title" TEXT,
    "post_status" TEXT,
    "introduction_date" TEXT,
    "primary_hybridizer_id" TEXT,
    "primary_hybridizer_name" TEXT,
    "additional_hybridizers_ids" TEXT,
    "additional_hybridizers_names" TEXT,
    "hybridizer_code_legacy" TEXT,
    "seedling_number" TEXT,
    "bloom_season_ids" TEXT,
    "bloom_season_names" TEXT,
    "fragrance_ids" TEXT,
    "fragrance_names" TEXT,
    "bloom_habit_ids" TEXT,
    "bloom_habit_names" TEXT,
    "foliage_ids" TEXT,
    "foliage_names" TEXT,
    "ploidy_ids" TEXT,
    "ploidy_names" TEXT,
    "scape_height_in" REAL,
    "bloom_size_in" REAL,
    "bud_count" INTEGER,
    "branches" INTEGER,
    "color" TEXT,
    "rebloom" INTEGER,
    "flower_form_ids" TEXT,
    "flower_form_names" TEXT,
    "double_percentage" REAL,
    "polymerous_percentage" REAL,
    "spider_ratio" REAL,
    "petal_length_in" REAL,
    "petal_width_in" REAL,
    "unusual_forms_ids" TEXT,
    "unusual_forms_names" TEXT,
    "parentage" TEXT,
    "images_count" INTEGER,
    "last_updated" TEXT,
    "image_url" TEXT,
    "awards_json" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CultivarReference" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ahsId" TEXT,
    "v2AhsCultivarId" TEXT,
    "normalizedName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CultivarReference_ahsId_fkey" FOREIGN KEY ("ahsId") REFERENCES "AhsListing" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CultivarReference_v2AhsCultivarId_fkey" FOREIGN KEY ("v2AhsCultivarId") REFERENCES "V2AhsCultivar" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_CultivarReference" ("ahsId", "createdAt", "id", "normalizedName", "updatedAt") SELECT "ahsId", "createdAt", "id", "normalizedName", "updatedAt" FROM "CultivarReference";
DROP TABLE "CultivarReference";
ALTER TABLE "new_CultivarReference" RENAME TO "CultivarReference";
CREATE UNIQUE INDEX "CultivarReference_ahsId_key" ON "CultivarReference"("ahsId");
CREATE UNIQUE INDEX "CultivarReference_v2AhsCultivarId_key" ON "CultivarReference"("v2AhsCultivarId");
CREATE INDEX "CultivarReference_ahsId_idx" ON "CultivarReference"("ahsId");
CREATE INDEX "CultivarReference_v2AhsCultivarId_idx" ON "CultivarReference"("v2AhsCultivarId");
CREATE UNIQUE INDEX "CultivarReference_normalizedName_unique_idx" ON "CultivarReference"("normalizedName");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "V2AhsCultivar_post_id_idx" ON "V2AhsCultivar"("post_id");

-- CreateIndex
CREATE INDEX "V2AhsCultivar_link_normalized_name_idx" ON "V2AhsCultivar"("link_normalized_name");

-- CreateIndex
CREATE INDEX "V2AhsCultivar_post_title_idx" ON "V2AhsCultivar"("post_title");

-- CreateIndex
CREATE INDEX "V2AhsCultivar_primary_hybridizer_name_idx" ON "V2AhsCultivar"("primary_hybridizer_name");
