import { unstable_cache } from "next/cache";
import { reportError } from "@/lib/error-utils";
import type { RouterOutputs } from "@/trpc/react";
import { type generateProfileMetadata } from "./metadata";
import { getOptimizedMetaImageUrl } from "@/lib/utils/cloudflareLoader";

// Use the router output types instead of custom interface
type PublicProfile = RouterOutputs["public"]["getProfile"];
type PublicListing = RouterOutputs["public"]["getListings"][number];
type Metadata = Awaited<ReturnType<typeof generateProfileMetadata>>;

// Function to generate JSON-LD for ProfilePage schema
async function createProfilePageJsonLd(
  profile: PublicProfile,
  listings: PublicListing[],
  metadata: Metadata,
) {
  try {
    // Filter to only include listings with both prices AND images (required for valid Product schema)
    const validListings = listings.filter(
      (listing) =>
        listing.price !== null && listing.images && listing.images.length > 0,
    );

    // The main entity (Person or Organization) that the profile is about
    const mainEntity = {
      "@type": "Organization",
      name: metadata.title,
      description: metadata.description,
      image: metadata.imageUrl,
      url: metadata.pageUrl,
      // Add makesOffer to show available products/listings - only include those with prices and images
      ...(validListings.length > 0 && {
        makesOffer: {
          "@type": "ItemList",
          numberOfItems: validListings.length,
          itemListElement: validListings.map((listing, index) => ({
            "@type": "ListItem",
            position: index + 1,
            item: {
              "@type": "Product",
              name: listing.title ?? "Daylily",
              // Canonical product URL: /{userId}/{listingId}
              url: `${metadata.pageUrl}/${listing.id}`,
              // Optimized, cacheable image URL for Google Images
              image: getOptimizedMetaImageUrl(listing.images[0]!.url),
              // Price will always exist due to our filter
              offers: {
                "@type": "Offer",
                price: listing.price!.toFixed(2),
                priceCurrency: "USD",
              },
            },
          })),
        },
      }),
      // Add user's lists as collections, also only using valid listings
      ...(profile.lists &&
        profile.lists.length > 0 && {
          hasOfferCatalog: profile.lists.map((list) => {
            // Get listings that have prices AND images and match this list's ID in their lists array
            const listListings = validListings.filter((listing) =>
              listing.lists.some((l) => l.id === list.id),
            );

            return {
              "@type": "Collection",
              name: list.title,
              description:
                list.description ?? `Collection of daylilies: ${list.title}`,
              url: `${metadata.pageUrl}/lists/${list.id}`,
              // Include collection items if we have valid listings for this list
              ...(listListings.length > 0 && {
                collectionSize: listListings.length,
                itemListElement: listListings.map((listing, index) => ({
                  "@type": "ListItem",
                  position: index + 1,
                  item: {
                    "@type": "Product",
                    name: listing.title ?? "Daylily",
                    url: `${metadata.pageUrl}/${listing.id}`,
                    image: getOptimizedMetaImageUrl(listing.images[0]!.url),
                    // Price will always exist due to our filter
                    offers: {
                      "@type": "Offer",
                      price: listing.price!.toFixed(2),
                      priceCurrency: "USD",
                    },
                  },
                })),
              }),
            };
          }),
        }),
      ...(profile.location && {
        location: {
          "@type": "Place",
          address: {
            "@type": "PostalAddress",
            addressLocality: profile.location,
          },
        },
      }),
    };

    // Create the ProfilePage schema
    const profileSchema: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "ProfilePage",
      name: `${metadata.title} | Daylily Catalog`,
      description: metadata.description,
      url: metadata.pageUrl,
      image: metadata.imageUrl,
      mainEntity: mainEntity,
    };

    // Add statistics if available and the property exists
    if (
      "listingCount" in profile &&
      typeof profile.listingCount === "number" &&
      profile.listingCount > 0
    ) {
      profileSchema.interactionStatistic = {
        "@type": "InteractionCounter",
        interactionType: "https://schema.org/ItemPage",
        userInteractionCount: profile.listingCount,
      };
    }

    return profileSchema;
  } catch (error) {
    reportError({
      error:
        error instanceof Error
          ? error
          : new Error("Unknown error in JSON-LD generation"),
      level: "error",
      context: {
        profile: { id: profile.id },
        function: "createProfilePageJsonLd",
      },
    });

    // Minimal valid ProfilePage JSON-LD as fallback
    return {
      "@context": "https://schema.org",
      "@type": "ProfilePage",
      name: metadata.title || "Daylily Catalog",
      description:
        metadata.description || "Browse our collection of beautiful daylilies.",
      url: metadata.pageUrl,
      mainEntity: {
        "@type": "Organization",
        name: metadata.title || "Daylily Catalog",
      },
    };
  }
}

// Cached function to generate JSON-LD
export function generateProfilePageJsonLd(
  profile: PublicProfile,
  listings: PublicListing[],
  metadata: Metadata,
) {
  return unstable_cache(
    async () => createProfilePageJsonLd(profile, listings, metadata),
    [`profile-jsonld-${profile.id}`],
    { revalidate: 3600 },
  )();
}
