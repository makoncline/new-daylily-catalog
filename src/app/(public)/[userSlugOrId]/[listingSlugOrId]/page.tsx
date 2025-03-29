import { api } from "@/trpc/server";
import { MainContent } from "@/app/(public)/_components/main-content";
import { ListingDisplay } from "@/components/listing-display";
import { Suspense } from "react";
import { ListingDisplaySkeleton } from "@/components/listing-display";
import { PublicBreadcrumbs } from "@/app/(public)/_components/public-breadcrumbs";
import { getUserAndListingIdsAndSlugs } from "@/server/db/getUserAndListingIdsAndSlugs";
import { getBaseUrl } from "@/lib/utils/getBaseUrl";
import { getErrorCode, tryCatch } from "@/lib/utils";
import { FloatingCartButton } from "@/components/floating-cart-button";
import { notFound } from "next/navigation";
import { generateListingMetadata } from "./_seo/metadata";
import { ListingPageSEO } from "./_components/listing-seo";

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

export async function generateMetadata({ params }: PageProps) {
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
    return generateListingMetadata(null, url);
  }

  return generateListingMetadata(result.data, url);
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

  // Generate metadata
  const baseUrl = getBaseUrl();
  const metadata = await generateListingMetadata(listing, baseUrl);

  return (
    <>
      <ListingPageSEO listing={listing} metadata={metadata} baseUrl={baseUrl} />
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
    </>
  );
}
