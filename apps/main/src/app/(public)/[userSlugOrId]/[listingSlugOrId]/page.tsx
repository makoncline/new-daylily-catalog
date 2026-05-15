import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { MainContent } from "@/app/(public)/_components/main-content";
import { PublicBreadcrumbs } from "@/app/(public)/_components/public-breadcrumbs";
import {
  buildNoIndexMetadata,
  buildPublicPageMetadata,
} from "@/app/(public)/_seo/public-seo";
import {
  PublicListingContactButton,
  PublicListingPageViewTracker,
} from "./_components/public-listing-page-actions";
import { ListingDisplay } from "@/components/listing-display";
import {
  createBreadcrumbListSchema,
  createUserProfileBreadcrumbs,
} from "@/lib/utils/breadcrumbs";
import { getOptimizedMetaImageUrl } from "@/lib/utils/cloudflareLoader";
import { IMAGES } from "@/lib/constants/images";
import { getCanonicalBaseUrl } from "@/lib/utils/getBaseUrl";
import { serializeJsonLd } from "@/lib/utils/json-ld";
import {
  formatAhsListingSummary,
  formatPrice,
  getErrorCode,
  tryCatch,
} from "@/lib/utils";
import {
  getListingIdFromSlugOrId,
  getUserIdFromSlugOrId,
} from "@/server/db/getPublicProfile";
import { getPublicListingDetail } from "@/server/db/public-listing-read-model";

export const revalidate = 900;
export const dynamic = "force-static";
export const dynamicParams = true;

interface PageProps {
  params: Promise<{
    userSlugOrId: string;
    listingSlugOrId: string;
  }>;
}

const loadPublicListingPageBySegments = cache(
  async (userSlugOrId: string, listingSlugOrId: string) => {
    const routeResult = await tryCatch(
      (async () => {
        const userId = await getUserIdFromSlugOrId(userSlugOrId);
        const listingId = await getListingIdFromSlugOrId(
          listingSlugOrId,
          userId,
        );

        return { listingId, userId };
      })(),
    );

    if (getErrorCode(routeResult.error) === "NOT_FOUND") {
      notFound();
    }

    if (!routeResult.data) {
      throw routeResult.error ?? new Error("Failed to resolve legacy listing");
    }

    const { listingId, userId } = routeResult.data;
    const listingResult = await tryCatch(getPublicListingDetail(listingId));

    if (getErrorCode(listingResult.error) === "NOT_FOUND") {
      notFound();
    }

    if (!listingResult.data) {
      throw listingResult.error ?? new Error("Failed to load public listing");
    }

    if (listingResult.data.userId !== userId) {
      notFound();
    }

    return listingResult.data;
  },
);

async function loadPublicListingPage(params: PageProps["params"]) {
  const { userSlugOrId, listingSlugOrId } = await params;
  return loadPublicListingPageBySegments(userSlugOrId, listingSlugOrId);
}

function truncateDescription(value: string, maxLength = 155) {
  const trimmed = value.trim().replace(/\s+/g, " ");

  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxLength - 3).trim()}...`;
}

function getListingDescription(
  listing: Awaited<ReturnType<typeof loadPublicListingPage>>,
) {
  const trimmedDescription = listing.description?.trim();
  const buyerDescription =
    trimmedDescription && trimmedDescription.length > 0
      ? trimmedDescription
      : formatAhsListingSummary(listing.ahsListing);
  const parts = [
    listing.price ? `${formatPrice(listing.price)}.` : null,
    buyerDescription,
    `From ${listing.sellerTitle ?? "a Daylily Catalog grower"}.`,
  ].filter(Boolean);

  return truncateDescription(parts.join(" "));
}

function getListingTitle(
  listing: Awaited<ReturnType<typeof loadPublicListingPage>>,
) {
  const parts = [
    listing.title,
    listing.price ? formatPrice(listing.price) : null,
  ].filter(Boolean);

  return `${parts.join(" - ")} | ${listing.sellerTitle ?? "Daylily Catalog"}`;
}

function getCanonicalListingPath(
  listing: Awaited<ReturnType<typeof loadPublicListingPage>>,
) {
  return `/${listing.userSlug}/${listing.slug || listing.id}`;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const listingResult = await tryCatch(loadPublicListingPage(params));

  if (!listingResult.data) {
    return buildNoIndexMetadata({
      title: "Listing Not Found",
      description: "The daylily listing you are looking for does not exist.",
    });
  }

  const listing = listingResult.data;
  const baseUrl = getCanonicalBaseUrl();
  const canonicalPath = getCanonicalListingPath(listing);
  const pageUrl = `${baseUrl}${canonicalPath}`;
  const description = getListingDescription(listing);
  const imageUrl = getOptimizedMetaImageUrl(
    listing.images[0]?.url ?? IMAGES.DEFAULT_LISTING,
  );
  const title = getListingTitle(listing);

  return buildPublicPageMetadata({
    canonicalPath,
    description,
    imageAlt: `${listing.title} daylily listing`,
    imageUrl,
    pageUrl,
    robots: listing.hasActiveSubscription
      ? "index, follow, max-image-preview:large"
      : "noindex, follow",
    title,
  });
}

function createListingJsonLd({
  baseUrl,
  canonicalPath,
  description,
  imageUrl,
  listing,
  listingUrl,
}: {
  baseUrl: string;
  canonicalPath: string;
  description: string;
  imageUrl: string;
  listing: Awaited<ReturnType<typeof loadPublicListingPage>>;
  listingUrl: string;
}) {
  const sellerName = listing.sellerTitle ?? "Daylily Catalog";
  const breadcrumbs = createBreadcrumbListSchema(baseUrl, [
    ...createUserProfileBreadcrumbs(
      baseUrl,
      sellerName,
      listing.userSlug,
      listing.userSlug,
    ),
    {
      name: listing.title,
      url: listingUrl,
      canonicalUrl: `${baseUrl}${canonicalPath}`,
    },
  ]);

  const productSchema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: listing.title,
    description,
    image: imageUrl,
    url: listingUrl,
    brand: {
      "@type": "Organization",
      name: sellerName,
    },
  };

  if (listing.ahsListing) {
    productSchema.additionalProperty = [
      { "@type": "PropertyValue", name: "Cultivar", value: listing.title },
      listing.ahsListing.hybridizer
        ? {
            "@type": "PropertyValue",
            name: "Hybridizer",
            value: listing.ahsListing.hybridizer,
          }
        : null,
      listing.ahsListing.year
        ? {
            "@type": "PropertyValue",
            name: "Year",
            value: listing.ahsListing.year,
          }
        : null,
      listing.ahsListing.ploidy
        ? {
            "@type": "PropertyValue",
            name: "Ploidy",
            value: listing.ahsListing.ploidy,
          }
        : null,
      listing.ahsListing.bloomSize
        ? {
            "@type": "PropertyValue",
            name: "Bloom size",
            value: listing.ahsListing.bloomSize,
          }
        : null,
    ].filter(Boolean);
  }

  if (listing.price) {
    productSchema.offers = {
      "@type": "Offer",
      price: listing.price.toFixed(2),
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: listingUrl,
      seller: {
        "@type": "Organization",
        name: sellerName,
      },
    };
  }

  return [productSchema, breadcrumbs];
}

export default async function PublicListingPage({ params }: PageProps) {
  const listing = await loadPublicListingPage(params);
  const canonicalPath = getCanonicalListingPath(listing);
  const baseUrl = getCanonicalBaseUrl();
  const listingUrl = `${baseUrl}${canonicalPath}`;
  const description = getListingDescription(listing);
  const imageUrl = getOptimizedMetaImageUrl(
    listing.images[0]?.url ?? IMAGES.DEFAULT_LISTING,
  );
  const jsonLd = createListingJsonLd({
    baseUrl,
    canonicalPath,
    description,
    imageUrl,
    listing,
    listingUrl,
  });

  return (
    <MainContent>
      {jsonLd.map((schema, index) => (
        <script
          key={`listing-json-ld-${listing.id}-${index}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(schema) }}
        />
      ))}

      <PublicListingPageViewTracker
        listingId={listing.id}
        sellerId={listing.userId}
      />
      <h1 className="sr-only">
        {listing.title} from {listing.sellerTitle ?? "Daylily Catalog"}
      </h1>

      <div className="mb-6">
        <PublicBreadcrumbs
          profile={{
            id: listing.userId,
            title: listing.sellerTitle,
            slug: listing.userSlug,
          }}
          listingTitle={listing.title}
        />
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
        <PublicListingContactButton
          listingId={listing.id}
          sellerId={listing.userId}
          sellerName={listing.sellerTitle ?? undefined}
        />
      </div>

      <div className="mx-auto max-w-lg rounded-lg border border-[#d8dfd2] bg-white p-4 shadow-sm md:p-6">
        <ListingDisplay listing={listing} />
      </div>
    </MainContent>
  );
}
