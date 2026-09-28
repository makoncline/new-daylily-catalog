// @vitest-environment node

process.env.SKIP_ENV_VALIDATION = "1";
process.env.DATABASE_URL ??= "file:./tests/.tmp/mcp-read-only.sqlite";

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticateRequest: vi.fn(async () => ({
    toAuth: () => ({
      isAuthenticated: false,
      userId: null,
    }),
  })),
  readDb: {
    cultivarReference: { findFirst: vi.fn() },
    list: {
      findMany: vi.fn(),
    },
    listing: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    userProfile: {
      findFirst: vi.fn(),
    },
  },
  memberDb: {
    $queryRaw: vi.fn(),
    image: { findMany: vi.fn() },
    list: { findFirst: vi.fn(), findMany: vi.fn() },
    listing: { findFirst: vi.fn(), findMany: vi.fn() },
    user: { findUnique: vi.fn() },
    userProfile: { findUnique: vi.fn() },
  },
  hasLocalPublicReadDb: true,
  proUserIds: ["seller-1"],
}));

vi.mock("server-only", () => ({}));

vi.mock("@/server/clerk/client", () => ({
  getClerk: vi.fn(async () => ({
    authenticateRequest: mocks.authenticateRequest,
  })),
}));

vi.mock("@/server/db", () => ({
  db: mocks.memberDb,
  publicDb: mocks.readDb,
  replicaDb: mocks.readDb,
  get hasLocalPublicReadDb() {
    return mocks.hasLocalPublicReadDb;
  },
}));

vi.mock("@/server/db/getProUserIds", () => ({
  getProUserIds: vi.fn(async () => mocks.proUserIds),
  getActiveProUserIdsForUserIds: vi.fn(async (userIds: string[]) =>
    mocks.proUserIds.filter((userId) => userIds.includes(userId)),
  ),
}));

describe("read-only MCP server", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.hasLocalPublicReadDb = true;
    process.env.DAYLILY_MCP_OAUTH_CLIENT_ID = "mcp_client_test";
    mocks.readDb.user.findUnique.mockImplementation(async ({ where }) => {
      if (where.id === "seller-1") return { id: "seller-1" };
      if (where.id === "inactive-seller") return { id: "inactive-seller" };
      return null;
    });
    mocks.readDb.userProfile.findFirst.mockImplementation(async ({ where }) => {
      if (where.slug === "active") return { userId: "seller-1" };
      if (where.slug === "inactive") return { userId: "inactive-seller" };
      return null;
    });
  });

  it("lists public reads, member reads, and scoped member writes", async () => {
    const { handleMcpRequest } = await import("@/server/mcp/read-only-mcp");
    const { MEMBER_WRITE_OPERATIONS, MEMBER_MANAGE_OPERATIONS } = await import(
      "@/lib/member-api-contract"
    );
    const response = await handleMcpRequest(
      new Request("https://daylilycatalog.com/api/mcp/server", {
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/list",
        }),
        method: "POST",
      }),
    );

    const body = await response.json();
    const parityTools = (
      body as {
        result: {
          tools: Array<{
            name: string;
            inputSchema: {
              properties: { destination?: { enum?: string[] } };
            };
          }>;
        };
      }
    ).result.tools;
    const toolNames = new Set(parityTools.map((tool) => tool.name));
    const safeApiTools = {
      "listing.create": "daylily.create_listing",
      "listing.update": "daylily.update_listing",
      "listing.linkCultivar": "daylily.link_listing_to_cultivar",
      "listing.syncCultivarName": "daylily.sync_listing_cultivar_name",
      "list.create": "daylily.create_list",
      "list.update": "daylily.update_list",
      "list.addListing": "daylily.add_listing_to_list",
      "profile.update": "daylily.update_profile",
      "profile.updateContent": "daylily.update_profile_content",
      "profile.appendParagraph": "daylily.append_profile_paragraph",
      "profile.updateParagraph": "daylily.edit_profile_paragraph",
      "image.prepareUpload": "daylily.prepare_image_upload",
      "image.create": "daylily.attach_uploaded_image",
      "image.reorder": "daylily.reorder_images",
    } satisfies Record<(typeof MEMBER_WRITE_OPERATIONS)[number][0], string>;
    expect(Object.keys(safeApiTools).sort()).toEqual(
      MEMBER_WRITE_OPERATIONS.map(([operation]) => operation).sort(),
    );
    for (const toolName of Object.values(safeApiTools)) {
      expect(toolNames.has(toolName)).toBe(true);
    }
    const managedApiReviewDestinations = {
      "listing.unlinkCultivar": "unlink_listing_cultivar",
      "listing.delete": "delete_listing",
      "list.removeListing": "remove_listings_from_list",
      "list.removeListings": "remove_listings_from_list",
      "list.delete": "delete_list",
      "image.delete": "remove_listing_image",
      "profile.updateWithUrl": "edit_profile_url",
      "profile.replaceContent": "remove_profile_content_block",
    } satisfies Record<(typeof MEMBER_MANAGE_OPERATIONS)[number][0], string>;
    expect(Object.keys(managedApiReviewDestinations).sort()).toEqual(
      MEMBER_MANAGE_OPERATIONS.map(([operation]) => operation).sort(),
    );
    const reviewTool = parityTools.find(
      (tool) => tool.name === "daylily.open_dashboard",
    );
    for (const destination of Object.values(managedApiReviewDestinations)) {
      expect(reviewTool?.inputSchema.properties.destination?.enum).toContain(
        destination,
      );
    }
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(body).toMatchObject({
      id: 1,
      result: {
        tools: [
          {
            name: "daylily.search_cultivars",
            securitySchemes: [{ type: "noauth" }],
            _meta: {
              securitySchemes: [{ type: "noauth" }],
            },
          },
          {
            name: "daylily.get_cultivar",
            securitySchemes: [{ type: "noauth" }],
          },
          {
            name: "daylily.search_public_listings",
            securitySchemes: [{ type: "noauth" }],
          },
          { name: "daylily.get_public_listing" },
          { name: "daylily.list_public_profiles" },
          { name: "daylily.get_public_profile" },
          { name: "daylily.list_public_profile_lists" },
          { name: "daylily.list_public_listings" },
          { name: "daylily.search_help" },
          {
            name: "daylily.get_profile",
            securitySchemes: [{ type: "oauth2", scopes: ["catalog:read"] }],
          },
          { name: "daylily.list_lists" },
          { name: "daylily.get_list" },
          { name: "daylily.list_listings" },
          { name: "daylily.get_listing" },
          { name: "daylily.list_images" },
          { name: "daylily.get_image" },
          { name: "daylily.open_dashboard" },
          { name: "daylily.create_listing" },
          { name: "daylily.update_listing" },
          { name: "daylily.create_list" },
          { name: "daylily.update_list" },
          { name: "daylily.add_listing_to_list" },
          { name: "daylily.link_listing_to_cultivar" },
          { name: "daylily.sync_listing_cultivar_name" },
          { name: "daylily.update_profile" },
          { name: "daylily.append_profile_paragraph" },
          { name: "daylily.edit_profile_paragraph" },
          { name: "daylily.update_profile_content" },
          { name: "daylily.upload_image" },
          { name: "daylily.prepare_image_upload" },
          { name: "daylily.attach_uploaded_image" },
          { name: "daylily.reorder_images" },
        ],
      },
    });
    for (const tool of body.result.tools) {
      expect(tool._meta?.securitySchemes).toEqual(tool.securitySchemes);
      if (tool.annotations?.readOnlyHint) {
        expect(tool.annotations).toMatchObject({
          readOnlyHint: true,
          openWorldHint: false,
          destructiveHint: false,
        });
      } else {
        expect(tool.securitySchemes).toEqual([
          { type: "oauth2", scopes: ["catalog:write"] },
        ]);
        expect(tool.annotations?.destructiveHint).toBe(false);
      }
    }
    const attachImageTool = body.result.tools.find(
      (tool: { name: string }) => tool.name === "daylily.attach_uploaded_image",
    );
    expect(attachImageTool?.inputSchema.required).toContain("imageId");
    expect(attachImageTool?.annotations.idempotentHint).toBe(true);
    const reorderTool = (
      body as unknown as {
        result: {
          tools: Array<{
            name: string;
            inputSchema: { properties: { imageIds?: { maxItems?: number } } };
          }>;
        };
      }
    ).result.tools.find((tool) => tool.name === "daylily.reorder_images");
    expect(reorderTool?.inputSchema.properties.imageIds?.maxItems).toBe(100);
    const profileUpdateTool = body.result.tools.find(
      (tool: { name: string }) => tool.name === "daylily.update_profile",
    );
    expect(profileUpdateTool?.inputSchema.properties.location.maxLength).toBe(
      200,
    );
    expect(profileUpdateTool?.inputSchema.properties.slug).toBeUndefined();
    const dashboardTools = (
      body as unknown as {
        result: {
          tools: Array<{
            name: string;
            inputSchema: {
              properties: {
                destination: { enum: string[] };
                blockId: { maxLength: number };
              };
            };
          }>;
        };
      }
    ).result.tools;
    const dashboardTool = dashboardTools.find(
      (tool) => tool.name === "daylily.open_dashboard",
    );
    expect(dashboardTool?.inputSchema.properties.destination.enum).toContain(
      "remove_profile_content_block",
    );
    expect(dashboardTool?.inputSchema.properties.blockId.maxLength).toBe(128);
    const listingPageTool = body.result.tools.find(
      (tool: { name: string }) => tool.name === "daylily.list_listings",
    );
    expect(listingPageTool?.inputSchema.properties.q.maxLength).toBe(200);
    expect(
      listingPageTool?.inputSchema.properties.cultivarReferenceId.maxLength,
    ).toBe(128);
    expect(listingPageTool?.inputSchema.properties).not.toHaveProperty(
      "cultivarName",
    );
  });

  it("implements basic Streamable HTTP response semantics", async () => {
    const { GET } = await import("@/app/api/mcp/server/route");
    expect(GET().status).toBe(405);

    const { handleMcpRequest } = await import("@/server/mcp/read-only-mcp");

    const notificationResponse = await handleMcpRequest(
      new Request("https://daylilycatalog.com/api/mcp/server", {
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "notifications/initialized",
        }),
        method: "POST",
      }),
    );
    expect(notificationResponse.status).toBe(202);

    const pingResponse = await handleMcpRequest(
      new Request("https://daylilycatalog.com/api/mcp/server", {
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "ping" }),
        method: "POST",
      }),
    );
    expect(pingResponse.status).toBe(200);
    expect(await pingResponse.json()).toEqual({
      jsonrpc: "2.0",
      id: 1,
      result: {},
    });

    const idlessToolCall = await handleMcpRequest(
      new Request("https://daylilycatalog.com/api/mcp/server", {
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "tools/call",
          params: { name: "daylily.create_list", arguments: {} },
        }),
        method: "POST",
      }),
    );
    expect(idlessToolCall.status).toBe(400);
    expect(await idlessToolCall.json()).toMatchObject({
      id: null,
      error: { code: -32600 },
    });
    expect(mocks.authenticateRequest).not.toHaveBeenCalled();

    const batchResponse = await handleMcpRequest(
      new Request("https://daylilycatalog.com/api/mcp/server", {
        body: JSON.stringify([
          {
            jsonrpc: "2.0",
            id: 1,
            method: "tools/list",
          },
        ]),
        method: "POST",
      }),
    );
    expect(batchResponse.status).toBe(400);

    const nullResponse = await handleMcpRequest(
      new Request("https://daylilycatalog.com/api/mcp/server", {
        body: "null",
        method: "POST",
      }),
    );
    expect(nullResponse.status).toBe(400);
    const nullBody: unknown = await nullResponse.json();
    expect(nullBody).toMatchObject({
      id: null,
      error: { code: -32600 },
    });

    const originResponse = await handleMcpRequest(
      new Request("https://daylilycatalog.com/api/mcp/server", {
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/list",
        }),
        headers: { Origin: "https://evil.example" },
        method: "POST",
      }),
    );
    expect(originResponse.status).toBe(403);

    const protocolResponse = await handleMcpRequest(
      new Request("https://daylilycatalog.com/api/mcp/server", {
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/list",
        }),
        headers: { "MCP-Protocol-Version": "1999-01-01" },
        method: "POST",
      }),
    );
    expect(protocolResponse.status).toBe(400);
  });

  it("rejects oversized JSON before authentication", async () => {
    const { handleMcpRequest } = await import("@/server/mcp/read-only-mcp");
    const url = "https://daylilycatalog.com/api/mcp/server";
    const declared = await handleMcpRequest(
      new Request(url, {
        body: "{}",
        headers: { "Content-Length": "99999999" },
        method: "POST",
      }),
    );
    expect(declared.status).toBe(413);

    const streamed = await handleMcpRequest(
      new Request(url, {
        body: new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(new Uint8Array(8_000_000));
            controller.enqueue(new Uint8Array(8_000_000));
            controller.close();
          },
        }),
        method: "POST",
        duplex: "half",
      } as RequestInit),
    );
    expect(streamed.status).toBe(413);
    expect(await streamed.json()).toMatchObject({
      error: { code: -32600, message: "Request too large." },
    });
    expect(mocks.authenticateRequest).not.toHaveBeenCalled();
  });

  it("requires auth for private catalog tools without creating users", async () => {
    const { handleMcpRequest } = await import("@/server/mcp/read-only-mcp");
    const response = await handleMcpRequest(
      new Request("https://daylilycatalog.com/api/mcp/server", {
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 2,
          method: "tools/call",
          params: {
            name: "daylily.get_profile",
            arguments: {},
          },
        }),
        method: "POST",
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toContain(
      'scope="catalog:read"',
    );
    expect(body).toMatchObject({
      id: 2,
      result: {
        isError: true,
        _meta: {
          "mcp/www_authenticate": [
            expect.stringContaining(
              'resource_metadata="https://daylilycatalog.com/.well-known/oauth-protected-resource"',
            ),
          ],
        },
      },
    });
    expect(body.result._meta["mcp/www_authenticate"][0]).toContain(
      'scope="catalog:read"',
    );
    expect(mocks.authenticateRequest).toHaveBeenCalledTimes(1);
  });

  it("rejects private catalog tools when OAuth scope is missing", async () => {
    mocks.authenticateRequest.mockResolvedValueOnce({
      toAuth: () => ({
        clientId: "mcp_client_test",
        isAuthenticated: true,
        scopes: ["email"],
        userId: "user_test",
      }),
    } as never);

    const { handleMcpRequest } = await import("@/server/mcp/read-only-mcp");
    const response = await handleMcpRequest(
      new Request("https://daylilycatalog.com/api/mcp/server", {
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 22,
          method: "tools/call",
          params: {
            name: "daylily.get_profile",
            arguments: {},
          },
        }),
        method: "POST",
      }),
    );

    expect(response.status).toBe(403);
    expect(response.headers.get("www-authenticate")).toContain(
      'error="insufficient_scope"',
    );
    await expect(response.json()).resolves.toMatchObject({
      id: 22,
      result: {
        isError: true,
      },
    });
    expect(mocks.memberDb.user.findUnique).not.toHaveBeenCalled();
  });

  it("rejects private catalog tools when OAuth client id is not the MCP app", async () => {
    mocks.authenticateRequest.mockResolvedValueOnce({
      toAuth: () => ({
        clientId: "other_client",
        isAuthenticated: true,
        scopes: ["catalog:read"],
        userId: "user_test",
      }),
    } as never);

    const { handleMcpRequest } = await import("@/server/mcp/read-only-mcp");
    const response = await handleMcpRequest(
      new Request("https://daylilycatalog.com/api/mcp/server", {
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 23,
          method: "tools/call",
          params: {
            name: "daylily.get_profile",
            arguments: {},
          },
        }),
        method: "POST",
      }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      id: 23,
      result: {
        isError: true,
      },
    });
    expect(mocks.memberDb.user.findUnique).not.toHaveBeenCalled();
  });

  it("lists authenticated owner listings through the read API shape", async () => {
    mocks.authenticateRequest.mockResolvedValueOnce({
      toAuth: () => ({
        clientId: "mcp_client_test",
        isAuthenticated: true,
        scopes: ["catalog:read"],
        userId: "user_test",
      }),
    } as never);
    mocks.memberDb.user.findUnique.mockResolvedValueOnce({
      id: "app-user-1",
      clerkUserId: "user_test",
    });
    mocks.memberDb.listing.findMany.mockResolvedValueOnce([
      {
        id: "listing-1",
        title: "Orange daylily",
        slug: "orange-daylily",
        price: 12,
        description: "Bright orange bloom",
        privateNote: "needs division",
        status: null,
        cultivarReferenceId: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-02T00:00:00.000Z"),
        cultivarReference: null,
        images: [],
        lists: [{ id: "list-1", title: "Field A" }],
        _count: { images: 0, imageAssets: 1, lists: 1 },
      },
      {
        id: "listing-2",
        title: "Rose daylily",
        slug: "rose-daylily",
        price: null,
        description: "Pink rose blend",
        privateNote: "keeper",
        status: "HIDDEN",
        cultivarReferenceId: null,
        createdAt: new Date("2026-01-03T00:00:00.000Z"),
        updatedAt: new Date("2026-01-04T00:00:00.000Z"),
        cultivarReference: null,
        images: [],
        lists: [{ id: "list-2", title: "Seedlings" }],
        _count: { images: 0, imageAssets: 0, lists: 1 },
      },
    ]);
    mocks.memberDb.$queryRaw.mockResolvedValueOnce([
      { id: "listing-1", hasPhoto: 1 },
      { id: "listing-2", hasPhoto: 0 },
    ]);

    const { handleMcpRequest } = await import("@/server/mcp/read-only-mcp");
    const response = await handleMcpRequest(
      new Request("https://daylilycatalog.com/api/mcp/server", {
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 3,
          method: "tools/call",
          params: {
            name: "daylily.list_listings",
            arguments: {},
          },
        }),
        method: "POST",
      }),
    );

    const body = await response.json();

    expect(body).toMatchObject({
      id: 3,
      result: {
        structuredContent: {
          items: [
            {
              id: "listing-1",
              title: "Orange daylily",
              hasPhoto: true,
            },
            {
              id: "listing-2",
              title: "Rose daylily",
            },
          ],
          nextCursor: null,
        },
      },
    });
    expect(body.result.structuredContent.items[0]).not.toHaveProperty(
      "privateNote",
    );
    expect(mocks.memberDb.listing.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [{ userId: "app-user-1" }, { id: { gte: "" } }],
        },
      }),
    );
    expect(mocks.readDb.listing.findMany).not.toHaveBeenCalled();
  });

  it("passes owner listing search filters through the read API shape", async () => {
    mocks.authenticateRequest.mockResolvedValueOnce({
      toAuth: () => ({
        clientId: "mcp_client_test",
        isAuthenticated: true,
        scopes: ["catalog:read"],
        userId: "user_test",
      }),
    } as never);
    mocks.memberDb.user.findUnique.mockResolvedValueOnce({
      id: "app-user-1",
      clerkUserId: "user_test",
    });
    mocks.memberDb.$queryRaw.mockResolvedValueOnce([{ id: "listing-1" }]);
    mocks.memberDb.listing.findMany.mockResolvedValueOnce([]);

    const { handleMcpRequest } = await import("@/server/mcp/read-only-mcp");
    const response = await handleMcpRequest(
      new Request("https://daylilycatalog.com/api/mcp/server", {
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 4,
          method: "tools/call",
          params: {
            name: "daylily.list_listings",
            arguments: {
              cultivarReferenceId: "cr-1",
              hasPhoto: true,
              limit: 100,
              listId: "list-1",
            },
          },
        }),
        method: "POST",
      }),
    );

    await expect(response.json()).resolves.toMatchObject({
      id: 4,
      result: {
        structuredContent: {
          items: [],
          nextCursor: null,
        },
      },
    });
    expect(mocks.memberDb.listing.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 101,
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            { id: { in: ["listing-1"] } },
            expect.objectContaining({
              AND: expect.arrayContaining([
                { userId: "app-user-1" },
                { cultivarReferenceId: "cr-1" },
                {
                  OR: [
                    { images: { some: {} } },
                    { imageAssets: { some: { status: "ready" } } },
                  ],
                },
              ]),
            }),
          ]),
        }),
      }),
    );
    expect(mocks.memberDb.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it("reads owned listing state from the primary and cultivar detail locally", async () => {
    mocks.authenticateRequest.mockResolvedValueOnce({
      toAuth: () => ({
        clientId: "mcp_client_test",
        isAuthenticated: true,
        scopes: ["catalog:read"],
        userId: "user_test",
      }),
    } as never);
    mocks.memberDb.user.findUnique.mockResolvedValueOnce({
      id: "app-user-1",
      clerkUserId: "user_test",
    });
    mocks.memberDb.listing.findFirst.mockResolvedValueOnce({
      id: "listing-1",
      title: "Orange daylily",
      slug: "orange-daylily",
      price: 12,
      description: "Bright orange bloom",
      privateNote: "Check stock",
      status: null,
      cultivarReferenceId: "cr-1",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    });
    mocks.memberDb.image.findMany.mockResolvedValueOnce([]);
    mocks.memberDb.$queryRaw.mockResolvedValueOnce([]);
    mocks.readDb.cultivarReference.findFirst.mockResolvedValueOnce({
      id: "cr-1",
      ahsId: null,
      v2AhsCultivarId: null,
      normalizedName: "orange daylily",
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      v2AhsCultivar: null,
      imageAssets: [],
    });

    const { handleMcpRequest } = await import("@/server/mcp/read-only-mcp");
    const response = await handleMcpRequest(
      new Request("https://daylilycatalog.com/api/mcp/server", {
        method: "POST",
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 5,
          method: "tools/call",
          params: {
            name: "daylily.get_listing",
            arguments: { id: "listing-1" },
          },
        }),
      }),
    );

    await expect(response.json()).resolves.toMatchObject({
      result: {
        structuredContent: {
          listing: {
            id: "listing-1",
            privateNote: "Check stock",
            cultivarReferenceId: "cr-1",
            cultivar: { id: "cr-1" },
            listsNextCursor: null,
          },
        },
      },
    });
    expect(mocks.memberDb.listing.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "listing-1", userId: "app-user-1" },
        select: expect.not.objectContaining({
          cultivarReference: expect.anything(),
        }),
      }),
    );
    expect(mocks.memberDb.image.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { listingId: "listing-1" }, take: 21 }),
    );
    expect(mocks.memberDb.$queryRaw).toHaveBeenCalledTimes(1);
    expect(mocks.readDb.cultivarReference.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "cr-1" } }),
    );
  });

  it("pages owned image IDs for the remote member", async () => {
    mocks.authenticateRequest.mockResolvedValue({
      toAuth: () => ({
        clientId: "mcp_client_test",
        isAuthenticated: true,
        scopes: ["catalog:read"],
        userId: "user_test",
      }),
    } as never);
    mocks.memberDb.user.findUnique.mockResolvedValue({ id: "app-user-1" });
    mocks.memberDb.listing.findFirst.mockResolvedValue({ id: "listing-1" });
    mocks.memberDb.$queryRaw
      .mockResolvedValueOnce([
        { id: "image-1", url: "https://example.com/1", order: 2 },
        { id: "image-2", url: "https://example.com/2", order: 1 },
      ])
      .mockResolvedValueOnce([
        { id: "image-2", url: "https://example.com/2", order: 1 },
      ]);
    const { handleMcpRequest } = await import("@/server/mcp/read-only-mcp");
    const call = async (cursor?: string) => {
      const response = await handleMcpRequest(
        new Request("https://daylilycatalog.com/api/mcp/server", {
          method: "POST",
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 56,
            method: "tools/call",
            params: {
              name: "daylily.list_images",
              arguments: {
                type: "listing",
                referenceId: "listing-1",
                limit: 1,
                ...(cursor ? { cursor } : {}),
              },
            },
          }),
        }),
      );
      return response.json();
    };
    const first = await call();
    expect(first.result.structuredContent).toMatchObject({
      items: [{ id: "image-1", order: 2 }],
      nextCursor: "image-1",
    });
    const second = await call("image-1");
    expect(second.result.structuredContent).toMatchObject({
      items: [{ id: "image-2", order: 1 }],
      nextCursor: null,
    });
    expect(mocks.memberDb.$queryRaw).toHaveBeenCalledTimes(2);
  });

  it("keeps an owned listing readable when local cultivar data is absent", async () => {
    mocks.hasLocalPublicReadDb = false;
    mocks.authenticateRequest.mockResolvedValueOnce({
      toAuth: () => ({
        clientId: "mcp_client_test",
        isAuthenticated: true,
        scopes: ["catalog:read"],
        userId: "user_test",
      }),
    } as never);
    mocks.memberDb.user.findUnique.mockResolvedValueOnce({
      id: "app-user-1",
      clerkUserId: "user_test",
    });
    mocks.memberDb.listing.findFirst.mockResolvedValueOnce({
      id: "listing-1",
      title: "Orange daylily",
      slug: "orange-daylily",
      price: null,
      description: null,
      privateNote: null,
      status: null,
      cultivarReferenceId: "cr-1",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    mocks.memberDb.image.findMany.mockResolvedValueOnce([]);
    mocks.memberDb.$queryRaw.mockResolvedValueOnce([]);

    const { handleMcpRequest } = await import("@/server/mcp/read-only-mcp");
    const response = await handleMcpRequest(
      new Request("https://daylilycatalog.com/api/mcp/server", {
        method: "POST",
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 6,
          method: "tools/call",
          params: {
            name: "daylily.get_listing",
            arguments: { id: "listing-1" },
          },
        }),
      }),
    );

    await expect(response.json()).resolves.toMatchObject({
      result: {
        structuredContent: {
          listing: { cultivarReferenceId: "cr-1", cultivar: null },
        },
      },
    });
    expect(mocks.readDb.cultivarReference.findFirst).not.toHaveBeenCalled();
  });

  it("searches curated help without database reads", async () => {
    const { handleMcpRequest } = await import("@/server/mcp/read-only-mcp");
    const response = await handleMcpRequest(
      new Request("https://daylilycatalog.com/api/mcp/server", {
        method: "POST",
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 41,
          method: "tools/call",
          params: {
            name: "daylily.search_help",
            arguments: { query: "delete nonempty list" },
          },
        }),
      }),
    );
    const body = await response.json();
    expect(body.result.structuredContent.results[0]).toMatchObject({
      id: "list-deletion",
      sourceUrl: "https://daylilycatalog.com/dashboard/lists",
    });
    expect(mocks.memberDb.user.findUnique).not.toHaveBeenCalled();
    expect(mocks.readDb.listing.findMany).not.toHaveBeenCalled();
  });

  it("returns list metadata and checks current membership for deletion", async () => {
    mocks.authenticateRequest.mockResolvedValue({
      toAuth: () => ({
        clientId: "mcp_client_test",
        isAuthenticated: true,
        scopes: ["catalog:read"],
        userId: "user_test",
      }),
    } as never);
    mocks.memberDb.user.findUnique.mockResolvedValue({ id: "app-user-1" });
    mocks.memberDb.$queryRaw.mockResolvedValueOnce([
      {
        id: "list-1",
        title: "Spring",
        description: "Large collection",
        status: null,
        updatedAt: new Date("2026-01-02T00:00:00.000Z"),
      },
    ]);
    mocks.memberDb.list.findFirst.mockResolvedValueOnce({
      id: "list-1",
      title: "Spring",
      description: "Large collection",
      status: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    });
    mocks.memberDb.$queryRaw.mockResolvedValueOnce([{ id: "list-1" }]);
    const { handleMcpRequest } = await import("@/server/mcp/read-only-mcp");
    const call = async (name: string, args: object) => {
      const response = await handleMcpRequest(
        new Request("https://daylilycatalog.com/api/mcp/server", {
          method: "POST",
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 42,
            method: "tools/call",
            params: { name, arguments: args },
          }),
        }),
      );
      return response.json();
    };
    const page = await call("daylily.list_lists", {});
    mocks.memberDb.list.findMany.mockResolvedValueOnce([
      {
        id: "list-1",
        title: "Spring",
        status: null,
        updatedAt: new Date("2026-01-02T00:00:00.000Z"),
      },
    ]);
    const filtered = await call("daylily.list_lists", {
      listingId: "listing-1",
    });
    mocks.memberDb.$queryRaw.mockResolvedValueOnce([{ present: 1 }]);
    const detail = await call("daylily.get_list", { id: "list-1" });
    expect(filtered.result.structuredContent.items).toHaveLength(1);
    expect(mocks.memberDb.list.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "app-user-1",
          id: { in: ["list-1"] },
        }),
      }),
    );
    expect(page.result.structuredContent.items[0]).toMatchObject({
      dashboardUrl: "https://daylilycatalog.com/dashboard/lists?editing=list-1",
    });
    expect(detail.result.structuredContent.list).toMatchObject({
      description: "Large collection",
      deleteReviewUrl: null,
    });
    expect(page.result.structuredContent.items[0]).not.toHaveProperty(
      "listingCount",
    );
    expect(detail.result.structuredContent.list).not.toHaveProperty(
      "listingCount",
    );
    expect(detail.result.structuredContent.list).not.toHaveProperty("listings");
    mocks.memberDb.list.findFirst.mockResolvedValueOnce({
      id: "list-1",
      title: "Spring",
      description: null,
      status: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    });
    mocks.memberDb.$queryRaw.mockResolvedValueOnce([]);
    const emptyDetail = await call("daylily.get_list", { id: "list-1" });
    expect(emptyDetail.result.structuredContent.list.deleteReviewUrl).toBe(
      "https://daylilycatalog.com/dashboard/lists?editing=list-1&intent=delete",
    );
    expect(mocks.memberDb.$queryRaw).toHaveBeenCalledTimes(4);
  });

  it("searches public listings without exposing private catalog fields", async () => {
    mocks.readDb.listing.findMany.mockResolvedValueOnce([]);

    const { handleMcpRequest } = await import("@/server/mcp/read-only-mcp");
    const response = await handleMcpRequest(
      new Request("https://daylilycatalog.com/api/mcp/server", {
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 5,
          method: "tools/call",
          params: {
            name: "daylily.search_public_listings",
            arguments: {
              color: "purple",
              hasPrice: true,
              limit: 10,
              listTitle: "Spring intros",
              priceMax: 20,
            },
          },
        }),
        method: "POST",
      }),
    );

    await expect(response.json()).resolves.toMatchObject({
      id: 5,
      result: {
        structuredContent: {
          items: [],
          nextCursor: null,
        },
      },
    });
    expect(mocks.readDb.listing.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 11,
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({
              userId: { in: ["seller-1"] },
            }),
            {
              lists: {
                some: {
                  OR: [{ status: null }, { NOT: { status: "HIDDEN" } }],
                  title: { contains: "Spring intros" },
                },
              },
            },
            { price: { gt: 0 } },
            { price: { lte: 20 } },
            expect.objectContaining({ OR: expect.any(Array) }),
          ]),
        }),
      }),
    );
    const publicListingSearchCall = mocks.readDb.listing.findMany.mock.calls
      .map(([call]) => call)
      .find((call) => call?.select?.lists);
    expect(publicListingSearchCall?.select).not.toHaveProperty("privateNote");
    expect(publicListingSearchCall?.select.lists.where).toEqual({
      OR: [{ status: null }, { NOT: { status: "HIDDEN" } }],
    });
    expect(mocks.memberDb.listing.findMany).not.toHaveBeenCalled();
  });

  it("returns sanitized public listing fields through MCP", async () => {
    mocks.readDb.listing.findMany.mockResolvedValueOnce([
      {
        id: "listing-1",
        title: "Orange daylily",
        slug: "orange-daylily",
        description: "Bright public description",
        price: 12,
        userId: "seller-1",
        updatedAt: new Date("2026-01-02T00:00:00.000Z"),
        user: {
          profile: {
            slug: "active",
            title: "Active Garden",
          },
        },
        lists: [{ id: "list-1", title: "Spring" }],
        cultivarReference: {
          id: "cultivar-1",
          normalizedName: "orange daylily",
          v2AhsCultivar: null,
          imageAssets: [
            {
              id: "cultivar-asset",
              legacyImageId: null,
              status: "ready",
              displayUrl: "https://media.daylilycatalog.com/cultivar.webp",
              originalUrl: "https://media.daylilycatalog.com/cultivar.png",
              thumbUrl: null,
              blurUrl: null,
            },
          ],
        },
        cultivarReferenceImage: {
          id: "ahs-listing-1",
          url: "https://media.daylilycatalog.com/cultivar.webp",
          imageAsset: { id: "cultivar-asset" },
        },
        images: [
          {
            id: "image-1",
            url: "https://media.daylilycatalog.com/orange.webp",
            updatedAt: new Date("2026-01-02T00:00:00.000Z"),
            imageAsset: {
              id: "asset-1",
              blurUrl: "https://media.daylilycatalog.com/orange-blur.webp",
            },
          },
        ],
        imageAssets: [
          {
            id: "asset-1",
            legacyImageId: "image-1",
            status: "ready",
            displayUrl: "https://media.daylilycatalog.com/orange.webp",
            originalUrl: "https://media.daylilycatalog.com/orange.png",
            thumbUrl: null,
            blurUrl: "https://media.daylilycatalog.com/orange-blur.webp",
          },
        ],
        hasActiveSubscription: true,
      },
    ]);

    const { handleMcpRequest } = await import("@/server/mcp/read-only-mcp");
    const response = await handleMcpRequest(
      new Request("https://daylilycatalog.com/api/mcp/server", {
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 55,
          method: "tools/call",
          params: {
            name: "daylily.search_public_listings",
            arguments: { sellerSlug: "active" },
          },
        }),
        method: "POST",
      }),
    );

    const body = await response.json();
    const item = body.result.structuredContent.items[0];

    expect(item).toMatchObject({
      canonicalUrl: "https://daylilycatalog.com/active/orange-daylily",
      cultivar: {
        canonicalUrl: "https://daylilycatalog.com/cultivar/orange-daylily",
        id: "cultivar-1",
        normalizedName: "orange daylily",
      },
      images: [
        {
          id: "image-1",
          updatedAt: "2026-01-02T00:00:00.000Z",
          url: "https://media.daylilycatalog.com/orange.webp",
        },
      ],
      seller: {
        slug: "active",
        title: "Active Garden",
      },
    });
    expect(item).not.toHaveProperty("user");
    expect(item).not.toHaveProperty("userId");
    expect(item).not.toHaveProperty("ahsListing");
    expect(item).not.toHaveProperty("cultivarReference");
    expect(item).not.toHaveProperty("cultivarReferenceImage");
    expect(item).not.toHaveProperty("hasActiveSubscription");
    expect(item.images[0]).not.toHaveProperty("imageAsset");
    expect(item.cultivar).not.toHaveProperty("imageAssets");
    expect(item.cultivar).not.toHaveProperty("v2AhsCultivar");
  });

  it("uses public page visibility for exact lookups and rejects missing records", async () => {
    mocks.readDb.listing.findFirst.mockResolvedValueOnce(null);

    const { handleMcpRequest } = await import("@/server/mcp/read-only-mcp");
    const inactiveListingResponse = await handleMcpRequest(
      new Request("https://daylilycatalog.com/api/mcp/server", {
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 51,
          method: "tools/call",
          params: {
            name: "daylily.get_public_listing",
            arguments: { id: "listing-1" },
          },
        }),
        method: "POST",
      }),
    );

    await expect(inactiveListingResponse.json()).resolves.toMatchObject({
      result: {
        isError: true,
        structuredContent: { error: { code: "NOT_FOUND" } },
      },
      id: 51,
    });
    expect(mocks.readDb.listing.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "listing-1",
        }),
      }),
    );
    expect(
      mocks.readDb.listing.findFirst.mock.calls[0]?.[0]?.where,
    ).not.toHaveProperty("userId");

    const inactiveProfileResponse = await handleMcpRequest(
      new Request("https://daylilycatalog.com/api/mcp/server", {
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 52,
          method: "tools/call",
          params: {
            name: "daylily.get_public_profile",
            arguments: { sellerSlug: "missing" },
          },
        }),
        method: "POST",
      }),
    );

    await expect(inactiveProfileResponse.json()).resolves.toMatchObject({
      result: {
        isError: true,
        structuredContent: { error: { code: "NOT_FOUND" } },
      },
      id: 52,
    });
  });

  it("does not expose unexpected MCP error details", async () => {
    const error = new Error("database path leaked");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.readDb.listing.findMany.mockRejectedValueOnce(error);

    const { handleMcpRequest } = await import("@/server/mcp/read-only-mcp");
    const response = await handleMcpRequest(
      new Request("https://daylilycatalog.com/api/mcp/server", {
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 53,
          method: "tools/call",
          params: {
            name: "daylily.search_public_listings",
            arguments: {},
          },
        }),
        method: "POST",
      }),
    );

    await expect(response.json()).resolves.toMatchObject({
      result: {
        isError: true,
        structuredContent: {
          error: {
            code: "INTERNAL_ERROR",
            message: "The tool could not complete the request.",
          },
        },
      },
      id: 53,
    });
    expect(errorSpy).toHaveBeenCalledWith("Unexpected MCP error:", error);
  });

  it("rejects oversized public search input before reading the database", async () => {
    const { handleMcpRequest } = await import("@/server/mcp/read-only-mcp");
    for (const argumentsValue of [
      { q: "x".repeat(201) },
      { limit: 101 },
      { userId: "ignored-owner-filter" },
    ]) {
      const response = await handleMcpRequest(
        new Request("https://daylilycatalog.com/api/mcp/server", {
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 54,
            method: "tools/call",
            params: {
              name: "daylily.search_public_listings",
              arguments: argumentsValue,
            },
          }),
          method: "POST",
        }),
      );
      await expect(response.json()).resolves.toMatchObject({
        result: {
          isError: true,
          structuredContent: { error: { code: "INVALID_ARGUMENTS" } },
        },
        id: 54,
      });
    }
    expect(mocks.readDb.listing.findMany).not.toHaveBeenCalled();
  });

  it("keeps deletion and batch removal out of direct remote tools", async () => {
    const { handleMcpRequest } = await import("@/server/mcp/read-only-mcp");
    const response = await handleMcpRequest(
      new Request("https://daylilycatalog.com/api/mcp/server", {
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 4,
          method: "tools/list",
        }),
        method: "POST",
      }),
    );
    const body = await response.json();
    const tools = body.result.tools as Array<{
      description: string;
      name: string;
    }>;

    expect(tools.map((tool) => tool.name)).toEqual([
      "daylily.search_cultivars",
      "daylily.get_cultivar",
      "daylily.search_public_listings",
      "daylily.get_public_listing",
      "daylily.list_public_profiles",
      "daylily.get_public_profile",
      "daylily.list_public_profile_lists",
      "daylily.list_public_listings",
      "daylily.search_help",
      "daylily.get_profile",
      "daylily.list_lists",
      "daylily.get_list",
      "daylily.list_listings",
      "daylily.get_listing",
      "daylily.list_images",
      "daylily.get_image",
      "daylily.open_dashboard",
      "daylily.create_listing",
      "daylily.update_listing",
      "daylily.create_list",
      "daylily.update_list",
      "daylily.add_listing_to_list",
      "daylily.link_listing_to_cultivar",
      "daylily.sync_listing_cultivar_name",
      "daylily.update_profile",
      "daylily.append_profile_paragraph",
      "daylily.edit_profile_paragraph",
      "daylily.update_profile_content",
      "daylily.upload_image",
      "daylily.prepare_image_upload",
      "daylily.attach_uploaded_image",
      "daylily.reorder_images",
    ]);
    expect(tools.every((tool) => tool.name !== "daylily.delete_listing")).toBe(
      true,
    );
    expect(
      tools.every((tool) => tool.name !== "daylily.remove_listings_from_list"),
    ).toBe(true);
  });

  it("returns a verified listing deletion handoff without deleting", async () => {
    mocks.authenticateRequest.mockResolvedValue({
      toAuth: () => ({
        clientId: "mcp_client_test",
        isAuthenticated: true,
        scopes: ["catalog:read"],
        userId: "user_test",
      }),
    } as never);
    mocks.memberDb.user.findUnique.mockResolvedValue({ id: "app-user-1" });
    mocks.memberDb.listing.findFirst.mockResolvedValueOnce({
      title: "Orange daylily",
    });

    const { handleMcpRequest } = await import("@/server/mcp/read-only-mcp");
    const response = await handleMcpRequest(
      new Request("https://daylilycatalog.com/api/mcp/server", {
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 20,
          method: "tools/call",
          params: {
            name: "daylily.open_dashboard",
            arguments: { destination: "delete_listing", id: "listing-1" },
          },
        }),
        method: "POST",
      }),
    );
    const body = await response.json();
    expect(body.result.structuredContent).toEqual({
      url: "https://daylilycatalog.com/dashboard/listings?editing=listing-1&intent=delete",
      destination: "delete_listing",
      title: "Orange daylily",
      canComplete: true,
      nextStep:
        "Open this link and review the confirmation. Deletion requires a click.",
    });
    expect(body.result.content[0].text).toContain("intent=delete");
    expect(mocks.memberDb.listing.findFirst).toHaveBeenCalledWith({
      where: { id: "listing-1", userId: "app-user-1" },
      select: { title: true, cultivarReferenceId: true },
    });
    expect(mocks.memberDb.user.findUnique).toHaveBeenCalledTimes(1);
    expect(mocks.memberDb.listing.findFirst).toHaveBeenCalledTimes(1);
    expect(mocks.readDb.listing.findFirst).not.toHaveBeenCalled();
  });

  it("rejects foreign records and withholds deletion intent for nonempty lists", async () => {
    mocks.authenticateRequest.mockResolvedValue({
      toAuth: () => ({
        clientId: "mcp_client_test",
        isAuthenticated: true,
        scopes: ["catalog:read"],
        userId: "user_test",
      }),
    } as never);
    mocks.memberDb.user.findUnique.mockResolvedValue({ id: "app-user-1" });
    mocks.memberDb.listing.findFirst.mockResolvedValueOnce(null);
    mocks.memberDb.list.findFirst.mockResolvedValueOnce({
      title: "Spring",
    });
    mocks.memberDb.$queryRaw.mockResolvedValueOnce([{ present: 1 }]);
    const { handleMcpRequest } = await import("@/server/mcp/read-only-mcp");
    const call = async (destination: string, id: string) => {
      const response = await handleMcpRequest(
        new Request("https://daylilycatalog.com/api/mcp/server", {
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 21,
            method: "tools/call",
            params: {
              name: "daylily.open_dashboard",
              arguments: { destination, id },
            },
          }),
          method: "POST",
        }),
      );
      return response.json();
    };
    const foreign = await call("delete_listing", "foreign-listing");
    expect(foreign.result).toMatchObject({
      isError: true,
      structuredContent: {
        error: { code: "NOT_FOUND", message: "Listing not found." },
      },
    });

    const nonempty = await call("delete_list", "list-1");
    expect(nonempty.result.structuredContent).toMatchObject({
      url: "https://daylilycatalog.com/dashboard/lists/list-1",
      title: "Spring",
      canComplete: false,
      nextStep: "Remove the listings from this list before deletion.",
    });
    expect(mocks.memberDb.list.findFirst).toHaveBeenCalledWith({
      where: { id: "list-1", userId: "app-user-1" },
      select: { title: true },
    });
  });

  it("blocks public database tools when no local public database exists", async () => {
    mocks.hasLocalPublicReadDb = false;
    const { handleMcpRequest } = await import("@/server/mcp/read-only-mcp");
    const listed = await handleMcpRequest(
      new Request("https://daylilycatalog.com/api/mcp/server", {
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 21,
          method: "tools/list",
        }),
        method: "POST",
      }),
    );
    const listedBody = await listed.json();
    const names = listedBody.result.tools.map(
      (tool: { name: string }) => tool.name,
    );
    expect(names).toContain("daylily.search_cultivars");
    expect(names).toContain("daylily.search_help");
    expect(names).not.toContain("daylily.get_public_listing");
    for (const name of [
      "daylily.get_cultivar",
      "daylily.search_public_listings",
      "daylily.get_public_listing",
      "daylily.list_public_profiles",
      "daylily.get_public_profile",
      "daylily.list_public_profile_lists",
      "daylily.list_public_listings",
    ]) {
      const response = await handleMcpRequest(
        new Request("https://daylilycatalog.com/api/mcp/server", {
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 22,
            method: "tools/call",
            params: { name, arguments: {} },
          }),
          method: "POST",
        }),
      );
      const body = await response.json();
      expect(body.result).toMatchObject({
        isError: true,
        structuredContent: {
          error: {
            code: "FORBIDDEN",
            message: "Public catalog data is unavailable on this server.",
          },
        },
      });
    }
    expect(mocks.readDb.listing.findFirst).not.toHaveBeenCalled();
    expect(mocks.memberDb.listing.findFirst).not.toHaveBeenCalled();
    expect(mocks.memberDb.user.findUnique).not.toHaveBeenCalled();
  });

  it("builds an MCP server card that points at the MCP endpoint", async () => {
    const { getMcpServerCard } = await import("@/server/mcp/read-only-mcp");

    expect(getMcpServerCard("https://daylilycatalog.com")).toMatchObject({
      serverInfo: {
        name: "daylily-catalog",
      },
      transports: [
        {
          type: "streamable-http",
          url: "https://daylilycatalog.com/api/mcp/server",
        },
      ],
      authentication: {
        protectedResourceMetadata:
          "https://daylilycatalog.com/.well-known/oauth-protected-resource",
      },
    });
  });
});
