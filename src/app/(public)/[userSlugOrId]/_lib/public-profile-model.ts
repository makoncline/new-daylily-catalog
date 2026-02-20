import {
  getPublicCatalogForSaleSearchPath,
  getPublicCatalogListSearchPath,
  getPublicCatalogSearchPath,
} from "@/lib/public-catalog-url-state";
import { getBaseUrl } from "@/lib/utils/getBaseUrl";
import type { CatalogListsSectionProps } from "../_components/catalog-lists-section";
import type { CatalogListingsSectionProps } from "../_components/catalog-listings-section";
import type { CatalogSearchPrefetchProps } from "../_components/catalog-search-prefetch";
import type { ProfileContentProps } from "../_components/profile-content";
import type { PublicProfilePageViewModel } from "../_components/public-profile-page-shell";
import type { ProfilePageSEOProps } from "../_components/profile-seo";
import type { ProfileSectionData } from "../_components/profile-section";
import { generatePaginatedProfileMetadata } from "../_seo/paginated-metadata";
import { generateProfileMetadata } from "../_seo/metadata";
import type { PublicProfilePageData } from "./public-profile-route";

const LISTING_COUNT_FORMATTER = new Intl.NumberFormat("en-US");

function formatCount(count: number) {
  return LISTING_COUNT_FORMATTER.format(count);
}

function formatCountLabel(count: number) {
  return `${formatCount(count)} listings`;
}

function toProfileSectionLists(lists: PublicProfilePageData["profile"]["lists"]) {
  return lists.map((list): ProfileSectionData["lists"][number] => ({
    id: list.id,
    title: list.title,
    listingCount: list.listingCount,
  }));
}

export function toProfileSectionModel(
  profile: PublicProfilePageData["profile"],
): ProfileSectionData {
  return {
    id: profile.id,
    title: profile.title,
    description: profile.description,
    location: profile.location,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
    hasActiveSubscription: profile.hasActiveSubscription,
    _count: {
      listings: profile._count.listings,
    },
    lists: toProfileSectionLists(profile.lists),
  };
}

function toCatalogListsSectionModel(
  profile: PublicProfilePageData["profile"],
  canonicalUserSlug: string,
  forSaleCount: number,
): CatalogListsSectionProps {
  return {
    lists: profile.lists.map((list) => ({
      id: list.id,
      title: list.title,
      description: list.description,
      listingCount: list.listingCount,
      listingCountLabel: formatCountLabel(list.listingCount),
      href: getPublicCatalogListSearchPath(canonicalUserSlug, list.id),
    })),
    forSaleCount,
    forSaleCountLabel: formatCountLabel(forSaleCount),
    forSaleHref: getPublicCatalogForSaleSearchPath(canonicalUserSlug),
  };
}

function toCatalogListingsSectionModel(
  data: PublicProfilePageData,
  canonicalUserSlug: string,
): CatalogListingsSectionProps {
  return {
    canonicalUserSlug,
    listings: data.items,
    page: data.page,
    totalPages: data.totalPages,
    totalCount: data.totalCount,
    totalCountLabel: `${formatCount(data.totalCount)} total`,
    searchHref: getPublicCatalogSearchPath(canonicalUserSlug, data.page),
  };
}

function toProfileContentModel(
  profile: PublicProfilePageData["profile"],
  canonicalUserSlug: string,
): ProfileContentProps {
  return {
    canonicalUserSlug,
    profileSection: toProfileSectionModel(profile),
    images: profile.images,
    profileTitle: profile.title,
    content: profile.content,
  };
}

function toSearchPrefetchModel(
  profile: PublicProfilePageData["profile"],
  canonicalUserSlug: string,
): CatalogSearchPrefetchProps {
  return {
    userId: profile.id,
    userSlugOrId: canonicalUserSlug,
  };
}

function toBreadcrumbProfileModel(
  profile: PublicProfilePageData["profile"],
): PublicProfilePageViewModel["breadcrumbProfile"] {
  return {
    id: profile.id,
    title: profile.title,
    slug: profile.slug,
  };
}

async function toSeoModel(
  data: PublicProfilePageData,
  canonicalUserSlug: string,
): Promise<ProfilePageSEOProps> {
  const baseUrl = getBaseUrl();
  const baseMetadata = await generateProfileMetadata(data.profile, baseUrl);
  const metadata = generatePaginatedProfileMetadata({
    baseMetadata,
    profileSlug: canonicalUserSlug,
    page: data.page,
    hasNonPageStateParams: false,
  });

  return {
    profile: data.profile,
    listings: data.items,
    metadata,
    baseUrl,
  };
}

export async function buildPublicProfilePageModel(
  data: PublicProfilePageData,
): Promise<PublicProfilePageViewModel> {
  const canonicalUserSlug = data.profile.slug ?? data.profile.id;

  return {
    canonicalUserSlug,
    seo: await toSeoModel(data, canonicalUserSlug),
    profileContent: toProfileContentModel(data.profile, canonicalUserSlug),
    listings: {
      listsSection: toCatalogListsSectionModel(
        data.profile,
        canonicalUserSlug,
        data.forSaleCount,
      ),
      listingsSection: toCatalogListingsSectionModel(data, canonicalUserSlug),
    },
    searchPrefetch: toSearchPrefetchModel(data.profile, canonicalUserSlug),
    breadcrumbProfile: toBreadcrumbProfileModel(data.profile),
  };
}
