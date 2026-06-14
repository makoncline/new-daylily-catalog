// @ts-nocheck

const PUBLIC_REVALIDATION_SOURCE = "image-assets.variants";

const PUBLIC_CACHE_TAGS = {
  PUBLIC_PROFILES: "public:profiles",
  PUBLIC_PROFILE: "public:profile",
  PUBLIC_LISTINGS: "public:listings",
  PUBLIC_LISTINGS_PAGE: "public:listings:page",
  PUBLIC_FOR_SALE_COUNT: "public:listings:for-sale-count",
  PUBLIC_CULTIVAR_PAGE: "public:cultivar:page",
};

const CULTIVAR_ROUTE_ALNUM_REGEX = /^[a-z0-9]$/;
const CULTIVAR_ROUTE_LITERAL_ESCAPE_REGEX = /[-_.!~*'()]/g;

function normalizeCultivarName(name) {
  if (!name) {
    return null;
  }

  const normalized = name
    .toString()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u2018\u2019\u201B\u2032\u00B4\u0060]/g, "'")
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

  return normalized.length > 0 ? normalized : null;
}

function encodeCultivarRouteCharacter(character) {
  return encodeURIComponent(character)
    .replace(
      CULTIVAR_ROUTE_LITERAL_ESCAPE_REGEX,
      (value) => `%${value.charCodeAt(0).toString(16).toUpperCase()}`,
    )
    .replace(/%/g, "~")
    .toLowerCase();
}

function toCultivarRouteSegment(name) {
  const normalized = normalizeCultivarName(name);
  if (!normalized) {
    return null;
  }

  let segment = "";

  for (const character of normalized) {
    if (CULTIVAR_ROUTE_ALNUM_REGEX.test(character)) {
      segment += character;
      continue;
    }

    if (character === " ") {
      segment += "-";
      continue;
    }

    segment += encodeCultivarRouteCharacter(character);
  }

  return segment;
}

function getPublicProfileTag(userId) {
  return `${PUBLIC_CACHE_TAGS.PUBLIC_PROFILE}:${userId}`;
}

function getPublicSellerContentTag(userId) {
  return `${PUBLIC_CACHE_TAGS.PUBLIC_PROFILE}:content:${userId}`;
}

function getPublicSellerListsTag(userId) {
  return `${PUBLIC_CACHE_TAGS.PUBLIC_PROFILE}:lists:${userId}`;
}

function getPublicListingsPageTag(userId) {
  return `${PUBLIC_CACHE_TAGS.PUBLIC_LISTINGS_PAGE}:${userId}`;
}

function getPublicForSaleCountTag(userId) {
  return `${PUBLIC_CACHE_TAGS.PUBLIC_FOR_SALE_COUNT}:${userId}`;
}

function getPublicListingCardTag(listingId) {
  return `${PUBLIC_CACHE_TAGS.PUBLIC_LISTINGS}:card:${listingId}`;
}

function getPublicCultivarTag(segment) {
  return `${PUBLIC_CACHE_TAGS.PUBLIC_CULTIVAR_PAGE}:${segment}`;
}

function uniqueBy(items, getKey) {
  return Array.from(new Map(items.map((item) => [getKey(item), item])).values());
}

function addCultivarTargets(targets, normalizedName) {
  const segment = toCultivarRouteSegment(normalizedName);
  if (!segment) return;

  targets.paths.push({ path: `/cultivar/${segment}` });
  targets.tags.push({ tag: getPublicCultivarTag(segment) });
}

function createPayload(paths, tags) {
  return {
    source: PUBLIC_REVALIDATION_SOURCE,
    paths: uniqueBy(paths, (entry) => `${entry.type ?? "default"}:${entry.path}`),
    tags: uniqueBy(tags, (entry) => `${entry.profile ?? "expire:0"}:${entry.tag}`),
  };
}

async function buildListingPayload({ asset, db }) {
  if (!asset.listingId) {
    return createPayload([], []);
  }

  const listing = await db.listing.findUnique({
    where: { id: asset.listingId },
    select: {
      id: true,
      userId: true,
      cultivarReference: {
        select: {
          normalizedName: true,
        },
      },
      user: {
        select: {
          profile: {
            select: {
              slug: true,
            },
          },
        },
      },
    },
  });

  if (!listing) {
    return createPayload([], []);
  }

  const targets = {
    paths: [{ path: `/${listing.user.profile?.slug ?? listing.userId}` }],
    tags: [{ tag: getPublicListingCardTag(listing.id) }],
  };

  addCultivarTargets(targets, listing.cultivarReference?.normalizedName);

  return createPayload(targets.paths, targets.tags);
}

async function buildProfilePayload({ asset, db }) {
  if (!asset.userProfileId) {
    return createPayload([], []);
  }

  const profile = await db.userProfile.findUnique({
    where: { id: asset.userProfileId },
    select: {
      userId: true,
      slug: true,
    },
  });

  if (!profile) {
    return createPayload([], []);
  }

  const targets = {
    paths: [{ path: `/${profile.slug ?? profile.userId}` }, { path: "/catalogs" }],
    tags: [
      { tag: getPublicProfileTag(profile.userId) },
      { tag: getPublicSellerContentTag(profile.userId) },
      { tag: getPublicSellerListsTag(profile.userId) },
      { tag: getPublicListingsPageTag(profile.userId) },
      { tag: getPublicForSaleCountTag(profile.userId) },
      { tag: PUBLIC_CACHE_TAGS.PUBLIC_PROFILES },
    ],
  };

  const listings = await db.listing.findMany({
    where: {
      userId: profile.userId,
      cultivarReference: {
        normalizedName: {
          not: null,
        },
      },
    },
    select: {
      cultivarReference: {
        select: {
          normalizedName: true,
        },
      },
    },
  });

  listings.forEach((listing) => {
    addCultivarTargets(targets, listing.cultivarReference?.normalizedName);
  });

  return createPayload(targets.paths, targets.tags);
}

export async function buildPublicCacheRevalidationPayloadForAsset({
  asset,
  db,
}) {
  if (asset.listingId) {
    return buildListingPayload({ asset, db });
  }

  return buildProfilePayload({ asset, db });
}

export async function postPublicCacheRevalidation({
  fetchImpl = fetch,
  payload,
}) {
  if (payload.paths.length === 0 && payload.tags.length === 0) {
    return false;
  }

  const baseUrl = process.env.APP_BASE_URL?.trim();
  const secret = process.env.CLERK_WEBHOOK_SECRET?.trim();

  if (!baseUrl || !secret) {
    console.warn(
      "[image-assets] skipped public cache revalidation; APP_BASE_URL or CLERK_WEBHOOK_SECRET is missing",
    );
    return false;
  }

  const routeUrl = new URL("/api/internal/public-cache-revalidate", baseUrl);
  const response = await fetchImpl(routeUrl, {
    method: "POST",
    headers: {
      authorization: `Bearer ${secret}`,
      "content-type": "application/json",
    },
    cache: "no-store",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(
      `Public cache revalidate route failed with status ${response.status}`,
    );
  }

  return true;
}

export async function revalidatePublicCacheForAsset({ asset, db, fetchImpl }) {
  const payload = await buildPublicCacheRevalidationPayloadForAsset({
    asset,
    db,
  });

  return postPublicCacheRevalidation({ payload, fetchImpl });
}
