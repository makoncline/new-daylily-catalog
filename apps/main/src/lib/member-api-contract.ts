export const MEMBER_READ_OPERATIONS = [
  ["handoff.get", "Get an owner-checked dashboard review path"],
  ["listing.page", "Page owned listings"],
  ["listing.get", "Get one owned listing"],
  ["list.page", "Page owned lists"],
  ["list.get", "Get one owned list"],
  ["profile.get", "Get the member profile"],
  ["image.listForTarget", "List images for one owned target"],
  ["image.get", "Get one owned image"],
  ["cultivar.search", "Search local cultivar references"],
  ["cultivar.get", "Get one local cultivar reference"],
] as const;

export const MEMBER_WRITE_OPERATIONS = [
  ["listing.create", "Create one listing"],
  ["listing.update", "Edit one owned listing"],
  ["listing.linkCultivar", "Link one listing to a cultivar"],
  [
    "listing.syncCultivarName",
    "Sync one listing title with its linked cultivar",
  ],
  ["list.create", "Create one list"],
  ["list.update", "Edit one owned list"],
  ["list.addListing", "Add one listing to one list"],
  ["profile.update", "Edit basic profile fields"],
  ["profile.updateContent", "Edit profile story blocks"],
  ["profile.appendParagraph", "Append one profile paragraph"],
  ["profile.updateParagraph", "Edit one profile paragraph"],
  ["image.prepareUpload", "Prepare one signed image upload"],
  ["image.create", "Attach one uploaded image"],
  ["image.reorder", "Reorder owned images"],
] as const;

export const MEMBER_MANAGE_OPERATIONS = [
  ["listing.unlinkCultivar", "Unlink one owned listing from its cultivar"],
  ["listing.delete", "Delete one owned listing"],
  ["list.removeListing", "Remove one listing from an owned list"],
  ["list.removeListings", "Remove selected listings from an owned list"],
  ["list.delete", "Delete one empty owned list"],
  ["image.delete", "Remove one owned image"],
  ["profile.updateWithUrl", "Edit profile fields including its public URL"],
  ["profile.replaceContent", "Replace profile story content"],
] as const;

export const MEMBER_CREATE_ID_FIELDS = {
  "listing.create": "requestId",
  "list.create": "requestId",
  "image.create": "imageId",
} as const;

function resultEnvelope(name: MemberOperationName) {
  return {
    type: "object",
    properties: {
      result: {
        type: "object",
        properties: {
          data: {
            type: "object",
            properties: { json: memberOperationJsonSchema(name) },
            required: ["json"],
          },
        },
        required: ["data"],
      },
    },
    required: ["result"],
  } as const;
}

const errorResponses = {
  "400": { description: "Invalid procedure input." },
  "401": { description: "Missing or rejected OAuth bearer token." },
  "403": {
    description: "OAuth scope, membership, or ownership denied.",
  },
  "404": { description: "Operation or owned record not found." },
  "409": { description: "The record changed since it was read." },
  "412": { description: "The current record does not meet a precondition." },
  "413": { description: "Mutation request body is too large." },
  "429": { description: "The per-client member request budget is exhausted." },
} as const;

export function getMemberOpenApiPaths(
  inputSchemas: Record<string, Record<string, unknown> | null>,
) {
  const paths: Record<
    string,
    { get?: Record<string, unknown>; post?: Record<string, unknown> }
  > = {};
  for (const [name, summary] of MEMBER_READ_OPERATIONS) {
    const inputSchema = inputSchemas[name];
    if (inputSchema === undefined) {
      throw new Error(`Missing member input schema: ${name}`);
    }
    paths[`/api/v1/member/${name}`] = {
      get: {
        tags: ["Member"],
        summary,
        description:
          "Requires a verified Clerk OAuth bearer token with catalog:read scope. Responses use the tRPC JSON envelope. Member records come from the current owner database; cultivar facts use the local public source.",
        security: [{ memberOAuthBearer: [] }],
        ...(inputSchema
          ? {
              parameters: [
                {
                  name: "input",
                  in: "query",
                  required: true,
                  description:
                    "URL-encoded JSON text containing the json envelope.",
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: { json: inputSchema },
                        required: ["json"],
                        additionalProperties: false,
                      },
                    },
                  },
                },
              ],
            }
          : {}),
        responses: {
          "200": {
            description:
              "Owner-scoped result. Pages contain nextCursor, not a total. A filtered listing page can be empty while nextCursor still points to more candidates.",
            content: { "application/json": { schema: resultEnvelope(name) } },
          },
          ...errorResponses,
        },
      },
    };
  }
  for (const [name, summary] of [
    ...MEMBER_WRITE_OPERATIONS,
    ...MEMBER_MANAGE_OPERATIONS,
  ]) {
    const inputSchema = inputSchemas[name];
    if (!inputSchema) {
      throw new Error(`Missing member mutation input schema: ${name}`);
    }
    const isManage = MEMBER_MANAGE_OPERATIONS.some(
      ([operation]) => operation === name,
    );
    paths[`/api/v1/member/${name}`] = {
      post: {
        tags: ["Member"],
        summary,
        description: isManage
          ? "Requires a verified Clerk OAuth bearer token with catalog:manage scope from an allowed member API client, plus a confirmed active membership. The client must present its own review and approval UI before calling this operation. The remote MCP exposes dashboard review links instead."
          : "Requires a verified Clerk OAuth bearer token from an allowed client with catalog:write scope and a confirmed active membership. Send one procedure input in the json property. Creates require a retry ID.",
        security: [{ memberOAuthBearer: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { json: inputSchema },
                required: ["json"],
                additionalProperties: false,
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Saved owner-scoped result.",
            content: { "application/json": { schema: resultEnvelope(name) } },
          },
          ...errorResponses,
        },
      },
    };
  }
  return paths;
}

export function getMemberOpenApiSecuritySchemes() {
  return {
    memberOAuthBearer: {
      type: "http",
      scheme: "bearer",
      bearerFormat: "Clerk OAuth access token",
      description:
        "Use catalog:read for GET operations, catalog:write for safe POST operations, or catalog:manage for member management operations from an allowed member API client. Discovery is at /.well-known/oauth-protected-resource.",
    },
  };
}
import {
  memberOperationJsonSchema,
  type MemberOperationName,
} from "@/lib/member-result-contract";
