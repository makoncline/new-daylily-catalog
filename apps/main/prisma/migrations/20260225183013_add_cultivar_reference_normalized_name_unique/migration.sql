-- DropIndex
DROP INDEX "CultivarReference_normalizedName_idx";

-- CreateIndex
CREATE UNIQUE INDEX "CultivarReference_normalizedName_unique_idx" ON "CultivarReference"("normalizedName");

