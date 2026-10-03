import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getTrustedBaseUrl } from "@/lib/agent-readiness";
import {
  getOwnedMemberListingDetail,
  type MemberListingDetail,
} from "@/server/services/member-listing-read";
import {
  getPublicCultivarReference,
  serializeCultivarDisplay,
  serializeCultivarReference,
} from "@/server/services/public-cultivar-reference";
import { getOwnedMemberProfile } from "@/server/services/member-profile-read";
import {
  MEMBER_IMAGE_DETAIL_LIMIT,
  MEMBER_IMAGE_PAGE_LIMIT,
  pageOwnedMemberImages,
} from "@/server/services/member-image-read";
import { getOwnedDashboardImage } from "@/server/api/routers/dashboard-db/image";
import {
  getOwnedMemberListDetail,
  pageOwnedMemberLists,
} from "@/server/services/member-list-read";
import {
  getMemberDashboardHandoff,
  memberDashboardHandoffSchema,
} from "@/server/services/member-dashboard-handoff";
import {
  memberListingSearchSchema,
  searchOwnedMemberListings,
} from "@/server/services/member-listing-search";
import {
  publicListingSearchSchema,
  searchPublicListings,
} from "@/server/services/public-listing-search";
import {
  pagePublicProfiles,
  publicProfilePageSchema,
} from "@/server/services/public-profile-search";
import { toCultivarRouteSegment } from "@/lib/utils/cultivar-utils";
import { db, hasLocalPublicReadDb, publicDb } from "@/server/db";
import {
  type buildPublicListingDetail,
  getPublicListingDetail,
} from "@/server/db/public-listing-read-model";
import {
  getListingIdFromSlugOrId,
  getPublicProfile,
  type getPublicProfileByUserId,
  getPublicSellerListSummaries,
  getUserIdFromSlugOrId,
} from "@/server/db/public-seller-read-model";
import { getScopedOAuthClient } from "@/server/api/member-oauth";
import { getClerkUserData } from "@/server/clerk/sync-user";
import {
  DEFAULT_LIMIT,
  MAX_LIMIT,
  MEMBER_MAX_LIMIT,
} from "@/server/mcp/read-only-mcp-schema-builders";
import { buildReadOnlyMcpTools } from "@/server/mcp/read-only-mcp-tools";
import {
  memberWriteMcpTools,
  memberWriteMcpToolNames,
} from "@/server/mcp/member-write-mcp-tools";
import {
  callMemberWriteTool,
  validateMemberWriteToolInput,
} from "@/server/mcp/member-write-mcp";
import { getStripeSubscriptionResult } from "@/server/stripe/sync-subscription";
import { hasActiveSubscription } from "@/server/stripe/subscription-utils";
import { searchMemberHelp } from "@/server/mcp/member-help";
import type {
  JsonRpcRequest,
  McpContext,
} from "@/server/mcp/read-only-mcp-types";
import { searchCultivars } from "@/server/search/cultivar-search";
import { consumeMemberRequestBudget } from "@/server/security/member-request-budget";

const MCP_PROTOCOL_VERSION = "2025-11-25";
const SUPPORTED_MCP_PROTOCOL_VERSIONS = [
  "2025-11-25",
  "2025-06-18",
  "2025-03-26",
] as const;
const MCP_SERVER_NAME = "daylily-catalog";
const MCP_SERVER_VERSION = "0.1.0";
const MAX_MCP_REQUEST_BYTES = 128 * 1024;

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
  constructor(
    readonly scope = "catalog:read",
    readonly status: 401 | 403 = 401,
    readonly reason:
      | "unauthenticated"
      | "insufficient_scope"
      | "wrong_client" = "unauthenticated",
  ) {
    super("Authentication required.");
  }
}

const REQUIRED_PRIVATE_OAUTH_SCOPE = "catalog:read";
const REQUIRED_WRITE_OAUTH_SCOPE = "catalog:write";
const tools = [
  ...buildReadOnlyMcpTools([REQUIRED_PRIVATE_OAUTH_SCOPE]),
  ...memberWriteMcpTools,
];
const PUBLIC_DATABASE_TOOLS = new Set([
  "daylily.get_cultivar",
  "daylily.search_public_listings",
  "daylily.get_public_listing",
  "daylily.list_public_profiles",
  "daylily.get_public_profile",
  "daylily.list_public_profile_lists",
  "daylily.list_public_listings",
]);

function availableTools(localPublicReadDb: boolean) {
  return localPublicReadDb
    ? tools
    : tools.filter((tool) => !PUBLIC_DATABASE_TOOLS.has(tool.name));
}

const limitSchema = z
  .number()
  .int()
  .min(1)
  .max(MAX_LIMIT)
  .optional()
  .default(DEFAULT_LIMIT);

const boundedIdSchema = z.string().trim().min(1).max(128);
const boundedSearchTextSchema = z.string().trim().min(1).max(200);
const optionalCursorSchema = boundedIdSchema.optional();

const listSchema = z.strictObject({
  cursor: optionalCursorSchema,
  limit: limitSchema,
});
const emptyInputSchema = z.strictObject({});

const memberLimitSchema = z
  .number()
  .int()
  .min(1)
  .max(MEMBER_MAX_LIMIT)
  .optional()
  .default(DEFAULT_LIMIT);

const memberListSchema = listSchema.extend({
  limit: memberLimitSchema,
  listingId: boundedIdSchema.optional(),
});

const searchCultivarsSchema = z.strictObject({
  q: boundedSearchTextSchema.optional(),
  cultivarName: boundedSearchTextSchema.optional(),
  hybridizer: boundedSearchTextSchema.optional(),
  color: boundedSearchTextSchema.optional(),
  parentage: boundedSearchTextSchema.optional(),
  limit: limitSchema,
});

const publicProfileSchema = z.strictObject({
  sellerSlug: boundedIdSchema,
});

const publicListingSchema = z
  .strictObject({
    id: boundedIdSchema.optional(),
    listingSlug: boundedIdSchema.optional(),
    sellerSlug: boundedIdSchema.optional(),
  })
  .refine(
    (input) => Boolean(input.id ?? (input.sellerSlug && input.listingSlug)),
    {
      message: "Provide id or sellerSlug plus listingSlug.",
    },
  );

const getCultivarSchema = z
  .strictObject({
    cultivarReferenceId: boundedIdSchema.optional(),
    normalizedName: boundedSearchTextSchema.optional(),
  })
  .refine(
    (input) =>
      Number(Boolean(input.cultivarReferenceId)) +
        Number(Boolean(input.normalizedName)) ===
      1,
    { message: "Provide one cultivarReferenceId or normalizedName." },
  );

const getByIdSchema = z.strictObject({
  id: boundedIdSchema,
});
const getImageSchema = z.strictObject({
  type: z.enum(["listing", "profile"]),
  referenceId: boundedIdSchema,
  imageId: boundedIdSchema,
});
const listImagesSchema = getImageSchema.omit({ imageId: true }).extend({
  cursor: boundedIdSchema.optional(),
  limit: z
    .number()
    .int()
    .min(1)
    .max(MEMBER_IMAGE_PAGE_LIMIT)
    .optional()
    .default(MEMBER_IMAGE_DETAIL_LIMIT),
});

const helpSearchSchema = z
  .object({ query: z.string().trim().min(2).max(200) })
  .strict();

function mcpResult(payload: unknown) {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(payload),
      },
    ],
    structuredContent: payload,
  };
}

function mcpToolError(error: unknown) {
  let code = "INTERNAL_ERROR";
  let message = "The tool could not complete the request.";
  if (error instanceof z.ZodError) {
    code = "INVALID_ARGUMENTS";
    message = error.issues
      .slice(0, 3)
      .map(
        (issue) => `${issue.path.join(".") || "arguments"}: ${issue.message}`,
      )
      .join("; ");
  } else if (error instanceof McpError) {
    code =
      error.code === -32004
        ? "NOT_FOUND"
        : error.code === -32009
          ? "CONFLICT"
          : error.code === -32602
            ? "INVALID_ARGUMENTS"
            : error.code === -32003
              ? "FORBIDDEN"
              : error.code === -32029
                ? "RATE_LIMITED"
                : "TOOL_ERROR";
    message = error.message;
  } else if (error instanceof TRPCError) {
    code = error.code;
    message = error.message;
  } else {
    console.error("Unexpected MCP error:", error);
  }
  return {
    content: [{ type: "text", text: `${code}: ${message}` }],
    structuredContent: { error: { code, message } },
    isError: true,
  };
}

function parseObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function serializeDate(value: Date | string | null | undefined) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : value;
}

function serializeImage(image: {
  id: string;
  order?: number | null;
  status?: string | null;
  updatedAt?: Date | string | null;
  url: string;
}) {
  return {
    id: image.id,
    url: image.url,
    ...(image.order !== undefined ? { order: image.order } : {}),
    ...(image.status !== undefined ? { status: image.status } : {}),
    ...(image.updatedAt !== undefined
      ? { updatedAt: serializeDate(image.updatedAt) }
      : {}),
  };
}

function serializePublicListing(
  listing: ReturnType<typeof buildPublicListingDetail>,
  baseUrl: string,
) {
  const sellerSlug = listing.userSlug ?? listing.userId;
  const cultivarSegment = listing.cultivarReference?.normalizedName
    ? toCultivarRouteSegment(listing.cultivarReference.normalizedName)
    : null;

  return {
    id: listing.id,
    title: listing.title,
    slug: listing.slug,
    canonicalUrl:
      sellerSlug && listing.slug
        ? `${baseUrl}/${sellerSlug}/${listing.slug}`
        : null,
    description: listing.description,
    price: listing.price,
    updatedAt: serializeDate(listing.updatedAt),
    seller: {
      slug: listing.userSlug,
      title: listing.sellerTitle,
    },
    lists: listing.lists.map((list) => ({
      id: list.id,
      title: list.title,
    })),
    cultivar: listing.cultivarReference
      ? {
          id: listing.cultivarReference.id,
          normalizedName: listing.cultivarReference.normalizedName,
          canonicalUrl: cultivarSegment
            ? `${baseUrl}/cultivar/${cultivarSegment}`
            : null,
          display: serializeCultivarDisplay(
            listing.ahsListing,
            listing.cultivarReferenceImage?.url ?? null,
          ),
        }
      : null,
    images: listing.images.map(serializeImage),
  };
}

function serializePublicProfile(
  profile: Awaited<ReturnType<typeof getPublicProfileByUserId>>,
) {
  return {
    id: profile.id,
    title: profile.title,
    slug: profile.slug,
    description: profile.description,
    content: profile.content,
    location: profile.location,
    images: profile.images.map(serializeImage),
    createdAt: serializeDate(profile.createdAt),
    updatedAt: serializeDate(profile.updatedAt),
    listingCount: profile.listingCount,
    listCount: profile.listCount,
    lists: profile.lists.map((list) => ({
      id: list.id,
      title: list.title,
      description: list.description,
      listingCount: list.listingCount,
    })),
  };
}

function serializeListing(listing: MemberListingDetail, baseUrl: string) {
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
    images: listing.images.map(serializeImage),
    imagesHasMore: listing.imagesHasMore,
    lists: listing.lists.map((list) => ({
      id: list.id,
      title: list.title,
    })),
    listsNextCursor: listing.listsNextCursor,
    dashboardUrl: new URL(
      `/dashboard/listings?editing=${encodeURIComponent(listing.id)}`,
      baseUrl,
    ).toString(),
    deleteReviewUrl: new URL(
      `/dashboard/listings?editing=${encodeURIComponent(listing.id)}&intent=delete`,
      baseUrl,
    ).toString(),
  };
}

function serializeList(
  list: NonNullable<Awaited<ReturnType<typeof getOwnedMemberListDetail>>>,
  baseUrl: string,
) {
  return {
    id: list.id,
    title: list.title,
    description: list.description,
    status: list.status,
    hasMembers: list.hasMembers,
    createdAt: serializeDate(list.createdAt),
    updatedAt: serializeDate(list.updatedAt),
    dashboardUrl: new URL(
      `/dashboard/lists?editing=${encodeURIComponent(list.id)}`,
      baseUrl,
    ).toString(),
    deleteReviewUrl: !list.hasMembers
      ? new URL(
          `/dashboard/lists?editing=${encodeURIComponent(list.id)}&intent=delete`,
          baseUrl,
        ).toString()
      : null,
  };
}

async function mcpLookup<T>(operation: Promise<T>, notFoundMessage: string) {
  try {
    return await operation;
  } catch (error) {
    if (error instanceof TRPCError && error.code === "NOT_FOUND") {
      throw new McpError(notFoundMessage, -32004);
    }
    throw error;
  }
}

async function requireMcpUser(
  context: McpContext,
  requiredScope:
    | "catalog:read"
    | "catalog:write" = REQUIRED_PRIVATE_OAUTH_SCOPE,
) {
  let client: Awaited<ReturnType<typeof getScopedOAuthClient>>;
  try {
    client = await getScopedOAuthClient(context.request, requiredScope);
  } catch {
    throw new McpAuthRequiredError(requiredScope);
  }
  if (client.status === "unauthenticated") {
    throw new McpAuthRequiredError(requiredScope);
  }
  if (client.status === "insufficient_scope") {
    throw new McpAuthRequiredError(requiredScope, 403, "insufficient_scope");
  }
  const expectedClientId = process.env.DAYLILY_MCP_OAUTH_CLIENT_ID?.trim();
  if (!expectedClientId || client.clientId !== expectedClientId) {
    throw new McpAuthRequiredError(requiredScope, 403, "wrong_client");
  }
  if (!consumeMemberRequestBudget(client.clientId, client.clerkUserId)) {
    throw new McpError(
      "Member request limit reached. Retry in 60 seconds.",
      -32029,
    );
  }

  const user = await context.memberDb.user.findUnique({
    where: { clerkUserId: client.clerkUserId },
  });
  if (!user) {
    throw new McpError(
      "No Daylily Catalog user exists for this Clerk user.",
      -32001,
    );
  }

  return {
    ...user,
    clerkUserId: client.clerkUserId,
    oauthClientId: client.clientId,
  };
}

function mcpAuthChallenge(baseUrl: string, error: McpAuthRequiredError) {
  return `Bearer resource_metadata="${baseUrl}/.well-known/oauth-protected-resource", scope="${error.scope}"${error.reason === "insufficient_scope" ? ', error="insufficient_scope"' : ""}`;
}

function mcpAuthRequiredResult(baseUrl: string, error: McpAuthRequiredError) {
  return {
    content: [
      {
        type: "text",
        text: "Authentication required: connect Daylily Catalog to continue.",
      },
    ],
    isError: true,
    _meta: {
      "mcp/www_authenticate": [mcpAuthChallenge(baseUrl, error)],
    },
  };
}

async function callTool(context: McpContext, name: string, input: unknown) {
  const args = parseObject(input);

  if (memberWriteMcpToolNames.has(name)) {
    validateMemberWriteToolInput(name, input);
    const user = await requireMcpUser(context, REQUIRED_WRITE_OAUTH_SCOPE);
    const subscription = await getStripeSubscriptionResult(
      user.stripeCustomerId,
    );
    if (
      !subscription.confirmed ||
      !hasActiveSubscription(subscription.subscription.status)
    ) {
      throw new McpError(
        "An active membership is required for dashboard writes.",
        -32003,
      );
    }
    try {
      const authUser = {
        ...user,
        clerk: await getClerkUserData(user.clerkUserId),
      };
      return mcpResult(
        await callMemberWriteTool(
          context,
          name,
          input,
          authUser,
          user.oauthClientId,
        ),
      );
    } catch (error) {
      if (error instanceof TRPCError) {
        const code =
          error.code === "NOT_FOUND"
            ? -32004
            : error.code === "CONFLICT"
              ? -32009
              : error.code === "BAD_REQUEST"
                ? -32602
                : -32003;
        throw new McpError(error.message, code);
      }
      throw error;
    }
  }

  if (PUBLIC_DATABASE_TOOLS.has(name) && !context.hasLocalPublicReadDb) {
    throw new McpError(
      "Public catalog data is unavailable on this server.",
      -32003,
    );
  }

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
      const cultivarReference = await getPublicCultivarReference({
        database: context.publicDb,
        cultivarReferenceId: parsed.cultivarReferenceId,
        normalizedName: parsed.normalizedName,
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
      const page = await searchPublicListings({
        database: context.publicDb,
        input: parsed,
      });
      return mcpResult({
        items: page.items.map((listing) =>
          serializePublicListing(listing, context.baseUrl),
        ),
        nextCursor: page.nextCursor,
      });
    }

    case "daylily.get_public_listing": {
      const parsed = publicListingSchema.parse(args);
      const listingId =
        parsed.id ??
        (await mcpLookup(
          getUserIdFromSlugOrId(parsed.sellerSlug!).then((userId) =>
            getListingIdFromSlugOrId(parsed.listingSlug!, userId),
          ),
          "Listing not found.",
        ));
      if (!listingId) throw new McpError("Listing not found.", -32004);
      const listing = await mcpLookup(
        getPublicListingDetail(listingId),
        "Listing not found.",
      );
      return mcpResult({
        listing: serializePublicListing(listing, context.baseUrl),
      });
    }

    case "daylily.get_public_profile": {
      const parsed = publicProfileSchema.parse(args);
      const profile = await mcpLookup(
        getPublicProfile(parsed.sellerSlug),
        "Public catalog not found.",
      );
      return mcpResult({ profile: serializePublicProfile(profile) });
    }

    case "daylily.list_public_profiles": {
      const parsed = publicProfilePageSchema.parse(args);
      return mcpResult(
        await pagePublicProfiles({
          database: context.publicDb,
          input: parsed,
        }),
      );
    }

    case "daylily.list_public_profile_lists": {
      const parsed = publicProfileSchema.parse(args);
      const userId = await mcpLookup(
        getUserIdFromSlugOrId(parsed.sellerSlug),
        "Public catalog not found.",
      );
      const items = await getPublicSellerListSummaries(userId);
      return mcpResult({ items, nextCursor: null });
    }

    case "daylily.list_public_listings": {
      const parsed = publicListingSearchSchema.parse(args);
      if (!parsed.sellerSlug) {
        throw new McpError("sellerSlug is required.", -32602);
      }
      const page = await searchPublicListings({
        database: context.publicDb,
        input: parsed,
      });
      return mcpResult({
        items: page.items.map((listing) =>
          serializePublicListing(listing, context.baseUrl),
        ),
        nextCursor: page.nextCursor,
      });
    }

    case "daylily.search_help": {
      const { query } = helpSearchSchema.parse(args);
      return mcpResult({ results: searchMemberHelp(query, context.baseUrl) });
    }

    case "daylily.get_profile": {
      emptyInputSchema.parse(args);
      const user = await requireMcpUser(context);
      const profile = await getOwnedMemberProfile(context.memberDb, user.id);

      return mcpResult({
        profile: profile
          ? {
              ...profile,
              createdAt: serializeDate(profile.createdAt),
              updatedAt: serializeDate(profile.updatedAt),
              images: profile.images.map(serializeImage),
            }
          : null,
      });
    }

    case "daylily.list_lists": {
      const parsed = memberListSchema.parse(args);
      const user = await requireMcpUser(context);
      const page = await pageOwnedMemberLists({
        database: context.memberDb,
        userId: user.id,
        ...parsed,
      });
      const items = page.items.map((list) => ({
        id: list.id,
        title: list.title,
        description: list.description,
        status: list.status,
        updatedAt: serializeDate(list.updatedAt),
        dashboardUrl: new URL(
          `/dashboard/lists?editing=${encodeURIComponent(list.id)}`,
          context.baseUrl,
        ).toString(),
      }));
      return mcpResult({
        items,
        nextCursor: page.nextCursor,
      });
    }

    case "daylily.get_list": {
      const parsed = getByIdSchema.parse(args);
      const user = await requireMcpUser(context);
      const list = await getOwnedMemberListDetail({
        database: context.memberDb,
        id: parsed.id,
        userId: user.id,
      });
      if (!list) {
        throw new McpError("List not found.", -32004);
      }
      return mcpResult({
        list: serializeList(list, context.baseUrl),
      });
    }

    case "daylily.list_listings": {
      const parsed = memberListingSearchSchema.parse(args);
      const user = await requireMcpUser(context);
      const page = await searchOwnedMemberListings({
        database: context.memberDb,
        input: parsed,
        userId: user.id,
      });
      const items = page.items.map((listing) => ({
        id: listing.id,
        title: listing.title,
        slug: listing.slug,
        price: listing.price,
        status: listing.status,
        cultivarReferenceId: listing.cultivarReferenceId,
        updatedAt: serializeDate(listing.updatedAt),
        hasPhoto: listing.hasPhoto,
        dashboardUrl: new URL(
          `/dashboard/listings?editing=${encodeURIComponent(listing.id)}`,
          context.baseUrl,
        ).toString(),
      }));
      return mcpResult({
        items,
        nextCursor: page.nextCursor,
      });
    }

    case "daylily.get_listing": {
      const parsed = getByIdSchema.parse(args);
      const user = await requireMcpUser(context);
      const listing = await getOwnedMemberListingDetail({
        id: parsed.id,
        memberDb: context.memberDb,
        publicDb: context.hasLocalPublicReadDb ? context.publicDb : null,
        userId: user.id,
      });
      if (!listing) {
        throw new McpError("Listing not found.", -32004);
      }
      return mcpResult({
        listing: serializeListing(listing, context.baseUrl),
      });
    }

    case "daylily.list_images": {
      const input = listImagesSchema.parse(args);
      const user = await requireMcpUser(context);
      const page = await pageOwnedMemberImages({
        database: context.memberDb,
        userId: user.id,
        ...input,
      });
      return mcpResult({
        items: page.items.map(serializeImage),
        nextCursor: page.nextCursor,
      });
    }

    case "daylily.get_image": {
      const input = getImageSchema.parse(args);
      const user = await requireMcpUser(context);
      const image = await mcpLookup(
        getOwnedDashboardImage({
          db: context.memberDb,
          ...input,
          userId: user.id,
        }),
        "Image not found.",
      );
      return mcpResult({ image: serializeImage(image) });
    }

    case "daylily.open_dashboard": {
      const input = memberDashboardHandoffSchema.parse(args);
      const user = await requireMcpUser(context);
      let handoff;
      try {
        handoff = await getMemberDashboardHandoff({
          database: context.memberDb,
          userId: user.id,
          input,
        });
      } catch (error) {
        if (error instanceof TRPCError && error.code === "NOT_FOUND") {
          throw new McpError(error.message, -32004);
        }
        throw error;
      }
      return mcpResult({
        url: new URL(handoff.dashboardPath, context.baseUrl).toString(),
        destination: handoff.destination,
        title: handoff.title,
        canComplete: handoff.canComplete,
        nextStep: handoff.nextStep,
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

function internalJsonRpcError(error: unknown) {
  console.error("Unexpected MCP error:", error);
  return { code: -32603, message: "Internal error." };
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
        : internalJsonRpcError(error);

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
      jsonRpcError(
        null,
        new McpError("Unsupported MCP protocol version.", -32600),
      ),
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
      return { tools: availableTools(context.hasLocalPublicReadDb) };

    case "ping":
      return {};

    case "tools/call": {
      const params = parseObject(request.params);
      const name = typeof params.name === "string" ? params.name : "";
      if (!tools.some((tool) => tool.name === name)) {
        throw new McpError(`Unknown tool: ${name}`, -32602);
      }
      try {
        return await callTool(context, name, params.arguments);
      } catch (error) {
        if (error instanceof McpAuthRequiredError) throw error;
        return mcpToolError(error);
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
        "Public catalog reads and scoped member dashboard management tools.",
    },
    transports: [
      {
        type: "streamable-http",
        url: `${baseUrl}/api/mcp/server`,
      },
    ],
    capabilities: {
      tools: availableTools(hasLocalPublicReadDb).map((tool) => ({
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
      note: "Public data and help tools do not require authentication. Member reads require catalog:read scope. Member writes require catalog:write scope and active membership.",
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
  try {
    const contentLength = Number(request.headers.get("content-length"));
    if (contentLength > MAX_MCP_REQUEST_BYTES) {
      return Response.json(
        jsonRpcError(null, new McpError("Request too large.", -32600)),
        { status: 413 },
      );
    }

    const reader = request.body?.getReader();
    if (!reader) throw new SyntaxError("Missing JSON body.");
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_MCP_REQUEST_BYTES) {
        await reader.cancel();
        return Response.json(
          jsonRpcError(null, new McpError("Request too large.", -32600)),
          { status: 413 },
        );
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    payload = JSON.parse(new TextDecoder().decode(bytes));
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

  if (!payload || typeof payload !== "object") {
    return Response.json(
      jsonRpcError(null, new McpError("Invalid JSON-RPC request.", -32600)),
      { status: 400 },
    );
  }

  const context: McpContext = {
    baseUrl,
    request,
    publicDb,
    memberDb: db,
    hasLocalPublicReadDb,
  };

  const rpcRequest = payload as JsonRpcRequest;
  if (rpcRequest.id === undefined) {
    if (rpcRequest.method !== "notifications/initialized") {
      return Response.json(
        jsonRpcError(
          null,
          new McpError("A request id is required for this method.", -32600),
        ),
        { status: 400 },
      );
    }
    try {
      await handleJsonRpcRequest(rpcRequest, context);
      return new Response(null, { status: 202 });
    } catch (error) {
      return Response.json(jsonRpcError(null, error), { status: 400 });
    }
  }

  let responseBody:
    | ReturnType<typeof jsonRpcSuccess>
    | ReturnType<typeof jsonRpcError>;
  try {
    const result = await handleJsonRpcRequest(rpcRequest, context);
    responseBody = jsonRpcSuccess(rpcRequest.id, result);
  } catch (error) {
    if (error instanceof McpAuthRequiredError) {
      return Response.json(
        jsonRpcSuccess(rpcRequest.id, mcpAuthRequiredResult(baseUrl, error)),
        {
          status: error.status,
          headers: {
            "Cache-Control": "no-store",
            "WWW-Authenticate": mcpAuthChallenge(baseUrl, error),
          },
        },
      );
    }
    responseBody = jsonRpcError(rpcRequest.id, error);
  }

  return Response.json(responseBody, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}
