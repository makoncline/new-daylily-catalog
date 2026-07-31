import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { MainContent } from "@/app/(public)/_components/main-content";
import {
  buildNoIndexMetadata,
  buildPublicPageMetadata,
} from "@/app/(public)/_seo/public-seo";
import {
  PublicListingContactButton,
  PublicListingPageViewTracker,
} from "./_components/public-listing-page-actions";
import { createListingJsonLd } from "./_seo/json-ld";
import { ListingDisplay } from "@/components/listing-display";
import { ServerBreadcrumbs } from "@/components/server-breadcrumbs";
import { getOptimizedMetaImageUrl } from "@/lib/utils/cloudflareLoader";
import { IMAGES } from "@/lib/constants/images";
import { getCanonicalBaseUrl } from "@/lib/utils/getBaseUrl";
import { getSocialCardImageUrl } from "@/lib/social-card";
import { getPublicListingPath } from "@/lib/public-catalog-url-state";
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

export const dynamic = "force-dynamic";
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

type PublicListingPageData = Awaited<ReturnType<typeof loadPublicListingPage>>;

function truncateDescription(value: string, maxLength = 155) {
  const trimmed = value.trim().replace(/\s+/g, " ");

  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  const candidate = trimmed.slice(0, maxLength - 3);
  const lastSpace = candidate.lastIndexOf(" ");
  const truncated = lastSpace > 0 ? candidate.slice(0, lastSpace) : candidate;

  return `${truncated.trim().replace(/[,;:]$/, "")}...`;
}

function getListingDescription(listing: PublicListingPageData) {
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
  let description = parts.join(" ").trim().replace(/\s+/g, " ");

  if (description.length < 110) {
    description +=
      " View photos and contact the grower for current availability and catalog details.";
  }

  return truncateDescription(description);
}

function getListingTitle(listing: PublicListingPageData) {
  const parts = [
    listing.title,
    listing.price ? formatPrice(listing.price) : null,
  ].filter(Boolean);

  return `${parts.join(" - ")} | ${listing.sellerTitle ?? "Daylily Catalog"}`;
}

function getCanonicalListingPath(listing: PublicListingPageData) {
  return getPublicListingPath({
    listingId: listing.id,
    listingSlug: listing.slug,
    sellerSlug: listing.userSlug,
  });
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
    socialImageUrl: getSocialCardImageUrl({
      baseUrl,
      kind: "listing",
      id: listing.id,
    }),
    robots: listing.hasActiveSubscription
      ? "index, follow, max-image-preview:large"
      : "noindex, follow",
    title,
  });
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

      <ServerBreadcrumbs
        className="mb-6"
        items={[
          { title: "Catalogs", href: "/catalogs" },
          {
            title: listing.sellerTitle ?? "Untitled Catalog",
            href: `/${listing.userSlug}`,
          },
          { title: listing.title },
        ]}
      />

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
