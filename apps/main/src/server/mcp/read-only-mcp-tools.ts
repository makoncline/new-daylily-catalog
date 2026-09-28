import type { McpTool } from "@/server/mcp/read-only-mcp-types";
import {
  cultivarOutputSchema,
  dashboardLinkOutputSchema,
  helpOutputSchema,
  memberImageOutputSchema,
  memberImagePageOutputSchema,
  memberListingOutputSchema,
  memberListingPageOutputSchema,
  memberListOutputSchema,
  memberListPageOutputSchema,
  memberProfileOutputSchema,
  idInputSchema,
  listingOutputSchema,
  listingSearchInputSchema,
  MEMBER_MAX_LIMIT,
  paginatedInputSchema,
  paginatedOutputSchema,
  profileOutputSchema,
  publicListingSearchInputSchema,
  publicProfileInputSchema,
  searchResultsOutputSchema,
  toolMeta,
  DEFAULT_LIMIT,
  MAX_LIMIT,
} from "@/server/mcp/read-only-mcp-schema-builders";

export const PUBLIC_SECURITY_SCHEMES = [
  { type: "noauth" },
] satisfies McpTool["securitySchemes"];

export const READ_ONLY_TOOL_ANNOTATIONS = {
  readOnlyHint: true,
  openWorldHint: false,
  destructiveHint: false,
} satisfies NonNullable<McpTool["annotations"]>;

export function buildReadOnlyMcpTools(privateScopes: string[]): McpTool[] {
  const privateSecuritySchemes = [
    { type: "oauth2", scopes: privateScopes },
  ] satisfies McpTool["securitySchemes"];

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
            maxLength: 200,
            description:
              "Broad public cultivar search text. Prefer field-specific filters when the user asks for a specific facet.",
          },
          cultivarName: {
            type: "string",
            maxLength: 200,
            description: "Public cultivar name filter.",
          },
          hybridizer: {
            type: "string",
            maxLength: 200,
            description: "Public cultivar hybridizer name filter.",
          },
          color: {
            type: "string",
            maxLength: 200,
            description: "Public cultivar color-notes text filter.",
          },
          parentage: {
            type: "string",
            maxLength: 200,
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
      annotations: READ_ONLY_TOOL_ANNOTATIONS,
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
        oneOf: [
          { required: ["cultivarReferenceId"] },
          { required: ["normalizedName"] },
        ],
        properties: {
          cultivarReferenceId: { type: "string", maxLength: 128 },
          normalizedName: { type: "string", maxLength: 200 },
        },
      },
      outputSchema: cultivarOutputSchema,
      securitySchemes: [...PUBLIC_SECURITY_SCHEMES],
      annotations: READ_ONLY_TOOL_ANNOTATIONS,
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
      annotations: READ_ONLY_TOOL_ANNOTATIONS,
      _meta: toolMeta(
        "Searching public listings",
        "Public listing search complete",
      ),
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
          id: {
            type: "string",
            maxLength: 128,
            description: "Public listing id.",
          },
          sellerSlug: {
            type: "string",
            maxLength: 128,
            description: "Seller profile slug when using listingSlug.",
          },
          listingSlug: {
            type: "string",
            maxLength: 128,
            description: "Listing slug for the seller's public catalog.",
          },
        },
      },
      outputSchema: listingOutputSchema,
      securitySchemes: [...PUBLIC_SECURITY_SCHEMES],
      annotations: READ_ONLY_TOOL_ANNOTATIONS,
      _meta: toolMeta("Loading public listing", "Public listing loaded"),
    },
    {
      name: "daylily.list_public_profiles",
      title: "List Public Profiles",
      description:
        "Browse active public grower catalogs with listings. Returns a bounded page of seller summaries ordered by seller id; follow nextCursor for more. Use get_public_profile for one grower's full profile.",
      inputSchema: paginatedInputSchema(),
      outputSchema: paginatedOutputSchema,
      securitySchemes: [...PUBLIC_SECURITY_SCHEMES],
      annotations: READ_ONLY_TOOL_ANNOTATIONS,
      _meta: toolMeta("Loading public profiles", "Public profiles loaded"),
    },
    {
      name: "daylily.get_public_profile",
      title: "Get Public Profile",
      description:
        "Use this when a buyer asks about a public grower or catalog profile by seller slug. Returns public seller profile, public lists, profile images, and public listing/list counts.",
      inputSchema: publicProfileInputSchema(),
      outputSchema: profileOutputSchema,
      securitySchemes: [...PUBLIC_SECURITY_SCHEMES],
      annotations: READ_ONLY_TOOL_ANNOTATIONS,
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
      annotations: READ_ONLY_TOOL_ANNOTATIONS,
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
      annotations: READ_ONLY_TOOL_ANNOTATIONS,
      _meta: toolMeta("Loading public listings", "Public listings loaded"),
    },
    {
      name: "daylily.search_help",
      title: "Search Daylily Help",
      description:
        "Use this for short, sourced help with public cultivar search or member dashboard workflows, such as listing status, lists, photos, profile content, import, and billing. It does not read member records.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["query"],
        properties: {
          query: { type: "string", minLength: 2, maxLength: 200 },
        },
      },
      outputSchema: helpOutputSchema,
      securitySchemes: [...PUBLIC_SECURITY_SCHEMES],
      annotations: READ_ONLY_TOOL_ANNOTATIONS,
      _meta: toolMeta("Searching help", "Help search complete"),
    },
    {
      name: "daylily.get_profile",
      title: "Get Profile",
      description:
        "Use this when the signed-in user asks about their own Daylily Catalog profile, storefront copy, slug, logo, location, images, or public profile content. The image IDs support reorder and dashboard removal review. If imagesHasMore is true, call daylily.list_images to discover the full image set. Requires OAuth.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {},
      },
      outputSchema: memberProfileOutputSchema,
      securitySchemes: [...privateSecuritySchemes],
      annotations: READ_ONLY_TOOL_ANNOTATIONS,
      _meta: toolMeta("Loading profile", "Profile loaded"),
    },
    {
      name: "daylily.list_lists",
      title: "List Lists",
      description:
        "Use this when the signed-in user asks to browse their catalog lists or resolve a list name to an id. Set listingId to page the lists containing one owned listing. Returns each list's title, description, status, and id. Use daylily.list_listings with listId to page a list's members. Requires OAuth.",
      inputSchema: {
        ...paginatedInputSchema(MEMBER_MAX_LIMIT),
        properties: {
          ...paginatedInputSchema(MEMBER_MAX_LIMIT).properties,
          listingId: { type: "string", maxLength: 128 },
        },
      },
      outputSchema: memberListPageOutputSchema,
      securitySchemes: [...privateSecuritySchemes],
      annotations: READ_ONLY_TOOL_ANNOTATIONS,
      _meta: toolMeta("Loading lists", "Lists loaded"),
    },
    {
      name: "daylily.get_list",
      title: "Get List",
      description:
        "Use this when the signed-in user asks to inspect one list by id, including its description, status, and dashboard link. Call daylily.list_listings with listId for paged members. Requires OAuth.",
      inputSchema: idInputSchema(),
      outputSchema: memberListOutputSchema,
      securitySchemes: [...privateSecuritySchemes],
      annotations: READ_ONLY_TOOL_ANNOTATIONS,
      _meta: toolMeta("Loading list", "List loaded"),
    },
    {
      name: "daylily.list_listings",
      title: "List Listings",
      description:
        "Use this when the signed-in user asks to search, filter, or page through their own listings. Returns compact rows. Follow nextCursor until null; a filtered page can be empty and still have a nextCursor. For cultivar details, first call daylily.search_cultivars on the public index, then filter owned listings by cultivarReferenceId. Search unlinked or legacy listing titles with q or title. Use daylily.get_listing for private notes, images, and full detail. Requires OAuth.",
      inputSchema: listingSearchInputSchema(),
      outputSchema: memberListingPageOutputSchema,
      securitySchemes: [...privateSecuritySchemes],
      annotations: READ_ONLY_TOOL_ANNOTATIONS,
      _meta: toolMeta("Loading listings", "Listings loaded"),
    },
    {
      name: "daylily.get_listing",
      title: "Get Listing",
      description:
        "Use this when the signed-in user asks to inspect one exact listing by id, including private notes, images, linked cultivar data, and up to 100 list memberships. If listsNextCursor is present, call daylily.list_lists with listingId and that cursor for the remaining memberships. If imagesHasMore is true, call daylily.list_images for the full image set. Do not use this for search or list expansion when daylily.list_listings can return the needed records in one paginated call. Requires OAuth.",
      inputSchema: idInputSchema(),
      outputSchema: memberListingOutputSchema,
      securitySchemes: [...privateSecuritySchemes],
      annotations: READ_ONLY_TOOL_ANNOTATIONS,
      _meta: toolMeta("Loading listing", "Listing loaded"),
    },
    {
      name: "daylily.list_images",
      title: "List Images",
      description:
        "Page every image ID for one owned listing or profile. Pages are ordered by image ID; use each image's order field for display order. Follow nextCursor until null before reordering or preparing removal review for a large legacy image set. Requires OAuth.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["type", "referenceId"],
        properties: {
          type: { type: "string", enum: ["listing", "profile"] },
          referenceId: { type: "string", minLength: 1, maxLength: 128 },
          cursor: { type: "string", minLength: 1, maxLength: 128 },
          limit: { type: "integer", minimum: 1, maximum: 100, default: 20 },
        },
      },
      outputSchema: memberImagePageOutputSchema,
      securitySchemes: [...privateSecuritySchemes],
      annotations: READ_ONLY_TOOL_ANNOTATIONS,
      _meta: toolMeta("Loading images", "Images loaded"),
    },
    {
      name: "daylily.get_image",
      title: "Get Image",
      description:
        "Get one owned listing or profile image by ID, including its resolved dashboard image URL. Use get_listing, get_profile, or list_images to find image IDs first. Requires OAuth.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["type", "referenceId", "imageId"],
        properties: {
          type: { type: "string", enum: ["listing", "profile"] },
          referenceId: { type: "string", minLength: 1, maxLength: 128 },
          imageId: { type: "string", minLength: 1, maxLength: 128 },
        },
      },
      outputSchema: memberImageOutputSchema,
      securitySchemes: [...privateSecuritySchemes],
      annotations: READ_ONLY_TOOL_ANNOTATIONS,
      _meta: toolMeta("Loading image", "Image loaded"),
    },
    {
      name: "daylily.open_dashboard",
      title: "Open Dashboard Task",
      description:
        "Use this when the signed-in member needs a precise dashboard screen or approval step for profile URL changes, deletion, image removal, profile story block removal, cultivar unlinking, or removing list members. For story block removal, pass its current blockId from get_profile. A review link never performs the change on navigation. Requires OAuth.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["destination"],
        properties: {
          destination: {
            type: "string",
            enum: [
              "profile",
              "edit_profile_url",
              "create_listing",
              "edit_listing",
              "delete_listing",
              "create_list",
              "edit_list",
              "delete_list",
              "manage_list",
              "remove_listings_from_list",
              "manage_listing_images",
              "remove_listing_image",
              "unlink_listing_cultivar",
              "manage_profile_images",
              "remove_profile_image",
              "edit_profile_content",
              "remove_profile_content_block",
              "import",
              "tags",
            ],
          },
          id: {
            type: "string",
            description: "Owned listing or list id for a record task.",
          },
          imageId: {
            type: "string",
            description: "Owned image id for image removal review.",
          },
          blockId: {
            type: "string",
            minLength: 1,
            maxLength: 128,
            description:
              "Current profile story block id to focus for removal review.",
          },
          listingIds: {
            type: "array",
            minItems: 1,
            maxItems: 20,
            uniqueItems: true,
            items: { type: "string" },
            description:
              "Current members of the list to select for removal review.",
          },
        },
      },
      outputSchema: dashboardLinkOutputSchema,
      securitySchemes: [...privateSecuritySchemes],
      annotations: READ_ONLY_TOOL_ANNOTATIONS,
      _meta: toolMeta("Preparing dashboard link", "Dashboard link ready"),
    },
  ];

  tools.forEach((tool) => {
    tool._meta = {
      ...tool._meta,
      securitySchemes: tool.securitySchemes,
    };
  });

  return tools;
}
