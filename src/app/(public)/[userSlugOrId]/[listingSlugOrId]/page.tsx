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

  // Fetch listing data
  const listing = await api.public.getListing({
    userSlugOrId,
    listingSlugOrId,
  });

  if (!listing) {
    return {
      title: "Listing Not Found",
      description: "The daylily listing you are looking for does not exist.",
    };
  }

  const profile = await api.public.getProfile({
    userSlugOrId,
  });

  // Get the first image URL if available
  const imageUrl = listing.images?.[0]?.url ?? "/images/default-daylily.jpg";
  const price = listing.price ? `$${listing.price.toFixed(2)}` : "Display only";
  const listingName =
    listing.title ?? listing.ahsListing?.name ?? "Unnamed Daylily";

  // Construct metadata
  const title = `${listingName} Daylily | ${profile?.title ?? "Daylily Catalog"}`;
  const description =
    listing.description ??
    `Beautiful ${listingName} daylily available from ${profile?.title ?? "Daylily Catalog"}. ${listing.ahsListing?.hybridizer ? `Hybridized by ${listing.ahsListing.hybridizer}` : ""}`.trim();

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [imageUrl],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
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
        ...(listing.price && {
          offers: {
            "@type": "Offer",
            price: price,
            priceCurrency: "USD",
            availability: "https://schema.org/InStock",
            seller: {
              "@type": "Organization",
              name: profile?.title ?? "Daylily Catalog",
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
      <div className="mx-auto w-full max-w-lg">
        <div className="mb-6">
          <PublicBreadcrumbs />
        </div>
        <Suspense fallback={<ListingDisplaySkeleton />}>
          <ListingDisplay listingId={listing.id} hideLink />
        </Suspense>
      </div>
    </MainContent>
  );
}
