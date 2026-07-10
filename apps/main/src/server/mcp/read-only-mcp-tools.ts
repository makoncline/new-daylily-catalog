import type { McpTool } from "@/server/mcp/read-only-mcp-types";
import {
  cultivarOutputSchema,
  idInputSchema,
  listingOutputSchema,
  listingSearchInputSchema,
  listOutputSchema,
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
        properties: {
          cultivarReferenceId: { type: "string" },
          normalizedName: { type: "string" },
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
      annotations: READ_ONLY_TOOL_ANNOTATIONS,
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
      securitySchemes: [...privateSecuritySchemes],
      annotations: READ_ONLY_TOOL_ANNOTATIONS,
      _meta: toolMeta("Loading profile", "Profile loaded"),
    },
    {
      name: "daylily.list_lists",
      title: "List Lists",
      description:
        "Use this when the signed-in user asks to browse their catalog list records or when you need to resolve a human list name to an id before calling daylily.list_listings with listId. Returns list metadata and listing ids. Requires OAuth.",
      inputSchema: paginatedInputSchema(),
      outputSchema: paginatedOutputSchema,
      securitySchemes: [...privateSecuritySchemes],
      annotations: READ_ONLY_TOOL_ANNOTATIONS,
      _meta: toolMeta("Loading lists", "Lists loaded"),
    },
    {
      name: "daylily.get_list",
      title: "Get List",
      description:
        "Use this when the signed-in user asks to inspect one of their catalog lists by id, including its description, status, and listing ids. For full listing records in a list, call daylily.list_listings with listId instead of expanding ids one by one. Requires OAuth.",
      inputSchema: idInputSchema(),
      outputSchema: listOutputSchema,
      securitySchemes: [...privateSecuritySchemes],
      annotations: READ_ONLY_TOOL_ANNOTATIONS,
      _meta: toolMeta("Loading list", "List loaded"),
    },
    {
      name: "daylily.list_listings",
      title: "List Listings",
      description:
        "Use this when the signed-in user asks to search, filter, or page through their own listing records, including private notes. Supports the dashboard's key advanced filters such as title, description, listId, status, price/photo availability, cultivar name, hybridizer, year, color, parentage, and bloom traits. Use the most selective filter arguments directly instead of scanning the full catalog. If the user names a list but you do not know its id, call daylily.list_lists first, then pass listId here. For complete catalog-wide summaries or facet-style searches, use limit 500 and repeat with the same filters plus nextCursor until nextCursor is null. Requires OAuth.",
      inputSchema: listingSearchInputSchema(),
      outputSchema: paginatedOutputSchema,
      securitySchemes: [...privateSecuritySchemes],
      annotations: READ_ONLY_TOOL_ANNOTATIONS,
      _meta: toolMeta("Loading listings", "Listings loaded"),
    },
    {
      name: "daylily.get_listing",
      title: "Get Listing",
      description:
        "Use this when the signed-in user asks to inspect one exact listing by id, including private notes, images, linked cultivar data, and list membership. Do not use this for search or list expansion when daylily.list_listings can return the needed records in one paginated call. Requires OAuth.",
      inputSchema: idInputSchema(),
      outputSchema: listingOutputSchema,
      securitySchemes: [...privateSecuritySchemes],
      annotations: READ_ONLY_TOOL_ANNOTATIONS,
      _meta: toolMeta("Loading listing", "Listing loaded"),
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
