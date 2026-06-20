import type { PrismaClient } from "@prisma/client";
import { after } from "next/server";

export function scheduleImageAssetVariantProcessing(args: {
  db: PrismaClient;
  imageAssetId: string;
}) {
  console.info("[image-assets] variants scheduled", {
    imageAssetId: args.imageAssetId,
  });

  after(async () => {
    try {
      const { processPendingImageAssetVariants } = await import(
        "@/server/services/image-asset-variant-processor"
      );

      await processPendingImageAssetVariants({
        db: args.db,
        assetId: args.imageAssetId,
        limit: 1,
      });
    } catch (error) {
      console.error("[image-assets] variants async processing failed", {
        imageAssetId: args.imageAssetId,
        error,
      });
    }
  });
}
