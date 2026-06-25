import type { Prisma } from "@prisma/client";
import { z } from "zod";
import {
  getOAuthProtectedResourceScopes,
  getTrustedBaseUrl,
} from "@/lib/agent-readiness";
import {
  ahsDisplayAhsListingSelect,
  getDisplayAhsListing,
  v2AhsCultivarDisplaySelect,
} from "@/lib/utils/ahs-display";
import {
  generatedCultivarImageAssetInclude,
  resolveCultivarReferenceImage,
  shouldQueryGeneratedCultivarImageAssets,
} from "@/server/services/cultivar-reference-image-read-model";
import { toCultivarRouteSegment } from "@/lib/utils/cultivar-utils";
import { db, replicaDb } from "@/server/db";
import { getProUserIds } from "@/server/db/getProUserIds";
import {
  buildPublicListingDetail,
  publicListingSelect,
} from "@/server/db/public-listing-read-model";
import {
  getPublicProfile,
  getPublicSellerListSummaries,
  getUserIdFromSlugOrId,
} from "@/server/db/public-seller-read-model";
import {
  isPublicList,
  shouldShowToPublic,
} from "@/server/db/public-visibility/filters";
import { getClerk } from "@/server/clerk/client";
import {
  DEFAULT_LIMIT,
  MAX_LIMIT,
} from "@/server/mcp/read-only-mcp-schema-builders";
import { buildReadOnlyMcpTools } from "@/server/mcp/read-only-mcp-tools";
import type {
  JsonRpcRequest,
  McpContext,
} from "@/server/mcp/read-only-mcp-types";
import { searchCultivars } from "@/server/search/cultivar-search";

const MCP_PROTOCOL_VERSION = "2025-11-25";
const SUPPORTED_MCP_PROTOCOL_VERSIONS = [
  "2025-11-25",
  "2025-06-18",
  "2025-03-26",
] as const;
const MCP_SERVER_NAME = "daylily-catalog";
const MCP_SERVER_VERSION = "0.1.0";

class McpError extends Error {
  constructor(
    message: string,
    readonly code = -32000,
    readonly data?: unknown,
  ) {
    super(message);
  }
}

class McpAuthRequiredError extends Error {
  constructor() {
    super("Authentication required.");
  }
}

const REQUIRED_PRIVATE_OAUTH_SCOPE = "profile";
const PRIVATE_OAUTH_SCOPES = getOAuthProtectedResourceScopes();
const tools = buildReadOnlyMcpTools(PRIVATE_OAUTH_SCOPES);

function getExpectedMcpOAuthClientId() {
  const clientId = process.env.DAYLILY_MCP_OAUTH_CLIENT_ID?.trim();
  if (!clientId) return null;
  return clientId;
}

const limitSchema = z
  .number()
  .int()
  .min(1)
  .max(MAX_LIMIT)
  .optional()
  .default(DEFAULT_LIMIT);

const optionalCursorSchema = z.string().trim().min(1).optional();

const listSchema = z.object({
  cursor: optionalCursorSchema,
  limit: limitSchema,
});

const searchCultivarsSchema = z.object({
  q: z.string().trim().min(1).optional(),
  cultivarName: z.string().trim().min(1).optional(),
  hybridizer: z.string().trim().min(1).optional(),
  color: z.string().trim().min(1).optional(),
  parentage: z.string().trim().min(1).optional(),
  limit: limitSchema,
});

const publicListingSearchSchema = listSchema.extend({
  color: z.string().trim().min(1).optional(),
  cultivarName: z.string().trim().min(1).optional(),
  description: z.string().trim().min(1).optional(),
  hasPhoto: z.boolean().optional(),
  hasPrice: z.boolean().optional(),
  hybridizer: z.string().trim().min(1).optional(),
  listId: z.string().trim().min(1).optional(),
  listTitle: z.string().trim().min(1).optional(),
  parentage: z.string().trim().min(1).optional(),
  priceMax: z.number().finite().optional(),
  priceMin: z.number().finite().optional(),
  q: z.string().trim().min(1).optional(),
  sellerSlug: z.string().trim().min(1).optional(),
  title: z.string().trim().min(1).optional(),
  year: z.string().trim().min(1).optional(),
});

const publicProfileSchema = z.object({
  sellerSlug: z.string().trim().min(1),
});

const publicListingSchema = z
  .object({
    id: z.string().trim().min(1).optional(),
    listingSlug: z.string().trim().min(1).optional(),
    sellerSlug: z.string().trim().min(1).optional(),
  })
  .refine(
    (input) => Boolean(input.id ?? (input.sellerSlug && input.listingSlug)),
    {
      message: "Provide id or sellerSlug plus listingSlug.",
    },
  );

const getCultivarSchema = z.object({
  cultivarReferenceId: z.string().trim().min(1).optional(),
  normalizedName: z.string().trim().min(1).optional(),
});

const listListingsSchema = listSchema.extend({
  bloomHabit: z.string().trim().min(1).optional(),
  bloomSeason: z.string().trim().min(1).optional(),
  color: z.string().trim().min(1).optional(),
  cultivarName: z.string().trim().min(1).optional(),
  description: z.string().trim().min(1).optional(),
  foliageType: z.string().trim().min(1).optional(),
  form: z.string().trim().min(1).optional(),
  fragrance: z.string().trim().min(1).optional(),
  hasPhoto: z.boolean().optional(),
  hasPrice: z.boolean().optional(),
  hybridizer: z.string().trim().min(1).optional(),
  linkedToCultivar: z.boolean().optional(),
  listId: z.string().trim().min(1).optional(),
  parentage: z.string().trim().min(1).optional(),
  ploidy: z.string().trim().min(1).optional(),
  priceMax: z.number().finite().optional(),
  priceMin: z.number().finite().optional(),
  q: z.string().trim().min(1).optional(),
  status: z.string().trim().min(1).optional(),
  title: z.string().trim().min(1).optional(),
  year: z.string().trim().min(1).optional(),
});

const getByIdSchema = z.object({
  id: z.string().trim().min(1),
});

function mcpResult(payload: unknown) {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(payload, null, 2),
      },
    ],
    structuredContent: payload,
  };
}

function parseObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function serializeDate(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function serializeCultivarReference(
  cultivarReference: Prisma.CultivarReferenceGetPayload<{
    select: typeof cultivarReferenceSelect;
  }> | null,
  baseUrl: string,
) {
  if (!cultivarReference) return null;
  const ahsListing = getDisplayAhsListing(cultivarReference);
  const cultivarReferenceImage = resolveCultivarReferenceImage({
    id: `ahs-${cultivarReference.id}`,
    fallbackImageUrl: ahsListing?.ahsImageUrl,
    imageAssets:
      "imageAssets" in cultivarReference ? cultivarReference.imageAssets : [],
  });
  const segment = cultivarReference.normalizedName
    ? toCultivarRouteSegment(cultivarReference.normalizedName)
    : null;

  return {
    id: cultivarReference.id,
    ahsId: cultivarReference.ahsId,
    v2AhsCultivarId: cultivarReference.v2AhsCultivarId,
    normalizedName: cultivarReference.normalizedName,
    canonicalUrl: segment ? `${baseUrl}/cultivar/${segment}` : null,
    updatedAt: serializeDate(cultivarReference.updatedAt),
    display: ahsListing
      ? {
          name: ahsListing.name,
          hybridizer: ahsListing.hybridizer,
          year: ahsListing.year,
          scapeHeight: ahsListing.scapeHeight,
          bloomSize: ahsListing.bloomSize,
          bloomSeason: ahsListing.bloomSeason,
          ploidy: ahsListing.ploidy,
          foliageType: ahsListing.foliageType,
          bloomHabit: ahsListing.bloomHabit,
          color: ahsListing.color,
          form: ahsListing.form,
          parentage: ahsListing.parentage,
          imageUrl: cultivarReferenceImage?.url ?? null,
        }
      : null,
  };
}

function serializeListing(
  listing: Prisma.ListingGetPayload<{
    select: typeof listingSelect;
  }>,
  baseUrl: string,
) {
  return {
    id: listing.id,
    title: listing.title,
    slug: listing.slug,
    price: listing.price,
    description: listing.description,
    privateNote: listing.privateNote,
    status: listing.status,
    cultivarReferenceId: listing.cultivarReferenceId,
    createdAt: serializeDate(listing.createdAt),
    updatedAt: serializeDate(listing.updatedAt),
    cultivar: serializeCultivarReference(listing.cultivarReference, baseUrl),
    images: listing.images.map((image) => ({
      id: image.id,
      url: image.url,
      order: image.order,
      status: image.status,
    })),
    lists: listing.lists.map((list) => ({
      id: list.id,
      title: list.title,
    })),
  };
}

function serializeList(
  list: Prisma.ListGetPayload<{
    select: typeof listSelect;
  }>,
) {
  return {
    id: list.id,
    title: list.title,
    description: list.description,
    status: list.status,
    createdAt: serializeDate(list.createdAt),
    updatedAt: serializeDate(list.updatedAt),
    listings: list.listings.map((listing) => ({
      id: listing.id,
    })),
  };
}

type ListListingsInput = z.infer<typeof listListingsSchema>;
type PublicListingSearchInput = z.infer<typeof publicListingSearchSchema>;
type PublicListingInput = z.infer<typeof publicListingSchema>;

function textContains(value: string): Prisma.StringFilter {
  return { contains: value };
}

function linkedCultivarWhere(
  where: Prisma.CultivarReferenceWhereInput,
): Prisma.ListingWhereInput {
  return { cultivarReference: { is: where } };
}

function ahsListingWhere(where: Prisma.AhsListingWhereInput) {
  return [
    { ahsListing: { is: where } },
    linkedCultivarWhere({ ahsListing: { is: where } }),
  ] satisfies Prisma.ListingWhereInput[];
}

function v2CultivarWhere(
  where: Prisma.V2AhsCultivarWhereInput,
): Prisma.ListingWhereInput {
  return linkedCultivarWhere({ v2AhsCultivar: { is: where } });
}

function cultivarNameWhere(value: string) {
  const contains = textContains(value);

  return [
    { cultivarReference: { is: { normalizedName: contains } } },
    ...ahsListingWhere({ name: contains }),
    v2CultivarWhere({ post_title: contains }),
    v2CultivarWhere({ link_normalized_name: contains }),
  ] satisfies Prisma.ListingWhereInput[];
}

function hybridizerWhere(value: string) {
  const contains = textContains(value);

  return [
    ...ahsListingWhere({ hybridizer: contains }),
    v2CultivarWhere({ primary_hybridizer_name: contains }),
    v2CultivarWhere({ additional_hybridizers_names: contains }),
    v2CultivarWhere({ hybridizer_code_legacy: contains }),
  ] satisfies Prisma.ListingWhereInput[];
}

function cultivarTextWhere(args: {
  ahsField: keyof Prisma.AhsListingWhereInput;
  v2Field: keyof Prisma.V2AhsCultivarWhereInput;
  value: string;
}) {
  const contains = textContains(args.value);

  return [
    ...ahsListingWhere({ [args.ahsField]: contains }),
    v2CultivarWhere({ [args.v2Field]: contains }),
  ] satisfies Prisma.ListingWhereInput[];
}

function buildListingWhere(userId: string, input: ListListingsInput) {
  const and: Prisma.ListingWhereInput[] = [{ userId }];

  if (input.cursor) {
    and.push({ id: { gt: input.cursor } });
  }

  if (input.q) {
    const contains = textContains(input.q);
    and.push({
      OR: [
        { title: contains },
        { description: contains },
        { privateNote: contains },
        ...cultivarNameWhere(input.q),
        ...hybridizerWhere(input.q),
        ...cultivarTextWhere({
          ahsField: "color",
          v2Field: "color",
          value: input.q,
        }),
        ...cultivarTextWhere({
          ahsField: "parentage",
          v2Field: "parentage",
          value: input.q,
        }),
      ],
    });
  }

  if (input.title) {
    and.push({ title: textContains(input.title) });
  }

  if (input.description) {
    and.push({ description: textContains(input.description) });
  }

  if (input.status) {
    and.push({ status: input.status });
  }

  if (input.listId) {
    and.push({ lists: { some: { id: input.listId } } });
  }

  if (input.hasPhoto === true) {
    and.push({ images: { some: {} } });
  } else if (input.hasPhoto === false) {
    and.push({ images: { none: {} } });
  }

  if (input.hasPrice === true) {
    and.push({ price: { gt: 0 } });
  } else if (input.hasPrice === false) {
    and.push({ OR: [{ price: null }, { price: { lte: 0 } }] });
  }

  if (typeof input.priceMin === "number") {
    and.push({ price: { gte: input.priceMin } });
  }

  if (typeof input.priceMax === "number") {
    and.push({ price: { lte: input.priceMax } });
  }

  if (input.linkedToCultivar === true) {
    and.push({ cultivarReferenceId: { not: null } });
  } else if (input.linkedToCultivar === false) {
    and.push({ cultivarReferenceId: null });
  }

  if (input.cultivarName) {
    and.push({ OR: cultivarNameWhere(input.cultivarName) });
  }

  if (input.hybridizer) {
    and.push({ OR: hybridizerWhere(input.hybridizer) });
  }

  if (input.year) {
    const contains = textContains(input.year);
    and.push({
      OR: [
        ...ahsListingWhere({ year: contains }),
        v2CultivarWhere({ introduction_date: contains }),
      ],
    });
  }

  const cultivarTextFilters = [
    ["bloomHabit", "bloomHabit", "bloom_habit_names"],
    ["bloomSeason", "bloomSeason", "bloom_season_names"],
    ["color", "color", "color"],
    ["foliageType", "foliageType", "foliage_names"],
    ["form", "form", "flower_form_names"],
    ["fragrance", "fragrance", "fragrance_names"],
    ["parentage", "parentage", "parentage"],
    ["ploidy", "ploidy", "ploidy_names"],
  ] as const;

  for (const [inputKey, ahsField, v2Field] of cultivarTextFilters) {
    const value = input[inputKey];
    if (value) {
      and.push({
        OR: cultivarTextWhere({
          ahsField,
          v2Field,
          value,
        }),
      });
    }
  }

  return { AND: and } satisfies Prisma.ListingWhereInput;
}

async function buildPublicListingWhere(input: PublicListingSearchInput) {
  const proUserIds = await getProUserIds();
  const and: Prisma.ListingWhereInput[] = [shouldShowToPublic(proUserIds)];

  if (input.cursor) {
    and.push({ id: { gt: input.cursor } });
  }

  if (input.sellerSlug) {
    const userId = await getUserIdFromSlugOrId(input.sellerSlug);
    and.push({ userId });
  }

  if (input.q) {
    const contains = textContains(input.q);
    and.push({
      OR: [
        { title: contains },
        { description: contains },
        ...cultivarNameWhere(input.q),
        ...hybridizerWhere(input.q),
        ...cultivarTextWhere({
          ahsField: "color",
          v2Field: "color",
          value: input.q,
        }),
        ...cultivarTextWhere({
          ahsField: "parentage",
          v2Field: "parentage",
          value: input.q,
        }),
      ],
    });
  }

  if (input.title) {
    and.push({ title: textContains(input.title) });
  }

  if (input.description) {
    and.push({ description: textContains(input.description) });
  }

  if (input.listId) {
    and.push({ lists: { some: { ...isPublicList(), id: input.listId } } });
  }

  if (input.listTitle) {
    and.push({
      lists: {
        some: { ...isPublicList(), title: textContains(input.listTitle) },
      },
    });
  }

  if (input.hasPhoto === true) {
    and.push({ images: { some: {} } });
  } else if (input.hasPhoto === false) {
    and.push({ images: { none: {} } });
  }

  if (input.hasPrice === true) {
    and.push({ price: { gt: 0 } });
  } else if (input.hasPrice === false) {
    and.push({ OR: [{ price: null }, { price: { lte: 0 } }] });
  }

  if (typeof input.priceMin === "number") {
    and.push({ price: { gte: input.priceMin } });
  }

  if (typeof input.priceMax === "number") {
    and.push({ price: { lte: input.priceMax } });
  }

  if (input.cultivarName) {
    and.push({ OR: cultivarNameWhere(input.cultivarName) });
  }

  if (input.hybridizer) {
    and.push({ OR: hybridizerWhere(input.hybridizer) });
  }

  if (input.year) {
    const contains = textContains(input.year);
    and.push({
      OR: [
        ...ahsListingWhere({ year: contains }),
        v2CultivarWhere({ introduction_date: contains }),
      ],
    });
  }

  for (const [inputKey, ahsField, v2Field] of [
    ["color", "color", "color"],
    ["parentage", "parentage", "parentage"],
  ] as const) {
    const value = input[inputKey];
    if (value) {
      and.push({
        OR: cultivarTextWhere({
          ahsField,
          v2Field,
          value,
        }),
      });
    }
  }

  return { AND: and } satisfies Prisma.ListingWhereInput;
}

async function getPublicMcpUserId(sellerSlugOrId: string) {
  const [proUserIds, userId] = await Promise.all([
    getProUserIds(),
    getUserIdFromSlugOrId(sellerSlugOrId),
  ]);

  if (!proUserIds.includes(userId)) {
    throw new McpError("Public catalog not found.", -32004);
  }

  return userId;
}

async function getPublicMcpListingDetail(
  context: McpContext,
  input: PublicListingInput,
) {
  const proUserIds = await getProUserIds();
  const listing = await context.readDb.listing.findFirst({
    where: input.id
      ? {
          id: input.id,
          ...shouldShowToPublic(proUserIds),
        }
      : {
          slug: input.listingSlug?.toLowerCase(),
          userId: await getPublicMcpUserId(input.sellerSlug ?? ""),
          ...shouldShowToPublic(proUserIds),
        },
    select: publicListingSelect,
  });

  if (!listing) {
    throw new McpError("Listing not found.", -32004);
  }

  return buildPublicListingDetail(listing);
}

const cultivarReferenceSelect = {
  id: true,
  ahsId: true,
  v2AhsCultivarId: true,
  normalizedName: true,
  updatedAt: true,
  ahsListing: { select: ahsDisplayAhsListingSelect },
  v2AhsCultivar: { select: v2AhsCultivarDisplaySelect },
  ...(shouldQueryGeneratedCultivarImageAssets()
    ? { imageAssets: generatedCultivarImageAssetInclude }
    : {}),
} as const;

const listingSelect = {
  id: true,
  title: true,
  slug: true,
  price: true,
  description: true,
  privateNote: true,
  status: true,
  cultivarReferenceId: true,
  createdAt: true,
  updatedAt: true,
  cultivarReference: { select: cultivarReferenceSelect },
  images: {
    select: {
      id: true,
      url: true,
      order: true,
      status: true,
    },
    orderBy: { order: "asc" },
  },
  lists: {
    select: {
      id: true,
      title: true,
    },
    orderBy: { title: "asc" },
  },
} as const satisfies Prisma.ListingSelect;

const listSelect = {
  id: true,
  title: true,
  description: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  listings: {
    select: {
      id: true,
    },
  },
} as const satisfies Prisma.ListSelect;

async function requireMcpUser(context: McpContext) {
  const requestState = await (
    await getClerk()
  ).authenticateRequest(context.request, {
    acceptsToken: ["oauth_token"],
  });
  const authObject = requestState.toAuth();
  const clerkUserId =
    authObject?.isAuthenticated === true && "userId" in authObject
      ? authObject.userId
      : null;
  const scopes =
    authObject?.isAuthenticated === true && "scopes" in authObject
      ? authObject.scopes
      : [];
  const clientId =
    authObject?.isAuthenticated === true && "clientId" in authObject
      ? authObject.clientId
      : null;
  const expectedClientId = getExpectedMcpOAuthClientId();
  if (
    !clerkUserId ||
    !expectedClientId ||
    clientId !== expectedClientId ||
    !Array.isArray(scopes) ||
    !scopes.includes(REQUIRED_PRIVATE_OAUTH_SCOPE)
  ) {
    throw new McpAuthRequiredError();
  }

  const user = await context.readDb.user.findUnique({
    where: { clerkUserId },
    select: { id: true, clerkUserId: true },
  });
  if (!user) {
    throw new McpError(
      "No Daylily Catalog user exists for this Clerk user.",
      -32001,
    );
  }

  return user;
}

function mcpAuthRequiredResult(baseUrl: string) {
  return {
    content: [
      {
        type: "text",
        text: "Authentication required: connect Daylily Catalog to continue.",
      },
    ],
    isError: true,
    _meta: {
      "mcp/www_authenticate": [
        `Bearer resource_metadata="${baseUrl}/.well-known/oauth-protected-resource", scope="${REQUIRED_PRIVATE_OAUTH_SCOPE}", error="insufficient_scope", error_description="Connect Daylily Catalog to continue"`,
      ],
    },
  };
}

async function callTool(context: McpContext, name: string, input: unknown) {
  const args = parseObject(input);

  switch (name) {
    case "daylily.search_cultivars": {
      const parsed = searchCultivarsSchema.parse(args);
      const results = await searchCultivars({
        baseUrl: context.baseUrl,
        color: parsed.color,
        cultivarName: parsed.cultivarName,
        hybridizer: parsed.hybridizer,
        limit: parsed.limit,
        parentage: parsed.parentage,
        q: parsed.q,
      });
      return mcpResult({ results });
    }

    case "daylily.get_cultivar": {
      const parsed = getCultivarSchema.parse(args);
      if (!parsed.cultivarReferenceId && !parsed.normalizedName) {
        throw new McpError(
          "Provide cultivarReferenceId or normalizedName.",
          -32602,
        );
      }

      const cultivarReference =
        await context.readDb.cultivarReference.findFirst({
          where: parsed.cultivarReferenceId
            ? { id: parsed.cultivarReferenceId }
            : { normalizedName: parsed.normalizedName },
          select: cultivarReferenceSelect,
        });
      if (!cultivarReference) {
        throw new McpError("Cultivar not found.", -32004);
      }

      return mcpResult({
        cultivar: serializeCultivarReference(
          cultivarReference,
          context.baseUrl,
        ),
      });
    }

    case "daylily.search_public_listings": {
      const parsed = publicListingSearchSchema.parse(args);
      const rows = await context.readDb.listing.findMany({
        where: await buildPublicListingWhere(parsed),
        select: publicListingSelect,
        orderBy: { id: "asc" },
        take: parsed.limit + 1,
      });
      const items = rows
        .slice(0, parsed.limit)
        .map((listing) => buildPublicListingDetail(listing));
      return mcpResult({
        items,
        nextCursor: rows.length > parsed.limit ? items.at(-1)?.id : null,
      });
    }

    case "daylily.get_public_listing": {
      const parsed = publicListingSchema.parse(args);
      const listing = await getPublicMcpListingDetail(context, parsed);
      return mcpResult({ listing });
    }

    case "daylily.get_public_profile": {
      const parsed = publicProfileSchema.parse(args);
      await getPublicMcpUserId(parsed.sellerSlug);
      const profile = await getPublicProfile(parsed.sellerSlug);
      return mcpResult({ profile });
    }

    case "daylily.list_public_profile_lists": {
      const parsed = publicProfileSchema.parse(args);
      const userId = await getPublicMcpUserId(parsed.sellerSlug);
      const items = await getPublicSellerListSummaries(userId);
      return mcpResult({ items, nextCursor: null });
    }

    case "daylily.list_public_listings": {
      const parsed = publicListingSearchSchema.parse(args);
      if (!parsed.sellerSlug) {
        throw new McpError("sellerSlug is required.", -32602);
      }
      const rows = await context.readDb.listing.findMany({
        where: await buildPublicListingWhere(parsed),
        select: publicListingSelect,
        orderBy: { id: "asc" },
        take: parsed.limit + 1,
      });
      const items = rows
        .slice(0, parsed.limit)
        .map((listing) => buildPublicListingDetail(listing));
      return mcpResult({
        items,
        nextCursor: rows.length > parsed.limit ? items.at(-1)?.id : null,
      });
    }

    case "daylily.get_profile": {
      const user = await requireMcpUser(context);
      const profile = await context.readDb.userProfile.findUnique({
        where: { userId: user.id },
        select: {
          id: true,
          title: true,
          slug: true,
          logoUrl: true,
          description: true,
          content: true,
          location: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return mcpResult({
        profile: profile
          ? {
              ...profile,
              createdAt: serializeDate(profile.createdAt),
              updatedAt: serializeDate(profile.updatedAt),
            }
          : null,
      });
    }

    case "daylily.list_lists": {
      const user = await requireMcpUser(context);
      const parsed = listSchema.parse(args);
      const rows = await context.readDb.list.findMany({
        where: {
          userId: user.id,
          ...(parsed.cursor ? { id: { gt: parsed.cursor } } : {}),
        },
        select: listSelect,
        orderBy: { id: "asc" },
        take: parsed.limit + 1,
      });
      const items = rows.slice(0, parsed.limit).map(serializeList);
      return mcpResult({
        items,
        nextCursor: rows.length > parsed.limit ? items.at(-1)?.id : null,
      });
    }

    case "daylily.get_list": {
      const user = await requireMcpUser(context);
      const parsed = getByIdSchema.parse(args);
      const list = await context.readDb.list.findFirst({
        where: { id: parsed.id, userId: user.id },
        select: listSelect,
      });
      if (!list) {
        throw new McpError("List not found.", -32004);
      }
      return mcpResult({ list: serializeList(list) });
    }

    case "daylily.list_listings": {
      const user = await requireMcpUser(context);
      const parsed = listListingsSchema.parse(args);
      const rows = await context.readDb.listing.findMany({
        where: buildListingWhere(user.id, parsed),
        select: listingSelect,
        orderBy: { id: "asc" },
        take: parsed.limit + 1,
      });
      const items = rows
        .slice(0, parsed.limit)
        .map((listing) => serializeListing(listing, context.baseUrl));
      return mcpResult({
        items,
        nextCursor: rows.length > parsed.limit ? items.at(-1)?.id : null,
      });
    }

    case "daylily.get_listing": {
      const user = await requireMcpUser(context);
      const parsed = getByIdSchema.parse(args);
      const listing = await context.readDb.listing.findFirst({
        where: { id: parsed.id, userId: user.id },
        select: listingSelect,
      });
      if (!listing) {
        throw new McpError("Listing not found.", -32004);
      }
      return mcpResult({
        listing: serializeListing(listing, context.baseUrl),
      });
    }

    default:
      throw new McpError(`Unknown tool: ${name}`, -32602);
  }
}

function jsonRpcSuccess(id: JsonRpcRequest["id"], result: unknown) {
  return {
    jsonrpc: "2.0",
    id,
    result,
  };
}

function jsonRpcError(id: JsonRpcRequest["id"], error: unknown) {
  const normalized =
    error instanceof McpError
      ? {
          code: error.code,
          message: error.message,
          data: error.data,
        }
      : error instanceof z.ZodError
        ? {
            code: -32602,
            message: "Invalid tool arguments.",
            data: z.treeifyError(error),
          }
        : {
            code: -32603,
            message: error instanceof Error ? error.message : "Internal error.",
          };

  return {
    jsonrpc: "2.0",
    id,
    error: normalized,
  };
}

function isSupportedMcpProtocolVersion(version: string) {
  return SUPPORTED_MCP_PROTOCOL_VERSIONS.includes(
    version as (typeof SUPPORTED_MCP_PROTOCOL_VERSIONS)[number],
  );
}

function isJsonRpcResponse(payload: unknown) {
  const item = parseObject(payload);
  return (
    item.jsonrpc === "2.0" &&
    item.method === undefined &&
    item.id !== undefined &&
    (item.result !== undefined || item.error !== undefined)
  );
}

function validateMcpProtocolVersion(request: Request) {
  const version = request.headers.get("mcp-protocol-version");
  if (version && !isSupportedMcpProtocolVersion(version)) {
    return Response.json(
      jsonRpcError(null, new McpError("Unsupported MCP protocol version.", -32600)),
      { status: 400 },
    );
  }

  return null;
}

function validateMcpOrigin(request: Request, baseUrl: string) {
  const origin = request.headers.get("origin");
  if (!origin) return null;

  try {
    if (new URL(origin).origin === new URL(baseUrl).origin) {
      return null;
    }
  } catch {
    // Fall through to forbidden.
  }

  return Response.json(
    jsonRpcError(null, new McpError("Invalid Origin header.", -32600)),
    { status: 403 },
  );
}

async function handleJsonRpcRequest(
  request: JsonRpcRequest,
  context: McpContext,
) {
  if (request.jsonrpc !== "2.0" || !request.method) {
    throw new McpError("Invalid JSON-RPC request.", -32600);
  }

  switch (request.method) {
    case "initialize": {
      const params = parseObject(request.params);
      const requestedProtocolVersion =
        typeof params.protocolVersion === "string"
          ? params.protocolVersion
          : null;
      const protocolVersion =
        requestedProtocolVersion &&
        isSupportedMcpProtocolVersion(requestedProtocolVersion)
          ? requestedProtocolVersion
          : MCP_PROTOCOL_VERSION;

      return {
        protocolVersion,
        capabilities: { tools: {} },
        serverInfo: {
          name: MCP_SERVER_NAME,
          version: MCP_SERVER_VERSION,
        },
      };
    }

    case "tools/list":
      return { tools };

    case "tools/call": {
      const params = parseObject(request.params);
      const name = typeof params.name === "string" ? params.name : "";
      try {
        return await callTool(context, name, params.arguments);
      } catch (error) {
        if (error instanceof McpAuthRequiredError) {
          return mcpAuthRequiredResult(context.baseUrl);
        }
        throw error;
      }
    }

    case "notifications/initialized":
      return undefined;

    default:
      throw new McpError(`Method not found: ${request.method}`, -32601);
  }
}

export function getMcpServerCard(baseUrl: string) {
  return {
    schema_version: "0.1",
    serverInfo: {
      name: MCP_SERVER_NAME,
      title: "Daylily Catalog",
      version: MCP_SERVER_VERSION,
      description:
        "Read-only MCP tools for Daylily Catalog cultivar data and authenticated catalog dashboard reads.",
    },
    transports: [
      {
        type: "streamable-http",
        url: `${baseUrl}/api/mcp/server`,
      },
    ],
    capabilities: {
      tools: tools.map((tool) => ({
        name: tool.name,
        title: tool.title,
        description: tool.description,
        securitySchemes: tool.securitySchemes,
        readOnly: tool.annotations?.readOnlyHint === true,
      })),
    },
    authentication: {
      type: "oauth2",
      protectedResourceMetadata: `${baseUrl}/.well-known/oauth-protected-resource`,
      note: "Public cultivar tools do not require authentication. User catalog tools require Clerk OAuth bearer tokens.",
    },
  };
}

export async function handleMcpRequest(request: Request) {
  const baseUrl = getTrustedBaseUrl(request);
  const originError = validateMcpOrigin(request, baseUrl);
  if (originError) return originError;

  const protocolVersionError = validateMcpProtocolVersion(request);
  if (protocolVersionError) return protocolVersionError;

  let payload: unknown;
  const authRequest = request.clone();
  try {
    payload = await request.json();
  } catch {
    return Response.json(
      jsonRpcError(null, new McpError("Invalid JSON.", -32700)),
      {
        status: 400,
      },
    );
  }

  if (Array.isArray(payload)) {
    return Response.json(
      jsonRpcError(
        null,
        new McpError("Batched JSON-RPC requests are not supported.", -32600),
      ),
      { status: 400 },
    );
  }

  if (isJsonRpcResponse(payload)) {
    return new Response(null, { status: 202 });
  }

  const context: McpContext = {
    baseUrl,
    request: authRequest,
    readDb: replicaDb ?? db,
  };

  const rpcRequest = payload as JsonRpcRequest;
  if (rpcRequest.id === undefined) {
    try {
      await handleJsonRpcRequest(rpcRequest, context);
      return new Response(null, { status: 202 });
    } catch (error) {
      return Response.json(jsonRpcError(null, error), { status: 400 });
    }
  }

  let responseBody: ReturnType<typeof jsonRpcSuccess> | ReturnType<typeof jsonRpcError>;
  try {
    const result = await handleJsonRpcRequest(rpcRequest, context);
    responseBody = jsonRpcSuccess(rpcRequest.id, result);
  } catch (error) {
    responseBody = jsonRpcError(rpcRequest.id, error);
  }

  return Response.json(responseBody, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}
