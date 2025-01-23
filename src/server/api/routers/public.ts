import { createTRPCRouter, publicProcedure } from "../trpc";
import { db } from "@/server/db";
import { TRPCError } from "@trpc/server";
import type { PublicProfile } from "@/types/public-types";
import { getStripeSubscription } from "@/server/stripe/sync-subscription";
import { hasActiveSubscription } from "@/server/stripe/subscription-utils";

export const publicRouter = createTRPCRouter({
  getPublicProfiles: publicProcedure.query(async () => {
    try {
      const profiles = await db.user.findMany({
        select: {
          id: true,
          stripeCustomerId: true,
          profile: {
            select: {
              intro: true,
              userLocation: true,
              images: {
                take: 1,
                select: {
                  url: true,
                },
                orderBy: {
                  order: "asc",
                },
              },
            },
          },
          _count: {
            select: {
              listings: true,
              lists: true,
            },
          },
        },
        where: {
          // Only include users with at least one listing
          listings: {
            some: {},
          },
        },
      });

      // Get subscription status for each user
      const profilesWithSubs = await Promise.all(
        profiles.map(async (profile) => {
          const sub = await getStripeSubscription(profile.stripeCustomerId);
          return {
            ...profile,
            subscriptionStatus: sub.status,
          };
        }),
      );

      // Transform and sort the profiles
      const transformedProfiles = profilesWithSubs.map(
        (profile): PublicProfile => ({
          id: profile.id,
          name: null, // We don't have names in the schema yet
          intro: profile.profile?.intro ?? null,
          location: profile.profile?.userLocation ?? null,
          images: profile.profile?.images ?? [],
          listingCount: profile._count.listings,
          listCount: profile._count.lists,
          hasActiveSubscription: hasActiveSubscription(
            profile.subscriptionStatus,
          ),
        }),
      );

      // Sort profiles: active subscriptions first, then by listing count
      return transformedProfiles.sort((a, b) => {
        if (a.hasActiveSubscription !== b.hasActiveSubscription) {
          return a.hasActiveSubscription ? -1 : 1;
        }
        return b.listingCount - a.listingCount;
      });
    } catch (error) {
      console.error("Error fetching public profiles:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch public profiles",
      });
    }
  }),
});
