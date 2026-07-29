import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import { catalogImporterCheckoutSourceSchema } from "@/lib/catalog-importer-membership";
import {
  catalogImporterCheckoutInputSchema,
  claimCatalogImporterCheckout,
  claimCatalogImporterCheckoutInputSchema,
  createCatalogImporterCheckout,
  createSignedInCatalogImporterCheckout,
} from "@/server/catalog-importer/checkout-service";

export const catalogImporterRouter = createTRPCRouter({
  createCheckout: publicProcedure
    .input(catalogImporterCheckoutInputSchema)
    .mutation(async ({ ctx, input }) => {
      return createCatalogImporterCheckout({
        db: ctx.db,
        headers: ctx.headers,
        input,
      });
    }),

  createSignedInCheckout: protectedProcedure
    .input(catalogImporterCheckoutSourceSchema)
    .mutation(async ({ ctx, input }) => {
      return createSignedInCatalogImporterCheckout({
        db: ctx.db,
        input,
        user: ctx.user,
      });
    }),

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
