ALTER TABLE "Listing" ADD COLUMN "importKey" TEXT;

CREATE UNIQUE INDEX "Listing_userId_importKey_key"
ON "Listing"("userId", "importKey");
