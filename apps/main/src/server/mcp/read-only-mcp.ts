import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { env } from "@/env";
import {
  getOAuthProtectedResourceScopes,
  getTrustedBaseUrl,
} from "@/lib/agent-readiness";
import {
  ahsDisplayAhsListingSelect,
  getDisplayAhsListing,
  v2AhsCultivarDisplaySelect,
} from "@/lib/utils/ahs-display";
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
import { searchCultivars } from "@/server/search/cultivar-search";

const MCP_PROTOCOL_VERSION = "2025-11-25";
const SUPPORTED_MCP_PROTOCOL_VERSIONS = [
  "2025-11-25",
  "2025-06-18",
  "2025-03-26",
] as const;
const MCP_SERVER_NAME = "daylily-catalog";
const MCP_SERVER_VERSION = "0.1.0";
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 500;

interface JsonRpcRequest {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: unknown;
}

interface McpTool {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  securitySchemes: Array<
    { type: "noauth" } | { type: "oauth2"; scopes: string[] }
  >;
  annotations?: {
    readOnlyHint?: boolean;
  };
  _meta?: Record<string, unknown>;
}

interface McpContext {
  baseUrl: string;
  request: Request;
  readDb: typeof db;
}

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
const PUBLIC_SECURITY_SCHEMES = [{ type: "noauth" }] as const;
const PRIVATE_SECURITY_SCHEMES = [
  { type: "oauth2", scopes: PRIVATE_OAUTH_SCOPES },
] as const;

function getExpectedMcpOAuthClientId() {
  const clientId = env.DAYLILY_MCP_OAUTH_CLIENT_ID?.trim();
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

const cultivarOutputSchema = {
  type: "object",
  additionalProperties: true,
  properties: {
    cultivar: { type: ["object", "null"], additionalProperties: true },
  },
};

const searchResultsOutputSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    results: {
      type: "array",
      items: { type: "object", additionalProperties: true },
    },
  },
  required: ["results"],
};

const profileOutputSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    profile: { type: ["object", "null"], additionalProperties: true },
  },
  required: ["profile"],
};

const paginatedOutputSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    items: {
      type: "array",
      items: { type: "object", additionalProperties: true },
    },
    nextCursor: { type: ["string", "null"] },
  },
  required: ["items", "nextCursor"],
};

const listOutputSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    list: { type: "object", additionalProperties: true },
  },
  required: ["list"],
};

const listingOutputSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    listing: { type: "object", additionalProperties: true },
  },
  required: ["listing"],
};

function toolMeta(invoking: string, invoked: string) {
  return {
    "openai/toolInvocation/invoking": invoking,
    "openai/toolInvocation/invoked": invoked,
  };
}

const tools: McpTool[] = [
  {
    name: "daylily.search_cultivars",
    title: "Search Cultivars",
    description:
      "Use this when the user wants to find public daylily cultivar reference records by name, hybridizer, color, parentage, or general search text. Do not use it to answer questions about a signed-in user's own inventory; use daylily.list_listings for that. Prefer specific fields over q when the user asks for a known facet.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        q: {
          type: "string",
          description:
            "Broad public cultivar search text. Prefer field-specific filters when the user asks for a specific facet.",
        },
        cultivarName: {
          type: "string",
          description: "Public cultivar name filter.",
        },
        hybridizer: {
          type: "string",
          description: "Public cultivar hybridizer name filter.",
        },
        color: {
          type: "string",
          description: "Public cultivar color-notes text filter.",
        },
        parentage: {
          type: "string",
          description: "Public cultivar parentage text filter.",
        },
        limit: {
          type: "integer",
          minimum: 1,
          maximum: MAX_LIMIT,
          default: DEFAULT_LIMIT,
        },
      },
    },
    outputSchema: searchResultsOutputSchema,
    securitySchemes: [...PUBLIC_SECURITY_SCHEMES],
    annotations: { readOnlyHint: true },
    _meta: toolMeta("Searching cultivars", "Cultivar search complete"),
  },
  {
    name: "daylily.get_cultivar",
    title: "Get Cultivar",
    description:
      "Use this when the user has a Daylily Catalog cultivarReferenceId or normalizedName and needs the exact public cultivar record. Do not use it for fuzzy search; call daylily.search_cultivars first.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        cultivarReferenceId: { type: "string" },
        normalizedName: { type: "string" },
      },
    },
    outputSchema: cultivarOutputSchema,
    securitySchemes: [...PUBLIC_SECURITY_SCHEMES],
    annotations: { readOnlyHint: true },
    _meta: toolMeta("Loading cultivar", "Cultivar loaded"),
  },
  {
    name: "daylily.search_public_listings",
    title: "Search Public Listings",
    description:
      "Use this when a buyer asks for public Daylily Catalog inventory, growers, prices, photos, or availability-style searches. Returns only public listings from active catalogs and never includes private notes or hidden listings. Prefer specific filters over q and follow nextCursor until null for complete result sets.",
    inputSchema: publicListingSearchInputSchema(),
    outputSchema: paginatedOutputSchema,
    securitySchemes: [...PUBLIC_SECURITY_SCHEMES],
    annotations: { readOnlyHint: true },
    _meta: toolMeta("Searching public listings", "Public listing search complete"),
  },
  {
    name: "daylily.get_public_listing",
    title: "Get Public Listing",
    description:
      "Use this when a buyer asks for one public listing by listing id, or by sellerSlug plus listingSlug. Returns public listing details only; hidden listings and private notes are excluded.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        id: { type: "string", description: "Public listing id." },
        sellerSlug: {
          type: "string",
          description: "Seller profile slug when using listingSlug.",
        },
        listingSlug: {
          type: "string",
          description: "Listing slug for the seller's public catalog.",
        },
      },
    },
    outputSchema: listingOutputSchema,
    securitySchemes: [...PUBLIC_SECURITY_SCHEMES],
    annotations: { readOnlyHint: true },
    _meta: toolMeta("Loading public listing", "Public listing loaded"),
  },
  {
    name: "daylily.get_public_profile",
    title: "Get Public Profile",
    description:
      "Use this when a buyer asks about a public grower or catalog profile by seller slug. Returns public seller profile, public lists, profile images, and public listing/list counts.",
    inputSchema: publicProfileInputSchema(),
    outputSchema: profileOutputSchema,
    securitySchemes: [...PUBLIC_SECURITY_SCHEMES],
    annotations: { readOnlyHint: true },
    _meta: toolMeta("Loading public profile", "Public profile loaded"),
  },
  {
    name: "daylily.list_public_profile_lists",
    title: "List Public Profile Lists",
    description:
      "Use this when a buyer asks what public lists or collections a seller has. Use the returned list ids with daylily.list_public_listings.",
    inputSchema: publicProfileInputSchema(),
    outputSchema: paginatedOutputSchema,
    securitySchemes: [...PUBLIC_SECURITY_SCHEMES],
    annotations: { readOnlyHint: true },
    _meta: toolMeta("Loading public lists", "Public lists loaded"),
  },
  {
    name: "daylily.list_public_listings",
    title: "List Public Listings",
    description:
      "Use this when a buyer asks to browse one seller's public catalog or one public list. Requires sellerSlug, and can filter by listId, listTitle, cultivar, color, price, photos, hybridizer, parentage, or year. Returns only public listings.",
    inputSchema: publicListingSearchInputSchema({ requireSellerSlug: true }),
    outputSchema: paginatedOutputSchema,
    securitySchemes: [...PUBLIC_SECURITY_SCHEMES],
    annotations: { readOnlyHint: true },
    _meta: toolMeta("Loading public listings", "Public listings loaded"),
  },
  {
    name: "daylily.get_profile",
    title: "Get Profile",
    description:
      "Use this when the signed-in user asks about their own Daylily Catalog profile, storefront copy, slug, logo, location, or public profile content. Requires OAuth.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {},
    },
    outputSchema: profileOutputSchema,
    securitySchemes: [...PRIVATE_SECURITY_SCHEMES],
    annotations: { readOnlyHint: true },
    _meta: toolMeta("Loading profile", "Profile loaded"),
  },
  {
    name: "daylily.list_lists",
    title: "List Lists",
    description:
      "Use this when the signed-in user asks to browse their catalog list records or when you need to resolve a human list name to an id before calling daylily.list_listings with listId. Returns list metadata and listing ids. Requires OAuth.",
    inputSchema: paginatedInputSchema(),
    outputSchema: paginatedOutputSchema,
    securitySchemes: [...PRIVATE_SECURITY_SCHEMES],
    annotations: { readOnlyHint: true },
    _meta: toolMeta("Loading lists", "Lists loaded"),
  },
  {
    name: "daylily.get_list",
    title: "Get List",
    description:
      "Use this when the signed-in user asks to inspect one of their catalog lists by id, including its description, status, and listing ids. For full listing records in a list, call daylily.list_listings with listId instead of expanding ids one by one. Requires OAuth.",
    inputSchema: idInputSchema(),
    outputSchema: listOutputSchema,
    securitySchemes: [...PRIVATE_SECURITY_SCHEMES],
    annotations: { readOnlyHint: true },
    _meta: toolMeta("Loading list", "List loaded"),
  },
  {
    name: "daylily.list_listings",
    title: "List Listings",
    description:
      "Use this when the signed-in user asks to search, filter, or page through their own listing records. Supports the dashboard's key advanced filters such as title, description, listId, status, price/photo availability, cultivar name, hybridizer, year, color, parentage, and bloom traits. Use the most selective filter arguments directly instead of scanning the full catalog. If the user names a list but you do not know its id, call daylily.list_lists first, then pass listId here. For complete catalog-wide summaries or facet-style searches, use limit 500 and repeat with the same filters plus nextCursor until nextCursor is null. Requires OAuth.",
    inputSchema: listingSearchInputSchema(),
    outputSchema: paginatedOutputSchema,
    securitySchemes: [...PRIVATE_SECURITY_SCHEMES],
    annotations: { readOnlyHint: true },
    _meta: toolMeta("Loading listings", "Listings loaded"),
  },
  {
    name: "daylily.get_listing",
    title: "Get Listing",
    description:
      "Use this when the signed-in user asks to inspect one exact listing by id, including private notes, images, linked cultivar data, and list membership. Do not use this for search or list expansion when daylily.list_listings can return the needed records in one paginated call. Requires OAuth.",
    inputSchema: idInputSchema(),
    outputSchema: listingOutputSchema,
    securitySchemes: [...PRIVATE_SECURITY_SCHEMES],
    annotations: { readOnlyHint: true },
    _meta: toolMeta("Loading listing", "Listing loaded"),
  },
];

tools.forEach((tool) => {
  tool._meta = {
    ...tool._meta,
    securitySchemes: tool.securitySchemes,
  };
});

function paginatedInputSchema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      cursor: {
        type: "string",
        description:
          "Last seen row id from nextCursor. Keep the same filters and pass this cursor to continue paging.",
      },
      limit: {
        type: "integer",
        minimum: 1,
        maximum: MAX_LIMIT,
        default: DEFAULT_LIMIT,
      },
    },
  };
}

function listingSearchInputSchema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      ...paginatedInputSchema().properties,
      bloomHabit: {
        type: "string",
        description: "Bloom habit facet value, such as Diurnal or Extended.",
      },
      bloomSeason: {
        type: "string",
        description: "Bloom season facet value, such as Early, Midseason, or Late.",
      },
      color: {
        type: "string",
        description:
          "Search linked cultivar color notes. This is better than q for requests like blue, purple eye, or green throat.",
      },
      cultivarName: {
        type: "string",
        description: "Linked cultivar name text, not listing title text.",
      },
      description: {
        type: "string",
        description: "Listing description text.",
      },
      foliageType: {
        type: "string",
        description: "Foliage type facet value.",
      },
      form: {
        type: "string",
        description: "Flower form facet value.",
      },
      fragrance: {
        type: "string",
        description: "Fragrance facet value.",
      },
      hasPhoto: {
        type: "boolean",
        description:
          "When true, only listings with uploaded listing photos. This does not mean the linked public cultivar reference has a photo.",
      },
      hasPrice: {
        type: "boolean",
        description:
          "When true, only listings with a positive price; when false, only listings without a positive price.",
      },
      hybridizer: {
        type: "string",
        description: "Hybridizer text from the linked cultivar record.",
      },
      linkedToCultivar: {
        type: "boolean",
        description:
          "When true, only listings linked to a cultivar; when false, only unlinked listings.",
      },
      listId: {
        type: "string",
        description:
          "Only listings that belong to this list id. If you only know the list name, call daylily.list_lists first.",
      },
      parentage: {
        type: "string",
        description: "Parentage text from the linked cultivar record.",
      },
      ploidy: {
        type: "string",
        description: "Ploidy facet value.",
      },
      priceMax: {
        type: "number",
        description: "Maximum listing price.",
      },
      priceMin: {
        type: "number",
        description: "Minimum listing price.",
      },
      q: {
        type: "string",
        description:
          "Broad text search across listing title, description, private note, cultivar name, hybridizer, color, and parentage. Prefer field-specific filters when the user asks for a specific facet.",
      },
      status: {
        type: "string",
        description: "Listing status value.",
      },
      title: {
        type: "string",
        description: "Listing title text.",
      },
      year: {
        type: "string",
        description:
          "Cultivar registration or introduction year text from the linked cultivar record, such as 2010.",
      },
    },
  };
}

function publicListingSearchInputSchema(options?: { requireSellerSlug?: boolean }) {
  return {
    type: "object",
    additionalProperties: false,
    required: options?.requireSellerSlug ? ["sellerSlug"] : [],
    properties: {
      ...paginatedInputSchema().properties,
      color: {
        type: "string",
        description: "Search linked cultivar color notes.",
      },
      cultivarName: {
        type: "string",
        description: "Linked cultivar name text.",
      },
      description: {
        type: "string",
        description: "Public listing description text.",
      },
      hasPhoto: {
        type: "boolean",
        description: "When true, only listings with uploaded listing photos.",
      },
      hasPrice: {
        type: "boolean",
        description: "When true, only listings with a positive public price.",
      },
      hybridizer: {
        type: "string",
        description: "Hybridizer text from the linked cultivar record.",
      },
      listId: {
        type: "string",
        description: "Only listings that belong to this public list id.",
      },
      listTitle: {
        type: "string",
        description: "Only listings in a public list with this title text.",
      },
      parentage: {
        type: "string",
        description: "Parentage text from the linked cultivar record.",
      },
      priceMax: {
        type: "number",
        description: "Maximum public listing price.",
      },
      priceMin: {
        type: "number",
        description: "Minimum public listing price.",
      },
      q: {
        type: "string",
        description:
          "Broad public listing search across listing title, description, cultivar name, hybridizer, color, and parentage.",
      },
      sellerSlug: {
        type: "string",
        description: "Public seller slug or user id.",
      },
      title: {
        type: "string",
        description: "Public listing title text.",
      },
      year: {
        type: "string",
        description: "Cultivar registration or introduction year text.",
      },
    },
  };
}

function publicProfileInputSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["sellerSlug"],
    properties: {
      sellerSlug: {
        type: "string",
        description: "Public seller profile slug or user id.",
      },
    },
  };
}

function idInputSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["id"],
    properties: {
      id: { type: "string" },
    },
  };
}

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
          imageUrl: ahsListing.ahsImageUrl,
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
