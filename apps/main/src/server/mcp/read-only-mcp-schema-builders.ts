export const DEFAULT_LIMIT = 25;
export const MAX_LIMIT = 500;

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

export function paginatedInputSchema() {
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

export function listingSearchInputSchema() {
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

export function publicProfileInputSchema() {
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

export function idInputSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["id"],
    properties: {
      id: { type: "string" },
    },
  };
}

export function toolMeta(invoking: string, invoked: string) {
  return {
    "openai/toolInvocation/invoking": invoking,
    "openai/toolInvocation/invoked": invoked,
  };
}
