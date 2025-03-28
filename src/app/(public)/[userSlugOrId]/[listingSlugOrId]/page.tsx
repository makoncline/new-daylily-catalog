import { api } from "@/trpc/server";
import { MainContent } from "@/app/(public)/_components/main-content";
import { ListingDisplay } from "@/components/listing-display";
import { Suspense } from "react";
import { ListingDisplaySkeleton } from "@/components/listing-display";
import { PublicBreadcrumbs } from "@/app/(public)/_components/public-breadcrumbs";
import { type Metadata } from "next";
import { getUserAndListingIdsAndSlugs } from "@/server/db/getUserAndListingIdsAndSlugs";
import { METADATA_CONFIG } from "@/config/constants";
import { getBaseUrl } from "@/lib/utils/getBaseUrl";
import { getErrorCode, tryCatch } from "@/lib/utils";
import { FloatingCartButton } from "@/components/floating-cart-button";
import { notFound } from "next/navigation";
import { generateListingMetadata } from "./_seo/metadata";
import { generateJsonLd } from "./_seo/json-ld";

export const revalidate = 3600;
export const dynamicParams = true;

interface PageProps {
  params: {
    userSlugOrId: string;
    listingSlugOrId: string;
  };
}

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

  // Await the metadata promise
  const metadata = await generateListingMetadata(result.data, url);

  return {
    title: metadata.title,
    description: metadata.description,
    metadataBase: new URL(url),
    alternates: {
      canonical: `/${result.data.userId}/${result.data.id}`,
    },
    openGraph: {
      title: metadata.title,
      description: metadata.description,
      url: metadata.pageUrl,
      siteName: METADATA_CONFIG.SITE_NAME,
      locale: METADATA_CONFIG.LOCALE,
      images: [
        {
          url: metadata.imageUrl,
          width: 1200,
          height: 630,
          alt: "Daylily listing image",
        },
      ],
      type: "website",
    },
    twitter: {
      card: METADATA_CONFIG.TWITTER_CARD_TYPE,
      title: metadata.title,
      description: metadata.description,
      site: METADATA_CONFIG.TWITTER_HANDLE,
      images: [metadata.imageUrl],
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

  // Generate metadata and JSON-LD - await the promises
  const metadata = await generateListingMetadata(listing, getBaseUrl());
  const jsonLd = await generateJsonLd(listing, metadata);

  return (
    <MainContent>
      {/* Add JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
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
