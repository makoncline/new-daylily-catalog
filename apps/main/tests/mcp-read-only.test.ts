// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticateRequest: vi.fn(async () => ({
    toAuth: () => ({
      isAuthenticated: false,
      userId: null,
    }),
  })),
  readDb: {
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
  proUserIds: ["seller-1"],
}));

vi.mock("server-only", () => ({}));

vi.mock("@/server/clerk/client", () => ({
  getClerk: vi.fn(async () => ({
    authenticateRequest: mocks.authenticateRequest,
  })),
}));

vi.mock("@/server/db", () => ({
  db: mocks.readDb,
  replicaDb: mocks.readDb,
}));

vi.mock("@/server/db/getProUserIds", () => ({
  getProUserIds: vi.fn(async () => mocks.proUserIds),
}));

describe("read-only MCP server", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it("lists the read-only Daylily tools", async () => {
    const { handleMcpRequest } = await import("@/server/mcp/read-only-mcp");
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
          { name: "daylily.get_public_profile" },
          { name: "daylily.list_public_profile_lists" },
          { name: "daylily.list_public_listings" },
          {
            name: "daylily.get_profile",
            securitySchemes: [{ type: "oauth2", scopes: ["profile"] }],
          },
          { name: "daylily.list_lists" },
          { name: "daylily.get_list" },
          { name: "daylily.list_listings" },
          { name: "daylily.get_listing" },
        ],
      },
    });
    for (const tool of body.result.tools) {
      expect(tool._meta?.securitySchemes).toEqual(tool.securitySchemes);
    }
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
    expect(
      body.result._meta["mcp/www_authenticate"][0],
    ).toContain('scope="profile"');
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

    await expect(response.json()).resolves.toMatchObject({
      id: 22,
      result: {
        isError: true,
      },
    });
    expect(mocks.readDb.user.findUnique).not.toHaveBeenCalled();
  });

  it("rejects private catalog tools when OAuth client id is not the MCP app", async () => {
    mocks.authenticateRequest.mockResolvedValueOnce({
      toAuth: () => ({
        clientId: "other_client",
        isAuthenticated: true,
        scopes: ["profile"],
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

    await expect(response.json()).resolves.toMatchObject({
      id: 23,
      result: {
        isError: true,
      },
    });
    expect(mocks.readDb.user.findUnique).not.toHaveBeenCalled();
  });

  it("lists authenticated owner listings through the read API shape", async () => {
    mocks.authenticateRequest.mockResolvedValueOnce({
      toAuth: () => ({
        clientId: "mcp_client_test",
        isAuthenticated: true,
        scopes: ["profile"],
        userId: "user_test",
      }),
    } as never);
    mocks.readDb.user.findUnique.mockResolvedValueOnce({
      id: "app-user-1",
      clerkUserId: "user_test",
    });
    mocks.readDb.listing.findMany.mockResolvedValueOnce([
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
      },
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
              privateNote: "needs division",
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
    expect(mocks.readDb.listing.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [{ userId: "app-user-1" }],
        },
      }),
    );
  });

  it("passes owner listing search filters through the read API shape", async () => {
    mocks.authenticateRequest.mockResolvedValueOnce({
      toAuth: () => ({
        clientId: "mcp_client_test",
        isAuthenticated: true,
        scopes: ["profile"],
        userId: "user_test",
      }),
    } as never);
    mocks.readDb.user.findUnique.mockResolvedValueOnce({
      id: "app-user-1",
      clerkUserId: "user_test",
    });
    mocks.readDb.listing.findMany.mockResolvedValueOnce([]);

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
              color: "blue",
              hasPhoto: true,
              hybridizer: "Stamile",
              limit: 500,
              listId: "list-1",
              year: "2020",
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
    expect(mocks.readDb.listing.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 501,
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            { userId: "app-user-1" },
            { lists: { some: { id: "list-1" } } },
            { images: { some: {} } },
            expect.objectContaining({ OR: expect.any(Array) }),
          ]),
        }),
      }),
    );
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
  });

  it("gates public MCP point lookups to active public catalogs", async () => {
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
      error: {
        code: -32004,
      },
      id: 51,
    });
    expect(mocks.readDb.listing.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "listing-1",
          userId: { in: ["seller-1"] },
        }),
      }),
    );

    const inactiveProfileResponse = await handleMcpRequest(
      new Request("https://daylilycatalog.com/api/mcp/server", {
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 52,
          method: "tools/call",
          params: {
            name: "daylily.get_public_profile",
            arguments: { sellerSlug: "inactive" },
          },
        }),
        method: "POST",
      }),
    );

    await expect(inactiveProfileResponse.json()).resolves.toMatchObject({
      error: {
        code: -32004,
      },
      id: 52,
    });
  });

  it("keeps private tools limited to read API wrappers", async () => {
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
      "daylily.get_public_profile",
      "daylily.list_public_profile_lists",
      "daylily.list_public_listings",
      "daylily.get_profile",
      "daylily.list_lists",
      "daylily.get_list",
      "daylily.list_listings",
      "daylily.get_listing",
    ]);
    expect(tools.map((tool) => tool.name).join(" ")).not.toMatch(
      /analyze|create|update|upload|attach|add|remove|delete/,
    );
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
