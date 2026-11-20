import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import {
  claimCatalogImporterCheckout,
  claimCatalogImporterCheckoutInputSchema,
} from "@/server/catalog-importer/checkout-service";

export const catalogImporterRouter = createTRPCRouter({
  claimCheckout: protectedProcedure
    .input(claimCatalogImporterCheckoutInputSchema)
    .mutation(async ({ ctx, input }) => {
      return claimCatalogImporterCheckout({
        db: ctx.db,
        input,
        user: ctx.user,
      });
    }),
});
