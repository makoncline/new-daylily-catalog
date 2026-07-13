import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import {
  claimAnonymousOnboardingCheckout,
  claimCheckoutInputSchema,
  collectAnonymousOnboardingEmailLead,
  collectEmailInputSchema,
  createAnonymousOnboardingCheckout,
  checkoutInputSchema,
  checkoutStatusInputSchema,
  getAnonymousOnboardingCheckoutStatus,
} from "@/server/onboarding/anonymous-onboarding-service";
import {
  anonymousCultivarSearchInputSchema,
  searchAnonymousOnboardingCultivars,
} from "@/server/onboarding/anonymous-onboarding-cultivar-search";

export const onboardingRouter = createTRPCRouter({
  searchCultivars: publicProcedure
    .input(anonymousCultivarSearchInputSchema)
    .query(async ({ ctx, input }) =>
      searchAnonymousOnboardingCultivars(ctx.replicaDb ?? ctx.db, input.query),
    ),

  collectEmail: publicProcedure
    .input(collectEmailInputSchema)
    .mutation(async ({ input }) => {
      return collectAnonymousOnboardingEmailLead(input);
    }),

  createCheckout: publicProcedure
    .input(checkoutInputSchema)
    .mutation(async ({ ctx, input }) => {
      return createAnonymousOnboardingCheckout({
        db: ctx.db,
        headers: ctx.headers,
        input,
      });
    }),

  getCheckoutStatus: publicProcedure
    .input(checkoutStatusInputSchema)
    .query(async ({ ctx, input }) => {
      return getAnonymousOnboardingCheckoutStatus(ctx.db, input.sessionId);
    }),

  claimCheckout: protectedProcedure
    .input(claimCheckoutInputSchema)
    .mutation(async ({ ctx, input }) => {
      return claimAnonymousOnboardingCheckout({
        db: ctx.db,
        input,
        user: ctx.user,
      });
    }),
});
