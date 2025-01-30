import { db } from "@/server/db";
import { hasActiveSubscription } from "../stripe/subscription-utils";
import { getStripeSubscription } from "../stripe/sync-subscription";
import { STATUS } from "@/config/constants";

export async function getPublicProfiles() {
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
            listings: {
              where: {
                OR: [{ status: null }, { NOT: { status: STATUS.HIDDEN } }],
              },
            },
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
                listings: {
                  where: {
                    OR: [{ status: null }, { NOT: { status: STATUS.HIDDEN } }],
                  },
                },
              },
            },
          },
          orderBy: { listings: { _count: "desc" } },
        },
        listings: {
          where: {
            OR: [{ status: null }, { NOT: { status: STATUS.HIDDEN } }],
          },
          select: { updatedAt: true },
        },
      },
      where: {
        listings: {
          some: { OR: [{ status: null }, { NOT: { status: STATUS.HIDDEN } }] },
        },
      },
    });

    // Get subscription status for each user
    const profilesWithSubs = await Promise.all(
      profiles.map(async (profile) => {
        const sub = await getStripeSubscription(profile.stripeCustomerId);
        return { ...profile, subscriptionStatus: sub.status };
      }),
    );

    // Transform and sort profiles
    return profilesWithSubs
      .map((profile) => {
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
          images:
            profile.profile?.images.map((img) => ({ url: img.url })) ?? [],
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
      })
      .sort((a, b) => {
        if (a.hasActiveSubscription !== b.hasActiveSubscription) {
          return a.hasActiveSubscription ? -1 : 1;
        }
        return b.listingCount - a.listingCount;
      });
  } catch (error) {
    console.error("Error fetching public profiles:", error);
    throw new Error("Failed to fetch public profiles"); // Standard error
  }
}
