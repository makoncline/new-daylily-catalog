import { METADATA_CONFIG } from "@/config/constants";

export interface Breadcrumb {
  name: string;
  url: string;
}

/**
 * Creates a BreadcrumbList schema for structured data
 * @param baseUrl The base URL of the site
 * @param breadcrumbs Array of breadcrumb items
 * @returns The BreadcrumbList schema object
 */
export function createBreadcrumbListSchema(
  baseUrl: string,
  breadcrumbs: Breadcrumb[],
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbs.map((breadcrumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: breadcrumb.name,
      item: breadcrumb.url.startsWith("/")
        ? `${baseUrl}${breadcrumb.url}`
        : breadcrumb.url,
    })),
  };
}

/**
 * Creates a home breadcrumb
 * @param baseUrl The base URL of the site
 * @returns A home breadcrumb
 */
export function createHomeBreadcrumb(baseUrl: string): Breadcrumb {
  return {
    name: "Home",
    url: baseUrl,
  };
}

/**
 * Creates breadcrumbs for the catalog page
 * @param baseUrl The base URL of the site
 * @returns Array of breadcrumbs for the catalogs page
 */
export function createCatalogsBreadcrumbs(baseUrl: string): Breadcrumb[] {
  return [
    createHomeBreadcrumb(baseUrl),
    {
      name: "Catalogs",
      url: `${baseUrl}/catalogs`,
    },
  ];
}

/**
 * Creates breadcrumbs for a user profile page
 * @param baseUrl The base URL of the site
 * @param profileName The name of the profile
 * @param profileSlug The slug or ID of the profile
 * @returns Array of breadcrumbs for the user profile page
 */
export function createUserProfileBreadcrumbs(
  baseUrl: string,
  profileName: string,
  profileSlug: string,
): Breadcrumb[] {
  return [
    createHomeBreadcrumb(baseUrl),
    {
      name: "Catalogs",
      url: `${baseUrl}/catalogs`,
    },
    {
      name: profileName || "Daylily Catalog",
      url: `${baseUrl}/${profileSlug}`,
    },
  ];
}

/**
 * Creates breadcrumbs for a listing page
 * @param baseUrl The base URL of the site
 * @param profileName The name of the profile
 * @param profileSlug The slug or ID of the profile
 * @param listingName The name of the listing
 * @param listingSlug The slug or ID of the listing
 * @returns Array of breadcrumbs for the listing page
 */
export function createListingBreadcrumbs(
  baseUrl: string,
  profileName: string,
  profileSlug: string,
  listingName: string,
  listingSlug: string,
): Breadcrumb[] {
  return [
    ...createUserProfileBreadcrumbs(baseUrl, profileName, profileSlug),
    {
      name: listingName || "Daylily",
      url: `${baseUrl}/${profileSlug}/${listingSlug}`,
    },
  ];
}
