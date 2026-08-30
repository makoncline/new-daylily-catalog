import { createHash } from "node:crypto";

import {
  PUBLIC_CLOUDFLARE_CACHE_CONTROL_HEADER,
  PUBLIC_CLOUDFLARE_CACHE_TAG,
} from "@/lib/public-cache-policy";
import type { StorefrontSiteConfig } from "@/types/storefront";
import { inquiryConflictCode } from "@/server/inquiries/inquiry-schema";

export const MACHINE_DISCOVERY_CACHE_CONTROL =
  "public, max-age=60, stale-while-revalidate=300";
export const MACHINE_DISCOVERY_CLOUDFLARE_CACHE_CONTROL =
  "public, max-age=3600, stale-while-revalidate=86400";
export const MACHINE_DISCOVERY_CACHE_TAG = PUBLIC_CLOUDFLARE_CACHE_TAG;

export const API_CATALOG_MEDIA_TYPE = "application/linkset+json";
export const OPENAPI_MEDIA_TYPE = "application/vnd.oai.openapi+json";

export const agentSkillNames = [
  "availability-inquiry",
  "catalog-navigation",
  "cultivar-reference",
  "site-navigation",
] as const;

export type AgentSkillName = (typeof agentSkillNames)[number];

type MachineSiteConfig = Pick<
  StorefrontSiteConfig,
  "canonicalUrl" | "commerce"
> & {
  brand: Pick<StorefrontSiteConfig["brand"], "description" | "name">;
};

function normalizedBaseUrl(site: MachineSiteConfig) {
  return site.canonicalUrl.replace(/\/$/, "");
}

function cachedResponse(body: string, contentType: string) {
  return new Response(body, {
    status: 200,
    headers: {
      "Cache-Control": MACHINE_DISCOVERY_CACHE_CONTROL,
      [PUBLIC_CLOUDFLARE_CACHE_CONTROL_HEADER]:
        MACHINE_DISCOVERY_CLOUDFLARE_CACHE_CONTROL,
      "Cache-Tag": MACHINE_DISCOVERY_CACHE_TAG,
      "Content-Type": `${contentType}; charset=utf-8`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export function createApiCatalog(site: MachineSiteConfig) {
  const baseUrl = normalizedBaseUrl(site);
  return {
    linkset: [
      {
        anchor: `${baseUrl}/api`,
        "service-desc": [
          {
            href: `${baseUrl}/openapi.json`,
            type: OPENAPI_MEDIA_TYPE,
          },
        ],
        "service-doc": [
          {
            href: `${baseUrl}/llms.txt`,
            type: "text/plain",
          },
        ],
        status: [
          {
            href: `${baseUrl}/api/health`,
            type: "application/json",
          },
        ],
      },
    ],
  };
}

export function createApiCatalogResponse(site: MachineSiteConfig) {
  return cachedResponse(
    JSON.stringify(createApiCatalog(site)),
    API_CATALOG_MEDIA_TYPE,
  );
}

const textFilterNames = [
  "name",
  "list",
  "char",
  "hybridizer",
  "year",
  "ploidy",
  "color",
  "form",
  "foliageType",
  "note",
  "fragrance",
  "bloomSeason",
] as const;

function catalogQueryParameters() {
  return [
    {
      name: "page",
      in: "query",
      schema: { type: "integer", minimum: 1, default: 1 },
    },
    {
      name: "limit",
      in: "query",
      schema: { type: "integer", minimum: 1, maximum: 100, default: 24 },
    },
    ...textFilterNames.map((name) => ({
      name,
      in: "query",
      schema: { type: "string" },
    })),
    {
      name: "bloomSize",
      in: "query",
      schema: {
        type: "string",
        enum: ["miniature", "small", "large", "extra-large"],
      },
    },
    {
      name: "scapeHeight",
      in: "query",
      schema: {
        type: "string",
        enum: ["miniature", "short", "medium", "tall", "extra-tall"],
      },
    },
    {
      name: "rebloom",
      in: "query",
      description:
        "Set to true to return only reblooming cultivars. Other values do not enable this filter.",
      schema: { type: "boolean", default: false },
    },
    {
      name: "price",
      in: "query",
      schema: {
        type: "string",
        enum: [
          "under-10",
          "10-to-19",
          "20-to-29",
          "30-to-39",
          "40-to-49",
          "50-plus",
        ],
      },
    },
  ];
}

function publicJsonResponse(description: string, schemaName: string) {
  return {
    description,
    content: {
      "application/json": {
        schema: { $ref: `#/components/schemas/${schemaName}` },
      },
    },
  };
}

function errorJsonResponse(description: string) {
  return publicJsonResponse(description, "PublicApiError");
}

interface OpenApiResponseHeader {
  description: string;
  schema: { type: string; const?: string };
}

function inquiryJsonResponse(
  description: string,
  schemaName: string,
  headers: Record<string, OpenApiResponseHeader> = {},
) {
  return {
    ...publicJsonResponse(description, schemaName),
    headers: {
      "Cache-Control": {
        description: "Inquiry responses are not stored.",
        schema: { type: "string", const: "no-store" },
      },
      ...headers,
    },
  };
}

export function createOpenApiDocument(site: MachineSiteConfig) {
  const baseUrl = normalizedBaseUrl(site);
  const minimumOrder = site.commerce.minimumOrder;
  const shipping = site.commerce.shipping;

  return {
    openapi: "3.1.0",
    info: {
      title: `${site.brand.name} Public Catalog API`,
      version: "1.0.0",
      description: `Public API for discovering ${site.brand.name} catalog data and submitting customer inquiries. Catalog data is public and read-only. Ordering and availability require direct confirmation.`,
    },
    servers: [{ url: baseUrl }],
    paths: {
      "/api/catalogs": {
        get: {
          summary: "List public catalogs",
          responses: {
            "200": publicJsonResponse(
              "Public catalog summaries",
              "CatalogsResponse",
            ),
            "404": errorJsonResponse("Storefront not found"),
            "500": errorJsonResponse("Unexpected server error"),
            "503": errorJsonResponse("Catalog data is unavailable"),
          },
        },
      },
      "/api/catalog/{catalog}": {
        get: {
          summary: "List public listings in a catalog",
          parameters: [
            {
              name: "catalog",
              in: "path",
              required: true,
              description: "Use all, for-sale, search, or a public list slug.",
              schema: { type: "string" },
            },
            ...catalogQueryParameters(),
          ],
          responses: {
            "200": publicJsonResponse(
              "Paginated public listing cards",
              "CatalogResponse",
            ),
            "404": errorJsonResponse("Catalog or storefront not found"),
            "500": errorJsonResponse("Unexpected server error"),
            "503": errorJsonResponse("Catalog data is unavailable"),
          },
        },
      },
      "/api/listings/{listing}": {
        get: {
          summary: "Get public listing details",
          parameters: [
            {
              name: "listing",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": publicJsonResponse(
              "Public listing details, including a nullable rebloom value",
              "ListingResponse",
            ),
            "404": errorJsonResponse("Listing or storefront not found"),
            "500": errorJsonResponse("Unexpected server error"),
            "503": errorJsonResponse("Catalog data is unavailable"),
          },
        },
      },
      "/api/forms": {
        post: {
          summary: "Submit a contact or cart availability inquiry",
          description: [
            `Requests an inquiry from ${site.brand.name}. Agents must call this endpoint only after explicit user review and confirmation.`,
            "The website field is a honeypot and must stay empty.",
            "openedAt must be at least 750 milliseconds old and no more than two hours old when submitted. An expired form returns 409 and is not delivered.",
            "A contact message is required. A cart message is optional. Either can contain at most one http://, https://, or www. link.",
            "Honeypot, too-fast, and link-rule matches return the same accepted response as a delivered inquiry, but they are not delivered. Expired forms return 409.",
            "Every response sends Cache-Control: no-store.",
          ].join(" "),
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  oneOf: [
                    { $ref: "#/components/schemas/ContactInquiry" },
                    { $ref: "#/components/schemas/CartInquiry" },
                  ],
                  discriminator: {
                    propertyName: "kind",
                    mapping: {
                      contact: "#/components/schemas/ContactInquiry",
                      cart: "#/components/schemas/CartInquiry",
                    },
                  },
                },
              },
            },
          },
          responses: {
            "202": inquiryJsonResponse(
              "Inquiry accepted. Spam-rule matches use the same response and are not delivered.",
              "InquiryAcceptedResponse",
            ),
            "400": inquiryJsonResponse(
              "Request body is not valid JSON",
              "InquiryErrorResponse",
            ),
            "409": inquiryJsonResponse(
              "The form expired or cart data changed. The response code identifies the recovery action.",
              "InquiryConflictResponse",
            ),
            "422": inquiryJsonResponse(
              "Inquiry fields are invalid",
              "InquiryErrorResponse",
            ),
            "429": inquiryJsonResponse(
              "The inquiry rate limit was reached",
              "InquiryErrorResponse",
              {
                "Retry-After": {
                  description:
                    "Optional delay from the inquiry receiver before another request.",
                  schema: { type: "string" },
                },
              },
            ),
            "502": inquiryJsonResponse(
              "Inquiry delivery failed",
              "InquiryErrorResponse",
            ),
            "503": inquiryJsonResponse(
              "Inquiry delivery is not configured",
              "InquiryErrorResponse",
            ),
          },
        },
      },
      "/api/health": {
        get: {
          summary: "Check public app and snapshot health",
          responses: {
            "200": publicJsonResponse(
              "Service is ready or is serving any usable snapshot",
              "HealthReadyResponse",
            ),
            "503": publicJsonResponse(
              "No usable public snapshot is available or inquiry delivery is not configured",
              "HealthUnavailableResponse",
            ),
          },
        },
      },
    },
    components: {
      schemas: {
        PublicApiError: {
          type: "object",
          required: ["version", "error"],
          properties: {
            version: { const: 1 },
            error: {
              type: "object",
              required: ["code", "message"],
              properties: {
                code: {
                  type: "string",
                  enum: [
                    "catalog_not_found",
                    "listing_not_found",
                    "storefront_not_found",
                    "storefront_unavailable",
                    "internal_server_error",
                  ],
                },
                message: { type: "string" },
              },
            },
          },
        },
        CatalogSummary: {
          type: "object",
          required: [
            "kind",
            "slug",
            "title",
            "description",
            "imageUrl",
            "totalCount",
            "url",
            "apiUrl",
          ],
          properties: {
            kind: {
              type: "string",
              enum: ["all", "for-sale", "search", "list"],
            },
            slug: { type: "string" },
            title: { type: "string" },
            description: { type: ["string", "null"] },
            imageUrl: { type: ["string", "null"] },
            totalCount: { type: "integer", minimum: 0 },
            url: { type: "string" },
            apiUrl: { type: "string" },
          },
        },
        CatalogReference: {
          type: "object",
          required: ["slug", "title", "description", "url", "apiUrl"],
          properties: {
            slug: { type: "string" },
            title: { type: "string" },
            description: { type: ["string", "null"] },
            url: { type: "string" },
            apiUrl: { type: "string" },
          },
        },
        PublicImage: {
          type: "object",
          required: ["url", "thumbUrl", "blurUrl", "order"],
          properties: {
            url: { type: "string" },
            thumbUrl: { type: ["string", "null"] },
            blurUrl: { type: ["string", "null"] },
            order: { type: "integer", minimum: 0 },
          },
        },
        CultivarDetails: {
          type: "object",
          required: [
            "name",
            "ahsImageUrl",
            "hybridizer",
            "year",
            "seedlingNum",
            "scapeHeight",
            "bloomSize",
            "bloomSeason",
            "rebloom",
            "ploidy",
            "foliageType",
            "bloomHabit",
            "color",
            "form",
            "parentage",
            "fragrance",
            "budcount",
            "branches",
            "sculpting",
            "foliage",
            "flower",
          ],
          properties: {
            name: { type: ["string", "null"] },
            ahsImageUrl: { type: ["string", "null"] },
            hybridizer: { type: ["string", "null"] },
            year: { type: ["string", "null"] },
            seedlingNum: { type: ["string", "null"] },
            scapeHeight: { type: ["string", "null"] },
            bloomSize: { type: ["string", "null"] },
            bloomSeason: { type: ["string", "null"] },
            rebloom: { type: ["boolean", "null"] },
            ploidy: { type: ["string", "null"] },
            foliageType: { type: ["string", "null"] },
            bloomHabit: { type: ["string", "null"] },
            color: { type: ["string", "null"] },
            form: { type: ["string", "null"] },
            parentage: { type: ["string", "null"] },
            fragrance: { type: ["string", "null"] },
            budcount: { type: ["string", "null"] },
            branches: { type: ["string", "null"] },
            sculpting: { type: ["string", "null"] },
            foliage: { type: ["string", "null"] },
            flower: { type: ["string", "null"] },
          },
        },
        PublicCultivar: {
          type: "object",
          required: ["normalizedName", "details"],
          properties: {
            normalizedName: { type: ["string", "null"] },
            details: {
              oneOf: [
                { $ref: "#/components/schemas/CultivarDetails" },
                { type: "null" },
              ],
            },
          },
        },
        PublicListing: {
          type: "object",
          required: [
            "id",
            "slug",
            "title",
            "description",
            "price",
            "forSale",
            "images",
            "cultivar",
            "catalogs",
            "updatedAt",
            "url",
            "apiUrl",
          ],
          properties: {
            id: { type: "string" },
            slug: { type: "string" },
            title: { type: "string" },
            description: { type: ["string", "null"] },
            price: { type: ["number", "null"] },
            forSale: { type: "boolean" },
            images: {
              type: "array",
              items: { $ref: "#/components/schemas/PublicImage" },
            },
            cultivar: {
              oneOf: [
                { $ref: "#/components/schemas/PublicCultivar" },
                { type: "null" },
              ],
            },
            catalogs: {
              type: "array",
              items: { $ref: "#/components/schemas/CatalogReference" },
            },
            updatedAt: { type: "string", format: "date-time" },
            url: { type: "string" },
            apiUrl: { type: "string" },
          },
        },
        Pagination: {
          type: "object",
          required: ["page", "limit", "total", "totalPages"],
          properties: {
            page: { type: "integer", minimum: 1 },
            limit: { type: "integer", minimum: 1, maximum: 100 },
            total: { type: "integer", minimum: 0 },
            totalPages: { type: "integer", minimum: 1 },
          },
        },
        CatalogsResponse: {
          type: "object",
          required: ["version", "generatedAt", "catalogs"],
          properties: {
            version: { const: 1 },
            generatedAt: { type: "string", format: "date-time" },
            catalogs: {
              type: "array",
              items: { $ref: "#/components/schemas/CatalogSummary" },
            },
          },
        },
        CatalogResponse: {
          type: "object",
          required: [
            "version",
            "generatedAt",
            "catalog",
            "pagination",
            "listings",
          ],
          properties: {
            version: { const: 1 },
            generatedAt: { type: "string", format: "date-time" },
            catalog: { $ref: "#/components/schemas/CatalogSummary" },
            pagination: { $ref: "#/components/schemas/Pagination" },
            listings: {
              type: "array",
              items: { $ref: "#/components/schemas/PublicListing" },
            },
          },
        },
        ListingResponse: {
          type: "object",
          required: ["version", "generatedAt", "listing"],
          properties: {
            version: { const: 1 },
            generatedAt: { type: "string", format: "date-time" },
            listing: { $ref: "#/components/schemas/PublicListing" },
          },
        },
        HealthReadyResponse: {
          type: "object",
          required: [
            "ok",
            "status",
            "degraded",
            "source",
            "version",
            "freshness",
            "ageSeconds",
            "generatedAt",
            "checkedAt",
          ],
          properties: {
            ok: { const: true },
            status: { type: "string", enum: ["ready", "degraded"] },
            degraded: { type: "boolean" },
            source: {
              type: "string",
              enum: [
                "fixture",
                "remote",
                "remote-not-modified",
                "last-known-good",
              ],
            },
            version: { const: 1 },
            freshness: { type: "string", enum: ["fresh", "stale"] },
            ageSeconds: { type: "integer", minimum: 0 },
            generatedAt: { type: "string", format: "date-time" },
            checkedAt: { type: "string", format: "date-time" },
          },
        },
        HealthUnavailableResponse: {
          type: "object",
          required: ["ok", "status", "degraded", "source"],
          properties: {
            ok: { const: false },
            status: { const: "unavailable" },
            degraded: { const: false },
            source: { const: "none" },
          },
        },
        InquiryReceipt: {
          type: "object",
          additionalProperties: false,
          required: ["id", "acceptedAt"],
          properties: {
            id: { type: "string" },
            acceptedAt: { type: "string", format: "date-time" },
          },
        },
        InquiryAcceptedResponse: {
          type: "object",
          additionalProperties: false,
          required: ["accepted"],
          properties: {
            accepted: { const: true },
            receipt: { $ref: "#/components/schemas/InquiryReceipt" },
          },
        },
        InquiryErrorResponse: {
          type: "object",
          additionalProperties: false,
          required: ["error"],
          properties: {
            error: { type: "string" },
            issues: { type: "object" },
          },
        },
        InquiryConflictResponse: {
          type: "object",
          additionalProperties: false,
          required: ["code", "error"],
          properties: {
            code: {
              type: "string",
              enum: [
                inquiryConflictCode.formExpired,
                inquiryConflictCode.cartChanged,
              ],
            },
            error: { type: "string" },
          },
        },
        InquiryPerson: {
          type: "object",
          required: ["name", "email", "openedAt"],
          properties: {
            name: { type: "string", minLength: 1, maxLength: 120 },
            email: { type: "string", format: "email", maxLength: 254 },
            message: {
              type: "string",
              maxLength: 5_000,
              default: "",
              description:
                "Can contain at most one http://, https://, or www. link. A request with more links is accepted but not delivered.",
            },
            website: {
              type: "string",
              maxLength: 500,
              default: "",
              description:
                "Honeypot. Leave empty. A non-empty value is accepted but not delivered.",
            },
            openedAt: {
              type: "string",
              format: "date-time",
              description:
                "Time when the form opened. A submission less than 750 milliseconds old is accepted but not delivered. A submission older than two hours returns 409 and is not delivered.",
            },
          },
        },
        ContactInquiry: {
          unevaluatedProperties: false,
          allOf: [
            { $ref: "#/components/schemas/InquiryPerson" },
            {
              type: "object",
              required: ["kind", "message"],
              properties: {
                kind: { const: "contact" },
                message: {
                  type: "string",
                  minLength: 1,
                  maxLength: 5_000,
                },
              },
            },
          ],
        },
        CartLine: {
          type: "object",
          additionalProperties: false,
          required: ["listingId", "slug", "title", "quantity", "unitPrice"],
          properties: {
            listingId: { type: "string", minLength: 1, maxLength: 100 },
            slug: { type: "string", minLength: 1, maxLength: 200 },
            title: { type: "string", minLength: 1, maxLength: 300 },
            quantity: {
              type: "integer",
              minimum: 1,
              maximum: 100,
            },
            unitPrice: { type: "number", exclusiveMinimum: 0 },
          },
        },
        CartInquiry: {
          unevaluatedProperties: false,
          allOf: [
            { $ref: "#/components/schemas/InquiryPerson" },
            {
              type: "object",
              required: ["kind", "lines", "subtotal", "shipping", "total"],
              properties: {
                kind: { const: "cart" },
                lines: {
                  type: "array",
                  minItems: 1,
                  maxItems: 100,
                  description:
                    "Listing IDs must be unique and must match current public listing slugs, titles, and prices.",
                  items: { $ref: "#/components/schemas/CartLine" },
                },
                subtotal: {
                  type: "number",
                  minimum: 0,
                  description: `Must match current listing prices. The seller lists a ${minimumOrder.toLocaleString("en-US", { style: "currency", currency: "USD" })} minimum as guidance, but this endpoint accepts cart inquiries below it.`,
                },
                shipping: {
                  type: "number",
                  minimum: 0,
                  description: `Must match ${shipping.baseRate.toLocaleString("en-US", { style: "currency", currency: "USD" })} for the first ${shipping.baseItems} plants plus ${shipping.additionalItemRate.toLocaleString("en-US", { style: "currency", currency: "USD" })} for each additional plant.`,
                },
                total: { type: "number", exclusiveMinimum: 0 },
              },
            },
          ],
        },
      },
    },
  };
}

export function createOpenApiResponse(site: MachineSiteConfig) {
  return cachedResponse(
    JSON.stringify(createOpenApiDocument(site)),
    OPENAPI_MEDIA_TYPE,
  );
}

export function createLlmsText(site: MachineSiteConfig) {
  const baseUrl = normalizedBaseUrl(site);
  return `# ${site.brand.name}

${site.brand.description}

## Primary Pages

- Home: ${baseUrl}/
- Catalogs: ${baseUrl}/catalogs
- For Sale: ${baseUrl}/catalog/for-sale
- All Daylilies: ${baseUrl}/catalog/all
- Search: ${baseUrl}/catalog/search
- Sitemap: ${baseUrl}/sitemap.xml
- API Catalog: ${baseUrl}/.well-known/api-catalog
- OpenAPI: ${baseUrl}/openapi.json

## Ordering Notes

Customers should use the catalog and cart to identify plants of interest, then
contact ${site.brand.name} to confirm availability before payment. The site
does not expose OAuth, an MCP server, or an agent-native checkout protocol.
The seller lists a ${site.commerce.minimumOrder.toLocaleString("en-US", { style: "currency", currency: "USD" })} minimum as guidance, but the cart can submit an inquiry below it.

## Agent Guidance

- Use canonical listing URLs from the sitemap when citing individual daylilies.
- Use the public catalog API when structured data is better than scraping:
  - \`GET /api/catalogs\`
  - \`GET /api/catalog/{catalog}?page=1&limit=24\`
  - \`GET /api/listings/{listing}\`
- Respect availability language on listing pages; a listed cultivar may be
  display-only or require confirmation.
- Only submit \`POST /api/forms\` after the user has reviewed and confirmed the
  inquiry text and any personal contact information.
- Prefer the \`Accept: text/markdown\` representation for concise summaries of
  core site pages.
`;
}

export function createLlmsResponse(site: MachineSiteConfig) {
  return cachedResponse(createLlmsText(site), "text/plain");
}

function agentSkillDocument(
  name: AgentSkillName,
  description: string,
  body: string,
) {
  return `---
name: ${name}
description: ${description}
---

${body.trim()}
`;
}

function createAgentSkillDescriptions(site: MachineSiteConfig) {
  const name = site.brand.name;
  return {
    "availability-inquiry": `Help customers prepare accurate ${name} availability and order inquiries without assuming plants are currently available.`,
    "catalog-navigation": `Navigate ${name} catalog pages, find daylily listings, and guide users toward availability confirmation.`,
    "cultivar-reference": `Use ${name} listing pages as cultivar references while preserving visible source context and uncertainty.`,
    "site-navigation": `Navigate ${name} as a customer-facing site, including catalogs, search, cart, blog, and contact paths.`,
  } satisfies Record<AgentSkillName, string>;
}

export function createAgentSkillDocuments(site: MachineSiteConfig) {
  const baseUrl = normalizedBaseUrl(site);
  const name = site.brand.name;
  const descriptions = createAgentSkillDescriptions(site);
  const minimumOrder = site.commerce.minimumOrder.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });

  return {
    "availability-inquiry": agentSkillDocument(
      "availability-inquiry",
      descriptions["availability-inquiry"],
      `# ${name} Availability Inquiry

Use this skill when a user wants to ask about availability, pricing, shipping,
or ordering from ${name}.

## Workflow

1. Collect the daylily names or listing URLs the user is interested in.
2. Prefer plants from \`${baseUrl}/catalog/for-sale\` when the user wants
   purchasable plants.
3. Treat catalog prices as useful context, not a guarantee of current
   availability.
4. Use the cart or contact form to prepare an inquiry.
5. Ask the user to review before sending any message.

## Important Constraints

- Do not claim a plant is available unless the site explicitly says so.
- Do not submit contact forms without explicit user confirmation.
- Do not enter the user's email address, phone number, address, or payment
  information without explicit user confirmation.
- Do not collect payment. ${name} asks customers to confirm availability
  before payment.

## Useful Details

- The seller lists a ${minimumOrder} minimum as guidance. The cart can submit
  an inquiry below it.
- ${site.commerce.shippingCopy ?? "Confirm shipping terms before ordering."}`,
    ),
    "catalog-navigation": agentSkillDocument(
      "catalog-navigation",
      descriptions["catalog-navigation"],
      `# ${name} Catalog Navigation

Use this skill when a user wants to find, compare, or order daylilies from
${name}.

## Core Pages

- Start at \`${baseUrl}/catalogs\` to see catalog groups.
- Use \`${baseUrl}/catalog/for-sale\` for plants with listed prices.
- Use \`${baseUrl}/catalog/search\` to search and filter the full catalog.
- Use \`${baseUrl}/sitemap.xml\` to discover canonical listing URLs.
- Use \`${baseUrl}/.well-known/api-catalog\` and
  \`${baseUrl}/openapi.json\` when structured catalog data is more useful than
  page browsing.

## Ordering Workflow

1. Browse or search for desired cultivars.
2. Open listing detail pages for cultivar details, images, price, and notes.
3. Treat availability as requiring confirmation.
4. Use the cart and contact form to send an inquiry before payment.

## Constraints

- Do not assume a display-only plant is available for purchase.
- Do not invent current availability when the page does not state it.
- The site does not provide OAuth, an MCP server, or an agent-native payment
  protocol.`,
    ),
    "cultivar-reference": agentSkillDocument(
      "cultivar-reference",
      descriptions["cultivar-reference"],
      `# ${name} Cultivar Reference

Use this skill when a user asks for cultivar details, comparisons, or summaries
based on ${name} listing pages.

## Source Priority

1. Use the individual listing page as the primary source for a cultivar.
2. Use visible details such as hybridizer, year, parentage, ploidy, bloom size,
   bloom season, rebloom, foliage, form, fragrance, color, price, and
   description.
3. Use catalog pages only to discover candidate listings.
4. Use the sitemap when a canonical listing URL is needed.

## Answering Rules

- Include the cultivar name and listing URL when summarizing.
- Preserve uncertainty: if a trait is absent, say it is not listed.
- Do not infer plant availability from historical catalog presence.
- Do not present display-only plants as purchasable.
- Do not copy long page text verbatim; summarize the listing details.

## Useful Pages

- All daylilies: \`${baseUrl}/catalog/all\`
- For sale: \`${baseUrl}/catalog/for-sale\`
- Search: \`${baseUrl}/catalog/search\`
- Sitemap: \`${baseUrl}/sitemap.xml\``,
    ),
    "site-navigation": agentSkillDocument(
      "site-navigation",
      descriptions["site-navigation"],
      `# ${name} Site Navigation

Use this skill when a user wants help finding their way around ${name}.

## Main Paths

- Home: \`${baseUrl}/\`
- Catalogs: \`${baseUrl}/catalogs\`
- Search: \`${baseUrl}/catalog/search\`
- For sale: \`${baseUrl}/catalog/for-sale\`
- All listings: \`${baseUrl}/catalog/all\`
- Cart: \`${baseUrl}/cart\`
- Blog: \`${baseUrl}/blog\`
- Contact: \`${baseUrl}/contact\`

## Guidance

- Send users to Search when they know a cultivar name, hybridizer, color,
  bloom traits, or price range.
- Send users to For Sale when they want purchasable plants.
- Send users to Catalogs when they want broad browsing by list.
- Use the cart as an inquiry aid, not as a guaranteed checkout flow.
- Contact forms and cart inquiries must be reviewed by the user before
  submission.`,
    ),
  } satisfies Record<AgentSkillName, string>;
}

function skillDigest(document: string) {
  return `sha256:${createHash("sha256").update(document).digest("hex")}`;
}

export function createAgentSkillsIndex(site: MachineSiteConfig) {
  const documents = createAgentSkillDocuments(site);
  const descriptions = createAgentSkillDescriptions(site);
  return {
    $schema: "https://schemas.agentskills.io/discovery/0.2.0/schema.json",
    skills: agentSkillNames.map((name) => ({
      name,
      type: "skill-md",
      description: descriptions[name],
      url: `/.well-known/agent-skills/${name}/SKILL.md`,
      digest: skillDigest(documents[name]),
    })),
  };
}

export function createAgentSkillsIndexResponse(site: MachineSiteConfig) {
  return cachedResponse(
    JSON.stringify(createAgentSkillsIndex(site)),
    "application/json",
  );
}

export function createAgentSkillResponse(
  site: MachineSiteConfig,
  name: AgentSkillName,
) {
  return cachedResponse(createAgentSkillDocuments(site)[name], "text/markdown");
}
