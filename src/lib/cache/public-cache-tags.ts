import { CACHE_CONFIG } from "@/config/cache-config";

export function getPublicCatalogsTag() {
  return CACHE_CONFIG.TAGS.PUBLIC_PROFILES;
}

export function getPublicProfileTag(userId: string) {
  return `${CACHE_CONFIG.TAGS.PUBLIC_PROFILE}:${userId}`;
}

export function getPublicSellerContentTag(userId: string) {
  return `${CACHE_CONFIG.TAGS.PUBLIC_PROFILE}:content:${userId}`;
}

export function getPublicSellerListsTag(userId: string) {
  return `${CACHE_CONFIG.TAGS.PUBLIC_PROFILE}:lists:${userId}`;
}

export function getPublicListingsPageTag(userId: string, page?: number) {
  return page === undefined
    ? `${CACHE_CONFIG.TAGS.PUBLIC_LISTINGS_PAGE}:${userId}`
    : `${CACHE_CONFIG.TAGS.PUBLIC_LISTINGS_PAGE}:${userId}:page:${page}`;
}

export function getPublicForSaleCountTag(userId: string) {
  return `${CACHE_CONFIG.TAGS.PUBLIC_FOR_SALE_COUNT}:${userId}`;
}

export function getPublicListingCardTag(listingId: string) {
  return `${CACHE_CONFIG.TAGS.PUBLIC_LISTINGS}:card:${listingId}`;
}

export function getPublicCultivarSummaryTag(segment: string) {
  return `${CACHE_CONFIG.TAGS.PUBLIC_CULTIVAR_PAGE}:summary:${segment}`;
}

export function getPublicCultivarTag(segment: string) {
  return `${CACHE_CONFIG.TAGS.PUBLIC_CULTIVAR_PAGE}:${segment}`;
}

export function getPublicCultivarOffersTag(segment: string) {
  return `${CACHE_CONFIG.TAGS.PUBLIC_CULTIVAR_PAGE}:offers:${segment}`;
}

export function getPublicCultivarPhotosTag(segment: string) {
  return `${CACHE_CONFIG.TAGS.PUBLIC_CULTIVAR_PAGE}:photos:${segment}`;
}
