import { IMAGES } from "@/lib/constants/images";
import { getOptimizedMetaImageUrl } from "@/lib/utils/cloudflareLoader";
import { reportError } from "@/lib/error-utils";
import { METADATA_CONFIG } from "@/config/constants";
import { getSocialCardImageUrl } from "@/lib/social-card";
import {
  buildPublicPageMetadata,
  type PublicPageMetadata,
} from "@/app/(public)/_seo/public-seo";
import type { PublicCatalogSearchParamRecord } from "@/lib/public-catalog-url-state";
import { parseTableUrlColumnFilterValue } from "@/lib/table-url-filters";

// Optimal meta description length
const MIN_DESCRIPTION_LENGTH = 70;
const MAX_DESCRIPTION_LENGTH = 160;

// Define a type for the profile data structure
interface PublicProfile {
  id: string;
  title: string | null;
  slug: string | null;
  description: string | null;
  location: string | null;
  images?: Array<{ id: string; url: string }>;
  // Add other fields as needed
}

interface PublicCollectionProfile extends PublicProfile {
  lists: Array<{
    id: string;
    title: string;
    description: string | null;
    listingCount: number;
  }>;
}

function hasOnlyCollectionParams(
  searchParams: PublicCatalogSearchParamRecord | undefined,
  collectionParam: "lists" | "price",
) {
  return Object.keys(searchParams ?? {}).every((key) =>
    [collectionParam, "mode", "page", "size"].includes(key),
  );
}

function getSingleListId(rawValue: string | string[] | undefined) {
  const ids = (Array.isArray(rawValue) ? rawValue : [rawValue]).flatMap(
    (value) => {
      if (!value) return [];
      const parsed = parseTableUrlColumnFilterValue("lists", value);
      return Array.isArray(parsed)
        ? parsed
        : typeof parsed === "string"
          ? [parsed]
          : [];
    },
  );
  const uniqueIds = Array.from(new Set(ids));
  return uniqueIds.length === 1 ? uniqueIds[0] : null;
}

// Function to generate metadata for a user profile
async function createProfileMetadata(
  profile: PublicProfile | null,
  url: string,
): Promise<PublicPageMetadata> {
  // Handle null profile case
  if (!profile) {
    return {
      url,
      title: "Catalog Not Found",
      description: "The daylily catalog you are looking for does not exist.",
      imageUrl: IMAGES.DEFAULT_CATALOG,
      pageUrl: url,
      robots: "noindex, nofollow",
      openGraph: {
        title: "Catalog Not Found",
        description: "The daylily catalog you are looking for does not exist.",
        siteName: METADATA_CONFIG.SITE_NAME,
        locale: METADATA_CONFIG.LOCALE,
      },
    };
  }

  try {
    const title = profile.title ?? "Daylily Catalog";

    // Generate description with proper length
    let description = profile.description ?? "";

    // If no description, create one with available information
    if (!description) {
      description = `Browse our collection of beautiful daylilies.${
        profile.location ? ` Located in ${profile.location}.` : ""
      }`;
    }

    // Ensure description is within length limits
    if (description.length > MAX_DESCRIPTION_LENGTH) {
      description =
        description.substring(0, MAX_DESCRIPTION_LENGTH - 3) + "...";
    } else if (description.length < MIN_DESCRIPTION_LENGTH) {
      // Add generic text if too short
      description += " Find unique daylilies for your garden from our catalog.";

      // Truncate if it became too long
      if (description.length > MAX_DESCRIPTION_LENGTH) {
        description =
          description.substring(0, MAX_DESCRIPTION_LENGTH - 3) + "...";
      }
    }

    const rawImageUrl = profile.images?.[0]?.url ?? IMAGES.DEFAULT_CATALOG;
    const imageUrl = getOptimizedMetaImageUrl(rawImageUrl);
    const canonicalUserSlug = profile.slug ?? profile.id;
    const pageUrl = `${url}/${canonicalUserSlug}`;
    const socialImageUrl = getSocialCardImageUrl({
      baseUrl: url,
      kind: "catalog",
      id: profile.id,
    });

    return {
      ...buildPublicPageMetadata({
        canonicalPath: `/${canonicalUserSlug}`,
        description: description.trim(),
        imageAlt: `${title} catalog preview`,
        imageUrl,
        pageUrl,
        socialImageUrl,
        title: `${title} | ${METADATA_CONFIG.SITE_NAME}`,
      }),
      url,
    };
  } catch (error) {
    reportError({
      error:
        error instanceof Error
          ? error
          : new Error("Unknown error in profile metadata generation"),
      level: "error",
      context: {
        profile: { id: profile.id },
        url,
        function: "createProfileMetadata",
      },
    });

    // Fallback values
    return {
      url,
      title: "Daylily Catalog",
      description: "Browse our collection of beautiful daylilies.",
      imageUrl: IMAGES.DEFAULT_CATALOG,
      pageUrl: `${url}/${profile.slug ?? profile.id}`,
      // Avoid indexing metadata generated from fallback errors.
      robots: "noindex, nofollow",
      openGraph: {
        title: "Daylily Catalog",
        description: "Browse our collection of beautiful daylilies.",
        siteName: METADATA_CONFIG.SITE_NAME,
        locale: METADATA_CONFIG.LOCALE,
      },
    };
  }
}

export function generateProfileMetadata(
  profile: PublicProfile | null,
  url: string,
) {
  return createProfileMetadata(profile, url);
}

export function generateCollectionMetadata(
  profile: PublicCollectionProfile,
  searchParams: PublicCatalogSearchParamRecord | undefined,
  baseUrl: string,
) {
  const sellerTitle = profile.title ?? "Daylily Catalog";
  const selectedList = profile.lists.find(
    (list) => list.id === getSingleListId(searchParams?.lists),
  );
  const isForSale = (
    Array.isArray(searchParams?.price)
      ? searchParams.price
      : [searchParams?.price]
  ).includes("true");
  const collection =
    selectedList && hasOnlyCollectionParams(searchParams, "lists")
      ? {
          kind: "list" as const,
          id: selectedList.id,
          title: selectedList.title,
          description: selectedList.description?.trim()
            ? selectedList.description.trim()
            : `Browse ${selectedList.listingCount.toLocaleString()} daylily ${selectedList.listingCount === 1 ? "listing" : "listings"} curated by ${sellerTitle}.`,
        }
      : isForSale && hasOnlyCollectionParams(searchParams, "price")
        ? {
            kind: "for-sale" as const,
            id: profile.id,
            title: "For Sale",
            description: `Browse daylilies currently marked for sale by ${sellerTitle}.`,
          }
        : null;

  if (!collection) return null;

  const canonicalUserSlug = profile.slug ?? profile.id;
  const pageUrl = new URL(`/${canonicalUserSlug}/search`, baseUrl);
  pageUrl.searchParams.set(
    collection.kind === "list" ? "lists" : "price",
    collection.kind === "list" ? collection.id : "true",
  );

  return buildPublicPageMetadata({
    canonicalPath: `/${canonicalUserSlug}`,
    description: collection.description,
    imageAlt: `${collection.title} from ${sellerTitle}`,
    imageUrl: getOptimizedMetaImageUrl(
      profile.images?.[0]?.url ?? IMAGES.DEFAULT_CATALOG,
    ),
    pageUrl: pageUrl.toString(),
    robots: "noindex, nofollow",
    socialImageUrl: getSocialCardImageUrl({
      baseUrl,
      kind: collection.kind,
      id: collection.id,
    }),
    title: `${collection.title} | ${sellerTitle}`,
  });
}
