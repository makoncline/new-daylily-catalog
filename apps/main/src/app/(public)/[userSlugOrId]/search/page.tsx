import { type Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { MainContent } from "@/app/(public)/_components/main-content";
import {
  buildNoIndexMetadata,
  buildPublicPageMetadata,
} from "@/app/(public)/_seo/public-seo";
import { CatalogSearchHeader } from "@/app/(public)/[userSlugOrId]/_components/catalog-search-header";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { PublicCatalogSearchClient } from "@/components/public-catalog-search/public-catalog-search-client";
import {
  toPublicCatalogSearchParams,
  type PublicCatalogSearchParamRecord,
} from "@/lib/public-catalog-url-state";
import { IMAGES } from "@/lib/constants/images";
import { getSocialCardImageUrl } from "@/lib/social-card";
import { parseTableUrlColumnFilterValue } from "@/lib/table-url-filters";
import { getErrorCode, tryCatch } from "@/lib/utils";
import { getOptimizedMetaImageUrl } from "@/lib/utils/cloudflareLoader";
import { getCanonicalBaseUrl } from "@/lib/utils/getBaseUrl";
import { getInitialListings } from "@/server/db/public-listing-read-model";
import { getPublicProfile } from "@/server/db/public-seller-read-model";

export const dynamic = "force-dynamic";

interface CatalogSearchPageProps {
  params: Promise<{
    userSlugOrId: string;
  }>;
  searchParams?: Promise<PublicCatalogSearchParamRecord>;
}

function hasOnlyCollectionParams(
  searchParams: PublicCatalogSearchParamRecord | undefined,
  collectionParam: "lists" | "price",
) {
  return Object.entries(searchParams ?? {}).every(
    ([key, value]) =>
      value === undefined ||
      key === collectionParam ||
      key === "page" ||
      key === "size",
  );
}

export async function generateMetadata({
  params,
  searchParams,
}: CatalogSearchPageProps): Promise<Metadata> {
  const [{ userSlugOrId }, rawSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);
  const profileResult = await tryCatch(getPublicProfile(userSlugOrId));

  if (!profileResult.data) {
    return buildNoIndexMetadata({
      title: "Catalog Search Not Found",
      description: "The catalog search page you requested does not exist.",
    });
  }

  const profile = profileResult.data;
  const canonicalUserSlug = profile.slug ?? profile.id;
  const titleBase = profile.title ?? "Daylily Catalog";
  const rawListValues = rawSearchParams?.lists;
  const parsedListIds = (
    Array.isArray(rawListValues) ? rawListValues : [rawListValues]
  ).flatMap((rawValue) => {
    if (!rawValue) {
      return [];
    }

    const parsed = parseTableUrlColumnFilterValue("lists", rawValue);
    return Array.isArray(parsed)
      ? parsed
      : typeof parsed === "string"
        ? [parsed]
        : [];
  });
  const uniqueListIds = Array.from(new Set(parsedListIds));
  const selectedList =
    uniqueListIds.length === 1
      ? profile.lists.find((list) => list.id === uniqueListIds[0])
      : null;
  const rawPriceValues = Array.isArray(rawSearchParams?.price)
    ? rawSearchParams.price
    : [rawSearchParams?.price];
  const isForSale = rawPriceValues.includes("true");

  if (selectedList && hasOnlyCollectionParams(rawSearchParams, "lists")) {
    const baseUrl = getCanonicalBaseUrl();
    const pageUrl = new URL(`/${canonicalUserSlug}/search`, baseUrl);
    pageUrl.searchParams.set("lists", selectedList.id);
    const selectedListDescription = selectedList.description?.trim();
    const description =
      selectedListDescription && selectedListDescription.length > 0
        ? selectedListDescription
        : `Browse ${selectedList.listingCount.toLocaleString()} daylily ${selectedList.listingCount === 1 ? "listing" : "listings"} curated by ${titleBase}.`;
    const imageUrl = getOptimizedMetaImageUrl(
      profile.images[0]?.url ?? IMAGES.DEFAULT_CATALOG,
    );

    return buildPublicPageMetadata({
      canonicalPath: `/${canonicalUserSlug}`,
      description,
      imageAlt: `${selectedList.title} list from ${titleBase}`,
      imageUrl,
      pageUrl: pageUrl.toString(),
      robots: "noindex, nofollow",
      socialImageUrl: getSocialCardImageUrl({
        baseUrl,
        kind: "list",
        id: selectedList.id,
        updatedAt: profile.updatedAt,
      }),
      title: `${selectedList.title} | ${titleBase}`,
    });
  }

  if (isForSale && hasOnlyCollectionParams(rawSearchParams, "price")) {
    const baseUrl = getCanonicalBaseUrl();
    const pageUrl = new URL(`/${canonicalUserSlug}/search`, baseUrl);
    pageUrl.searchParams.set("price", "true");
    const imageUrl = getOptimizedMetaImageUrl(
      profile.images[0]?.url ?? IMAGES.DEFAULT_CATALOG,
    );

    return buildPublicPageMetadata({
      canonicalPath: `/${canonicalUserSlug}`,
      description: `Browse daylilies currently marked for sale by ${titleBase}.`,
      imageAlt: `Daylilies for sale from ${titleBase}`,
      imageUrl,
      pageUrl: pageUrl.toString(),
      robots: "noindex, nofollow",
      socialImageUrl: getSocialCardImageUrl({
        baseUrl,
        kind: "for-sale",
        id: profile.id,
        updatedAt: profile.updatedAt,
      }),
      title: `For Sale | ${titleBase}`,
    });
  }

  return {
    title: `${titleBase} Catalog Search`,
    description: `Search and filter listings from ${titleBase}.`,
    robots: "noindex, nofollow",
    alternates: {
      canonical: `/${canonicalUserSlug}`,
    },
  };
}

export default async function CatalogSearchPage({
  params,
  searchParams,
}: CatalogSearchPageProps) {
  const [{ userSlugOrId }, rawSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);
  const searchParamsAsUrl = toPublicCatalogSearchParams(rawSearchParams);

  const profileResult = await tryCatch(getPublicProfile(userSlugOrId));

  if (getErrorCode(profileResult.error) === "NOT_FOUND") {
    notFound();
  }

  if (profileResult.error) {
    throw profileResult.error;
  }

  const profile = profileResult.data;
  const initialListings = await getInitialListings(userSlugOrId);
  const canonicalUserSlug = profile.slug ?? profile.id;

  if (userSlugOrId !== canonicalUserSlug) {
    const queryString = searchParamsAsUrl.toString();
    permanentRedirect(
      queryString
        ? `/${canonicalUserSlug}/search?${queryString}`
        : `/${canonicalUserSlug}/search`,
    );
  }

  return (
    <MainContent>
      <div className="mb-6">
        <Breadcrumbs
          items={[
            { title: "Catalogs", href: "/catalogs" },
            {
              title: profile.title ?? "Untitled Catalog",
              href: `/${canonicalUserSlug}`,
            },
            { title: "Catalog Search" },
          ]}
        />
      </div>

      <div className="space-y-6">
        <CatalogSearchHeader
          profile={{
            id: profile.id,
            title: profile.title ?? null,
          }}
        />

        <PublicCatalogSearchClient
          userId={profile.id}
          userSlugOrId={canonicalUserSlug}
          lists={profile.lists}
          initialListings={initialListings}
          totalListingsCount={profile._count.listings}
        />
      </div>
    </MainContent>
  );
}
