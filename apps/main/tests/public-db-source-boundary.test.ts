// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";
import type { TRPCInternalContext } from "@/server/api/trpc";

vi.mock("server-only", () => ({}));

vi.mock("@/env", () => ({
  env: {
    DATABASE_URL: "libsql://127.0.0.1:1",
    TURSO_DATABASE_AUTH_TOKEN: "local-test-token",
    NODE_ENV: "test",
  },
  isFileDatabaseUrl: (url: string) => url.startsWith("file:"),
  isLibsqlDatabaseUrl: (url: string) => url.startsWith("libsql://"),
  requireEnv: (_name: string, value: string | undefined) => value,
}));

vi.mock("@/server/api/member-oauth", () => ({
  getScopedOAuthClient: async () => ({
    status: "authorized",
    clerkUserId: "test-member",
    clientId: "test-client",
  }),
}));

afterEach(() => vi.unstubAllEnvs());

describe("public database source boundary", () => {
  it("rejects public read models when only a remote primary is configured", async () => {
    const { db, hasLocalPublicReadDb, replicaDb } = await import("@/server/db");
    const { getPublicListingDetail } = await import(
      "@/server/db/public-listing-read-model"
    );
    const { getPublicProfiles } = await import(
      "@/server/db/public-seller-read-model"
    );
    const { getPublicCultivarPage } = await import(
      "@/server/db/public-cultivar-read-model"
    );
    const { toCultivarRouteSegment } = await import(
      "@/lib/utils/cultivar-utils"
    );
    const { dashboardDbAhsRouter } = await import(
      "@/server/api/routers/dashboard-db/ahs"
    );
    const { dashboardDbCultivarReferenceRouter } = await import(
      "@/server/api/routers/dashboard-db/cultivar-reference"
    );
    const { publicRouter } = await import("@/server/api/routers/public");

    expect(hasLocalPublicReadDb).toBe(false);
    expect(replicaDb).toBe(db);
    await expect(getPublicListingDetail("listing-1")).rejects.toThrow(
      "Public database reads require local SQLite or an embedded replica.",
    );
    await expect(getPublicProfiles()).rejects.toThrow(
      "Public database reads require local SQLite or an embedded replica.",
    );
    await expect(
      getPublicCultivarPage(toCultivarRouteSegment("a few good men")!),
    ).rejects.toThrow(
      "Public database reads require local SQLite or an embedded replica.",
    );
    const publicCaller = publicRouter.createCaller({
      db,
      headers: new Headers(),
    });
    await expect(
      publicCaller.searchListings({ title: "Stella" }),
    ).rejects.toThrow(
      "Public database reads require local SQLite or an embedded replica.",
    );
    await expect(
      publicCaller.getListings({ userSlugOrId: "seller-1" }),
    ).rejects.toThrow(
      "Public database reads require local SQLite or an embedded replica.",
    );
    const { GET: searchPublicListings } = await import(
      "@/app/api/v1/public/listings/route"
    );
    const { GET: getPublicListing } = await import(
      "@/app/api/v1/public/listings/[id]/route"
    );
    const { GET: getPublicListingByPath } = await import(
      "@/app/api/v1/public/profiles/[slugOrId]/listings/[listingSlugOrId]/route"
    );
    const { GET: getPublicProfile } = await import(
      "@/app/api/v1/public/profiles/[slugOrId]/route"
    );
    const { GET: pagePublicProfiles } = await import(
      "@/app/api/v1/public/profiles/route"
    );
    const { GET: getPublicCultivar } = await import(
      "@/app/api/v1/public/cultivars/route"
    );
    expect(
      (
        await getPublicCultivar(
          new Request(
            "http://localhost/api/v1/public/cultivars?cultivarReferenceId=cr-1",
          ),
        )
      ).status,
    ).toBe(503);
    expect(
      (
        await pagePublicProfiles(
          new Request("http://localhost/api/v1/public/profiles?limit=1"),
        )
      ).status,
    ).toBe(503);
    expect(
      (
        await searchPublicListings(
          new Request("http://localhost/api/v1/public/listings?limit=1"),
        )
      ).status,
    ).toBe(503);
    expect(
      (
        await getPublicListing(
          new Request("http://localhost/api/v1/public/listings/listing-1"),
          { params: Promise.resolve({ id: "listing-1" }) },
        )
      ).status,
    ).toBe(503);
    expect(
      (
        await getPublicListingByPath(
          new Request(
            "http://localhost/api/v1/public/profiles/seller-1/listings/listing-1",
          ),
          {
            params: Promise.resolve({
              slugOrId: "seller-1",
              listingSlugOrId: "listing-1",
            }),
          },
        )
      ).status,
    ).toBe(503);
    expect(
      (
        await getPublicProfile(
          new Request("http://localhost/api/v1/public/profiles/seller-1"),
          { params: Promise.resolve({ slugOrId: "seller-1" }) },
        )
      ).status,
    ).toBe(503);
    const { handleMemberHttpRequest } = await import(
      "@/server/api/member-http"
    );
    vi.stubEnv("DAYLILY_MEMBER_API_OAUTH_CLIENT_IDS", "test-client");
    expect(
      (
        await handleMemberHttpRequest(
          new Request("http://localhost/api/v1/member/cultivar.search"),
          "cultivar.search",
        )
      ).status,
    ).toBe(401);
    for (const path of ["cultivar.search", "cultivar.get"]) {
      const response = await handleMemberHttpRequest(
        new Request(`http://localhost/api/v1/member/${path}`, {
          headers: { Authorization: "Bearer local-test-token" },
        }),
        path,
      );
      expect(response.status).toBe(503);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
    }
    const cultivarCaller = dashboardDbAhsRouter.createCaller({
      db,
      replicaDb,
      hasReplicaDb: false,
      _authUser: {
        id: "member-1",
      } as unknown as TRPCInternalContext["_authUser"],
      headers: new Headers(),
    });
    await expect(cultivarCaller.search({ query: "stella" })).rejects.toThrow(
      "Public database reads require local SQLite or an embedded replica.",
    );
    const batchCaller = dashboardDbCultivarReferenceRouter.createCaller({
      db,
      replicaDb,
      hasReplicaDb: false,
      _authUser: {
        id: "member-1",
      } as unknown as TRPCInternalContext["_authUser"],
      headers: new Headers(),
    });
    await expect(batchCaller.getByIdsBatch({ ids: ["cr-1"] })).rejects.toThrow(
      "Public database reads require local SQLite or an embedded replica.",
    );
  });
});
