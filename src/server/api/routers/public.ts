import { z } from "zod";
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

  getProfile: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      try {
        const user = await db.user.findUnique({
          where: { id: input.userId },
          select: {
            id: true,
            stripeCustomerId: true,
            profile: {
              select: {
                intro: true,
                bio: true,
                userLocation: true,
                images: {
                  orderBy: {
                    order: "asc",
                  },
                  select: {
                    id: true,
                    url: true,
                  },
                },
              },
            },
            lists: {
              select: {
                id: true,
                name: true,
                intro: true,
                _count: {
                  select: {
                    listings: true,
                  },
                },
              },
            },
          },
        });

        if (!user) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found",
          });
        }

        const sub = await getStripeSubscription(user.stripeCustomerId);

        return {
          id: user.id,
          name: null, // We don't have names in the schema yet
          intro: user.profile?.intro ?? null,
          bio: user.profile?.bio ?? null,
          location: user.profile?.userLocation ?? null,
          images: user.profile?.images ?? [],
          lists: user.lists.map((list) => ({
            id: list.id,
            name: list.name,
            description: list.intro ?? null,
            listingCount: list._count.listings,
          })),
          hasActiveSubscription: hasActiveSubscription(sub.status),
        };
      } catch (error) {
        console.error("Error fetching public profile:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch public profile",
        });
      }
    }),

  getListings: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        listId: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      try {
        const listings = await db.listing.findMany({
          where: {
            userId: input.userId,
            ...(input.listId
              ? {
                  lists: {
                    some: {
                      id: input.listId,
                    },
                  },
                }
              : {}),
          },
          select: {
            id: true,
            name: true,
            publicNote: true,
            price: true,
            userId: true,
            ahsListing: {
              select: {
                ahsImageUrl: true,
              },
            },
            images: {
              select: {
                id: true,
                url: true,
              },
              orderBy: {
                order: "asc",
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        });

        // Transform the listings to include AHS image if available
        return listings.map((listing) => ({
          ...listing,
          images: [
            ...listing.images,
            ...(listing.ahsListing?.ahsImageUrl
              ? [
                  {
                    id: `ahs-${listing.id}`,
                    url: listing.ahsListing.ahsImageUrl,
                  },
                ]
              : []),
          ],
          ahsListing: undefined, // Remove the ahsListing from the response
        }));
      } catch (error) {
        console.error("Error fetching public listings:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch public listings",
        });
      }
    }),
});
