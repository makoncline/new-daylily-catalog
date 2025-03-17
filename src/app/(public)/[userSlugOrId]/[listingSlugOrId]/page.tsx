import { api } from "@/trpc/server";
import { MainContent } from "@/app/(public)/_components/main-content";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Flower2 } from "lucide-react";
import Link from "next/link";
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
import { formatAhsListingSummary } from "@/lib/utils";

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
  const listing = await api.public.getListing({
    userSlugOrId,
    listingSlugOrId,
  });

  if (!listing) {
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

  const profile = await api.public.getProfile({
    userSlugOrId,
  });

  const rawImageUrl = listing.images?.[0]?.url ?? IMAGES.DEFAULT_LISTING;
  const imageUrl = getOptimizedMetaImageUrl(rawImageUrl);
  const price = listing.price ? `$${listing.price.toFixed(2)}` : "Display only";
  const listingName =
    listing.title ?? listing.ahsListing?.name ?? "Unnamed Daylily";
  const pageUrl = `${url}/${userSlugOrId}/${listing.slug ?? listing.id}`;

  // Construct metadata
  const title = `${listingName} Daylily | ${profile?.title ?? METADATA_CONFIG.SITE_NAME}`;
  const description = Boolean(listing.description?.trim())
    ? listing.description!
    : `${listingName} daylily available from ${profile?.title ?? METADATA_CONFIG.SITE_NAME}. ${formatAhsListingSummary(listing.ahsListing) ?? ""}`.trim();

  return {
    title,
    description,
    metadataBase: new URL(url),
    alternates: {
      canonical: `/${profile?.id}/${listing.id}`,
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
        ...(listing.price && {
          offers: {
            "@type": "Offer",
            price: price,
            priceCurrency: "USD",
            availability: "https://schema.org/InStock",
            seller: {
              "@type": "Organization",
              name: profile?.title ?? METADATA_CONFIG.SITE_NAME,
            },
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
          ].filter((prop) => prop.value),
        }),
      }),
    },
  };
}

export default async function Page({ params }: PageProps) {
  const { userSlugOrId, listingSlugOrId } = params;

  // First check if the user exists
  const profile = await api.public.getProfile({
    userSlugOrId,
  });

  if (!profile) {
    return (
      <MainContent>
        <EmptyState
          icon={<Flower2 className="h-12 w-12 text-muted-foreground" />}
          title="Catalog Not Found"
          description="The catalog you are looking for does not exist."
          action={
            <Button asChild>
              <Link href="/catalogs">Browse Catalogs</Link>
            </Button>
          }
        />
      </MainContent>
    );
  }

  // Then check if the listing exists
  const listing = await api.public.getListing({
    userSlugOrId,
    listingSlugOrId,
  });

  if (!listing) {
    return (
      <MainContent>
        <EmptyState
          icon={<Flower2 className="h-12 w-12 text-muted-foreground" />}
          title="Listing Not Found"
          description="The listing you are looking for does not exist or it was renamed."
          action={
            <Button asChild>
              <Link href={`/${userSlugOrId}`}>View Catalog</Link>
            </Button>
          }
        />
      </MainContent>
    );
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
    </MainContent>
  );
}
