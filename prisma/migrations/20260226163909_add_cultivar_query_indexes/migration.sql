-- CreateIndex
CREATE INDEX IF NOT EXISTS "AhsListing_hybridizer_idx" ON "AhsListing"("hybridizer");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Listing_public_cultivarReferenceId_updatedAt_idx"
ON "Listing"("cultivarReferenceId", "updatedAt" DESC)
WHERE "cultivarReferenceId" IS NOT NULL
  AND ("status" IS NULL OR "status" <> 'HIDDEN');
