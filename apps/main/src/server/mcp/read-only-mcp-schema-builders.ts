import { z } from "zod";
import { memberOperationJsonSchema } from "@/lib/member-result-contract";
import { memberMcpProfileResultSchema } from "@/server/mcp/member-mcp-result-contract";

export const DEFAULT_LIMIT = 25;
export const MAX_LIMIT = 100;
export const MEMBER_MAX_LIMIT = 100;

export const cultivarOutputSchema = {
  type: "object",
  additionalProperties: true,
  properties: {
    cultivar: { type: ["object", "null"], additionalProperties: true },
  },
};

export const searchResultsOutputSchema = {
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

export const profileOutputSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    profile: { type: ["object", "null"], additionalProperties: true },
  },
  required: ["profile"],
};

export const paginatedOutputSchema = {
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

export const listOutputSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    list: { type: "object", additionalProperties: true },
  },
  required: ["list"],
};

export const listingOutputSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    listing: { type: "object", additionalProperties: true },
  },
  required: ["listing"],
};

export const imageOutputSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    image: { type: "object", additionalProperties: true },
  },
  required: ["image"],
};

export const memberProfileOutputSchema = {
  type: "object",
  additionalProperties: false,
  properties: { profile: z.toJSONSchema(memberMcpProfileResultSchema) },
  required: ["profile"],
};

export const memberListPageOutputSchema =
  memberOperationJsonSchema("list.page");
export const memberListingPageOutputSchema =
  memberOperationJsonSchema("listing.page");
export const memberImagePageOutputSchema = memberOperationJsonSchema(
  "image.listForTarget",
);

export const memberListOutputSchema = {
  type: "object",
  additionalProperties: false,
  properties: { list: memberOperationJsonSchema("list.get") },
  required: ["list"],
};

export const memberListingOutputSchema = {
  type: "object",
  additionalProperties: false,
  properties: { listing: memberOperationJsonSchema("listing.get") },
  required: ["listing"],
};

export const memberImageOutputSchema = {
  type: "object",
  additionalProperties: false,
  properties: { image: memberOperationJsonSchema("image.get") },
  required: ["image"],
};

export const dashboardLinkOutputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["url", "destination", "title", "canComplete", "nextStep"],
  properties: {
    url: { type: "string", format: "uri" },
    destination: { type: "string" },
    title: { type: ["string", "null"] },
    canComplete: { type: "boolean" },
    nextStep: { type: "string" },
  },
};

export const helpOutputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["results"],
  properties: {
    results: {
      type: "array",
      items: { type: "object", additionalProperties: true },
    },
  },
};

export function paginatedInputSchema(maxLimit = MAX_LIMIT) {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      cursor: {
        type: "string",
        maxLength: 128,
        description:
          "Last seen row id from nextCursor. Keep the same filters and pass this cursor to continue paging.",
      },
      limit: {
        type: "integer",
        minimum: 1,
        maximum: maxLimit,
        default: DEFAULT_LIMIT,
      },
    },
  };
}

export function listingSearchInputSchema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      ...paginatedInputSchema(MEMBER_MAX_LIMIT).properties,
      cursor: {
        type: "string",
        minLength: 1,
        maxLength: 130,
        description:
          "Opaque nextCursor from the previous listing page. Keep the same filters.",
      },
      cultivarReferenceId: {
        type: "string",
        maxLength: 128,
        description:
          "Exact linked cultivar reference id. Use daylily.search_cultivars to find the id on the local public index, then filter owned listings.",
      },
      description: {
        type: "string",
        maxLength: 200,
        description: "Listing description text.",
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
      linkedToCultivar: {
        type: "boolean",
        description:
          "When true, only listings linked to a cultivar; when false, only unlinked listings.",
      },
      listId: {
        type: "string",
        maxLength: 128,
        description:
          "Only listings that belong to this list id. If you only know the list name, call daylily.list_lists first.",
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
        maxLength: 200,
        description:
          "Search owned listing title, description, and private note. Search cultivar details with daylily.search_cultivars, then filter here by cultivarReferenceId.",
      },
      status: {
        type: "string",
        maxLength: 200,
        description: "Listing status value.",
      },
      title: {
        type: "string",
        maxLength: 200,
        description: "Listing title text.",
      },
    },
  };
}

export function publicListingSearchInputSchema(options?: {
  requireSellerSlug?: boolean;
}) {
  return {
    type: "object",
    additionalProperties: false,
    required: options?.requireSellerSlug ? ["sellerSlug"] : [],
    properties: {
      ...paginatedInputSchema().properties,
      color: {
        type: "string",
        maxLength: 200,
        description: "Search linked cultivar color notes.",
      },
      cultivarName: {
        type: "string",
        maxLength: 200,
        description: "Linked cultivar name text.",
      },
      description: {
        type: "string",
        maxLength: 200,
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
        maxLength: 200,
        description: "Hybridizer text from the linked cultivar record.",
      },
      listId: {
        type: "string",
        maxLength: 128,
        description: "Only listings that belong to this public list id.",
      },
      listTitle: {
        type: "string",
        maxLength: 200,
        description: "Only listings in a public list with this title text.",
      },
      parentage: {
        type: "string",
        maxLength: 200,
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
        maxLength: 200,
        description:
          "Broad public listing search across listing title, description, cultivar name, hybridizer, color, and parentage.",
      },
      sellerSlug: {
        type: "string",
        maxLength: 128,
        description: "Public seller slug or user id.",
      },
      title: {
        type: "string",
        maxLength: 200,
        description: "Public listing title text.",
      },
      year: {
        type: "string",
        maxLength: 200,
        description: "Cultivar registration or introduction year text.",
      },
    },
  };
}

export function publicProfileInputSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["sellerSlug"],
    properties: {
      sellerSlug: {
        type: "string",
        maxLength: 128,
        description: "Public seller profile slug or user id.",
      },
    },
  };
}

export function idInputSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["id"],
    properties: {
      id: { type: "string", maxLength: 128 },
    },
  };
}

export function toolMeta(invoking: string, invoked: string) {
  return {
    "openai/toolInvocation/invoking": invoking,
    "openai/toolInvocation/invoked": invoked,
  };
}
