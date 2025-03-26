import { api } from "@/trpc/server";
import { MainContent } from "@/app/(public)/_components/main-content";
import { ListingDisplay } from "@/components/listing-display";
import { Suspense } from "react";
import { ListingDisplaySkeleton } from "@/components/listing-display";
import { PublicBreadcrumbs } from "@/app/(public)/_components/public-breadcrumbs";
import { type Metadata } from "next";
import { getUserAndListingIdsAndSlugs } from "@/server/db/getUserAndListingIdsAndSlugs";
import { IMAGES } from "@/lib/constants/images";
import { METADATA_CONFIG } from "@/config/constants";
import { getBaseUrl } from "@/lib/utils/getBaseUrl";
import { getOptimizedMetaImageUrl } from "@/lib/utils/cloudflareLoader";
import { formatAhsListingSummary, getErrorCode, tryCatch } from "@/lib/utils";
import { FloatingCartButton } from "@/components/floating-cart-button";
import { notFound } from "next/navigation";

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  // Fetch user and listing data
  const data = await getUserAndListingIdsAndSlugs();

  // Generate params for all userSlugOrId and their corresponding listingSlugOrId
  return data.flatMap((user) => {
    const userIdentifiers = [user.id];
    if (user.profile?.slug) userIdentifiers.push(user.profile.slug);

    // Map each user identifier to its listings
    return userIdentifiers.flatMap((userSlugOrId) =>
      user.listings.flatMap((listing) => {
        const listingIdentifiers = [listing.id];
        if (listing.slug) listingIdentifiers.push(listing.slug);

        // Return all combinations of userSlugOrId and listingSlugOrId
        return listingIdentifiers.map((listingSlugOrId) => ({
          userSlugOrId,
          listingSlugOrId,
        }));
      }),
    );
  });
}

interface PageProps {
  params: {
    userSlugOrId: string;
    listingSlugOrId: string;
  };
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { userSlugOrId, listingSlugOrId } = params;
  const url = getBaseUrl();

  // Fetch listing data
  const result = await tryCatch(
    api.public.getListing({
      userSlugOrId,
      listingSlugOrId,
    }),
  );

  if (!result.data) {
    return {
      title: "Listing Not Found",
      description: "The daylily listing you are looking for does not exist.",
      openGraph: {
        title: "Listing Not Found",
        description: "The daylily listing you are looking for does not exist.",
        siteName: METADATA_CONFIG.SITE_NAME,
        locale: METADATA_CONFIG.LOCALE,
      },
    };
  }

  const listing = result.data;
  const profileTitle = listing.user.profile?.title ?? METADATA_CONFIG.SITE_NAME;

  const rawImageUrl = listing.images?.[0]?.url ?? IMAGES.DEFAULT_LISTING;
  const imageUrl = getOptimizedMetaImageUrl(rawImageUrl);
  const listingName =
    listing.title ?? listing.ahsListing?.name ?? "Unnamed Daylily";
  const pageUrl = `${url}/${userSlugOrId}/${listing.slug ?? listing.id}`;

  // Construct metadata
  const title = `${listingName} Daylily | ${profileTitle}`;
  const description = Boolean(listing.description?.trim())
    ? listing.description!
    : `${listingName} daylily available from ${profileTitle}. ${formatAhsListingSummary(listing.ahsListing) ?? ""}`.trim();

  return {
    title,
    description,
    metadataBase: new URL(url),
    alternates: {
      canonical: `/${listing.userId}/${listing.id}`,
    },
    openGraph: {
      title,
      description,
      url: pageUrl,
      siteName: METADATA_CONFIG.SITE_NAME,
      locale: METADATA_CONFIG.LOCALE,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: "Daylily listing image",
        },
      ],
      type: "website",
    },
    twitter: {
      card: METADATA_CONFIG.TWITTER_CARD_TYPE,
      title,
      description,
      site: METADATA_CONFIG.TWITTER_HANDLE,
      images: [imageUrl],
    },
    other: {
      // Product JSON-LD for rich results
      "script:ld+json": JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Product",
        name: listingName,
        description,
        image: imageUrl,
        url: pageUrl,
        sku: listing.id,
        ...(listing.price && {
          offers: {
            "@type": "Offer",
            price: listing.price.toFixed(2),
            priceCurrency: "USD",
            availability: "https://schema.org/InStock",
            priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split("T")[0], // 30 days from now
            url: pageUrl,
            seller: {
              "@type": "Organization",
              name: profileTitle,
              url: `${url}/${listing.userId}`,
            },
            itemCondition: "https://schema.org/NewCondition",
          },
        }),
        ...(listing.ahsListing && {
          brand: {
            "@type": "Brand",
            name: listing.ahsListing.hybridizer ?? "Unknown Hybridizer",
          },
          additionalProperty: [
            {
              "@type": "PropertyValue",
              name: "Year",
              value: listing.ahsListing.year,
            },
            {
              "@type": "PropertyValue",
              name: "Bloom Size",
              value: listing.ahsListing.bloomSize,
            },
            {
              "@type": "PropertyValue",
              name: "Bloom Season",
              value: listing.ahsListing.bloomSeason,
            },
            {
              "@type": "PropertyValue",
              name: "Form",
              value: listing.ahsListing.form,
            },
            {
              "@type": "PropertyValue",
              name: "Flower Type",
              value: "Daylily",
            },
          ].filter((prop) => prop.value),
        }),
      }),
    },
  };
}

export default async function Page({ params }: PageProps) {
  const { userSlugOrId, listingSlugOrId } = params;

  // Use tryCatch to handle listing fetch
  const result = await tryCatch(
    api.public.getListing({
      userSlugOrId,
      listingSlugOrId,
    }),
  );

  // Check for errors
  if (getErrorCode(result.error) === "NOT_FOUND") {
    notFound();
  }

  // Rethrow other errors
  if (result.error) {
    throw result.error;
  }

  // Type safety - at this point we know we have data
  const listing = result.data;

  // This is just for type safety, result.data should never be null at this point
  if (!listing) {
    notFound();
  }

  return (
    <MainContent>
      <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
        <div className="space-y-6">
          <PublicBreadcrumbs />
        </div>
        <Suspense fallback={<ListingDisplaySkeleton />}>
          <ListingDisplay listing={listing} variant="page" />
        </Suspense>
      </div>

      <FloatingCartButton
        userId={listing.userId}
        userName={listing.user.profile?.title ?? undefined}
      />
    </MainContent>
  );
}
