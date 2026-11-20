import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import {
  catalogImporterCheckoutInputSchema,
  claimCatalogImporterCheckout,
  claimCatalogImporterCheckoutInputSchema,
  createCatalogImporterCheckout,
  createSignedInCatalogImporterCheckout,
  signedInCatalogImporterCheckoutInputSchema,
} from "@/server/catalog-importer/checkout-service";

import { getMembershipCheckoutPrice } from "@/server/stripe/membership-checkout-price";

export const catalogImporterRouter = createTRPCRouter({
  membershipOffer: publicProcedure.query(async () => {
    const { amount, currency } = await getMembershipCheckoutPrice();
    return {
      monthlyPrice: new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
      }).format(amount / 100),
    };
  }),
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
    .input(signedInCatalogImporterCheckoutInputSchema)
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
