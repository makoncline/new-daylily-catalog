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
          createdAt: true,
          profile: {
            select: {
              title: true,
              slug: true,
              description: true,
              location: true,
              updatedAt: true,
              images: {
                select: {
                  url: true,
                  updatedAt: true,
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
          lists: {
            select: {
              id: true,
              title: true,
              updatedAt: true,
              _count: {
                select: {
                  listings: true,
                },
              },
            },
            orderBy: {
              listings: {
                _count: "desc",
              },
            },
          },
          listings: {
            select: {
              updatedAt: true,
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
        (profile): PublicProfile => {
          // Get the most recent update timestamp across all content
          const timestamps = [
            profile.profile?.updatedAt,
            ...(profile.profile?.images?.map((img) => img.updatedAt) ?? []),
            ...(profile.listings?.map((l) => l.updatedAt) ?? []),
            ...(profile.lists?.map((l) => l.updatedAt) ?? []),
          ].filter((date): date is Date => date !== null && date !== undefined);

          const mostRecentUpdate =
            timestamps.length > 0
              ? new Date(Math.max(...timestamps.map((d) => d.getTime())))
              : profile.createdAt;

          return {
            id: profile.id,
            title: profile.profile?.title ?? null,
            slug: profile.profile?.slug ?? null,
            description: profile.profile?.description ?? null,
            location: profile.profile?.location ?? null,
            images: profile.profile?.images ?? [],
            listingCount: profile._count.listings,
            listCount: profile._count.lists,
            hasActiveSubscription: hasActiveSubscription(
              profile.subscriptionStatus,
            ),
            createdAt: profile.createdAt,
            updatedAt: mostRecentUpdate,
            lists: profile.lists.map((list) => ({
              id: list.id,
              title: list.title,
              listingCount: list._count.listings,
            })),
          };
        },
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
            createdAt: true,
            profile: {
              select: {
                title: true,
                slug: true,
                description: true,
                content: true,
                location: true,
                updatedAt: true,
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
            _count: {
              select: {
                listings: true,
              },
            },
            lists: {
              select: {
                id: true,
                title: true,
                description: true,
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

        // Parse content if it exists
        let parsedContent = null;
        if (user.profile?.content) {
          try {
            parsedContent = JSON.parse(user.profile.content);
          } catch (error) {
            console.error("Error parsing profile content:", error);
          }
        }

        return {
          id: user.id,
          title: user.profile?.title ?? null,
          slug: user.profile?.slug ?? null,
          description: user.profile?.description ?? null,
          content: parsedContent,
          location: user.profile?.location ?? null,
          images: user.profile?.images ?? [],
          createdAt: user.createdAt,
          updatedAt: user.profile?.updatedAt ?? user.createdAt,
          _count: {
            listings: user._count.listings,
          },
          lists: user.lists.map((list) => ({
            id: list.id,
            title: list.title,
            description: list.description ?? null,
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
    .query(async ({ ctx, input }) => {
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
            title: true,
            description: true,
            price: true,
            userId: true,
            lists: {
              select: {
                id: true,
                title: true,
              },
            },
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
