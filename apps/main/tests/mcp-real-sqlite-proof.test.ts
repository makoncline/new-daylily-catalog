// @vitest-environment node

// Run explicitly with RUN_MCP_REAL_SQLITE_PROOF=1. This uses the generated,
// sanitized local snapshot and never connects to Turso or Clerk.
process.env.SKIP_ENV_VALIDATION = "1";

import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { describe, expect, it, vi } from "vitest";

const snapshotPath = path.resolve(
  process.cwd(),
  "local/realistic-data/realistic-data.sqlite",
);
const auth = vi.hoisted(() => ({ clerkUserId: "" }));

vi.mock("server-only", () => ({}));
vi.mock("@/server/clerk/client", () => ({
  getClerk: async () => ({
    authenticateRequest: async () => ({
      toAuth: () => ({
        clientId: "mcp_local_proof",
        isAuthenticated: true,
        scopes: ["catalog:read"],
        userId: auth.clerkUserId,
      }),
    }),
  }),
}));

const runProof =
  process.env.RUN_MCP_REAL_SQLITE_PROOF === "1" && existsSync(snapshotPath);

describe.skipIf(!runProof)("real SQLite MCP proof", () => {
  it("keeps public listing search on its supplied database", async () => {
    process.env.DATABASE_URL = `file:${snapshotPath}`;
    process.env.TURSO_DATABASE_AUTH_TOKEN = "";
    process.env.TURSO_EMBEDDED_REPLICA_URL = "";
    process.env.LOCAL_QUERY_PROFILER = "1";
    process.env.LOCAL_QUERY_PROFILER_RESET = "1";

    const temporaryDirectory = mkdtempSync(
      path.join(tmpdir(), "daylily-public-search-source-"),
    );
    const localDatabasePath = path.join(temporaryDirectory, "source.sqlite");
    copyFileSync(snapshotPath, localDatabasePath);
    const database = new PrismaClient({
      adapter: new PrismaBetterSqlite3(
        { url: `file:${localDatabasePath}` },
        { timestampFormat: "unixepoch-ms" },
      ),
    });

    try {
      const owner = await database.user.findFirst({
        where: { profile: { is: { slug: "rollingoaksdaylilies" } } },
        select: { id: true, stripeCustomerId: true },
      });
      if (!owner?.stripeCustomerId) {
        throw new Error("The seeded paid seller is missing.");
      }
      await database.userProfile.update({
        where: { userId: owner.id },
        data: { slug: "mcp-injected-seller" },
      });

      const { searchPublicListings, publicListingSearchSchema } = await import(
        "@/server/services/public-listing-search"
      );
      const input = publicListingSearchSchema.parse({
        sellerSlug: "mcp-injected-seller",
        title: "A Few Good Men",
        limit: 1,
      });
      const active = await searchPublicListings({ database, input });
      expect(active.items).toMatchObject([
        { id: "10", hasActiveSubscription: true },
      ]);
      const { pagePublicProfiles } = await import(
        "@/server/services/public-profile-search"
      );
      const activeDirectory = await pagePublicProfiles({
        database,
        input: { limit: 100 },
      });
      expect(activeDirectory.items).toContainEqual(
        expect.objectContaining({
          id: owner.id,
          slug: "mcp-injected-seller",
          hasActiveSubscription: true,
        }),
      );

      await database.keyValue.update({
        where: { key: `stripe:customer:${owner.stripeCustomerId}` },
        data: { value: JSON.stringify({ status: "canceled" }) },
      });
      const inactive = await searchPublicListings({ database, input });
      expect(inactive.items).toEqual([]);
      const inactiveDirectory = await pagePublicProfiles({
        database,
        input: { limit: 100 },
      });
      expect(inactiveDirectory.items.some((item) => item.id === owner.id)).toBe(
        false,
      );
    } finally {
      await database.$disconnect();
      rmSync(temporaryDirectory, { recursive: true, force: true });
    }
  });

  it("serves bounded member and public calls from the local snapshot", async () => {
    process.env.DATABASE_URL = `file:${snapshotPath}`;
    process.env.TURSO_DATABASE_AUTH_TOKEN = "";
    process.env.TURSO_EMBEDDED_REPLICA_URL = "";
    process.env.DAYLILY_MCP_OAUTH_CLIENT_ID = "mcp_local_proof";
    process.env.LOCAL_QUERY_PROFILER = "1";
    process.env.LOCAL_QUERY_PROFILER_RESET = "1";

    const profilerPath = path.resolve(
      process.cwd(),
      "tests/.tmp/query-profiler/prisma-query-events.jsonl",
    );

    const { db, hasLocalPublicReadDb, publicDb, replicaDb } = await import(
      "@/server/db"
    );
    const { handleMcpRequest } = await import("@/server/mcp/read-only-mcp");
    expect(hasLocalPublicReadDb).toBe(true);
    expect(replicaDb).toBe(db);
    expect(publicDb).toBe(db);

    const user = await db.user.findFirst({
      where: { profile: { is: { slug: "rollingoaksdaylilies" } } },
      select: {
        id: true,
        clerkUserId: true,
        profile: { select: { slug: true } },
      },
    });
    if (!user?.clerkUserId || !user.profile?.slug) {
      throw new Error("The seeded Rolling Oaks member is missing.");
    }
    auth.clerkUserId = user.clerkUserId;
    await new Promise((resolve) => setTimeout(resolve, 20));

    function readSqlEvents() {
      if (!existsSync(profilerPath)) return [];
      return readFileSync(profilerPath, "utf8")
        .split("\n")
        .filter(Boolean)
        .map(
          (line) =>
            JSON.parse(line) as {
              eventType: "sql" | "operation";
              durationMs: number;
              query: string;
              params?: string;
            },
        )
        .filter((event) => event.eventType === "sql");
    }

    async function callTool(name: string, args: Record<string, unknown> = {}) {
      const before = readSqlEvents().length;
      const start = performance.now();
      const response = await handleMcpRequest(
        new Request("https://daylilycatalog.com/api/mcp/server", {
          method: "POST",
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "tools/call",
            params: { name, arguments: args },
          }),
        }),
      );
      const body: unknown = await response.json();
      const durationMs = Number((performance.now() - start).toFixed(2));
      await new Promise((resolve) => setTimeout(resolve, 20));
      const sqlEvents = readSqlEvents().slice(before);
      if (
        name !== "daylily.get_public_profile" &&
        name !== "daylily.list_public_profiles" &&
        name !== "daylily.list_public_profile_lists"
      ) {
        expect(
          sqlEvents.filter((event) => /\bCOUNT\s*\(/i.test(event.query)),
          `${name} should avoid aggregate counts on the member primary`,
        ).toEqual([]);
      }
      const result = body as {
        error?: { message: string };
        result?: { structuredContent: Record<string, unknown> };
      };
      expect(result.error, `${name}: ${result.error?.message}`).toBeUndefined();
      expect(result.result?.structuredContent).toBeTruthy();
      return {
        content: result.result!.structuredContent,
        durationMs,
        sqlCount: sqlEvents.length,
        sqlMs: Number(
          sqlEvents
            .reduce((sum, event) => sum + event.durationMs, 0)
            .toFixed(2),
        ),
        responseBytes: Buffer.byteLength(JSON.stringify(result.result)),
      };
    }

    const profile = await callTool("daylily.get_profile");
    expect(profile.content.profile).toMatchObject({
      slug: user.profile.slug,
    });
    const listPage = await callTool("daylily.list_listings", { limit: 100 });
    expect((listPage.content.items as unknown[]).length).toBe(100);
    const beforeMissingTextSearch = readSqlEvents().length;
    let missingTextSearch = await callTool("daylily.list_listings", {
      q: "zzzz-mcp-proof-no-match",
      limit: 100,
    });
    expect(missingTextSearch.content.items).toEqual([]);
    expect(missingTextSearch.content.nextCursor).toBeTruthy();
    const textSearchEvents = readSqlEvents().slice(beforeMissingTextSearch);
    const candidateSearchEvent = textSearchEvents.find((event) =>
      event.query.startsWith(
        "SELECT `main`.`Listing`.`id` FROM `main`.`Listing`",
      ),
    );
    expect(candidateSearchEvent).toBeDefined();
    const candidateSearchPlan = await db.$queryRawUnsafe<
      Array<{ detail: string }>
    >(
      `EXPLAIN QUERY PLAN ${candidateSearchEvent?.query ?? ""}`,
      ...(JSON.parse(candidateSearchEvent?.params ?? "[]") as unknown[]),
    );
    expect(candidateSearchPlan.map((step) => step.detail).join(" ")).toContain(
      "Listing_userId_id_idx (userId=? AND id>?)",
    );
    const textSearchEvent = textSearchEvents.find((event) =>
      event.params?.includes("zzzz-mcp-proof-no-match"),
    );
    const textSearchSql = textSearchEvent?.query ?? "";
    expect(textSearchSql).toContain("`main`.`Listing`");
    expect(textSearchSql).not.toMatch(/\bJOIN\b/i);
    const textSearchPlan = await db.$queryRawUnsafe<Array<{ detail: string }>>(
      `EXPLAIN QUERY PLAN ${textSearchSql}`,
      ...(JSON.parse(textSearchEvent?.params ?? "[]") as unknown[]),
    );
    expect(textSearchPlan.map((step) => step.detail).join(" ")).toContain(
      "sqlite_autoindex_Listing_1 (id=?)",
    );
    const generalCursors = new Set<string>();
    while (missingTextSearch.content.nextCursor) {
      const cursor = missingTextSearch.content.nextCursor as string;
      expect(generalCursors.has(cursor)).toBe(false);
      generalCursors.add(cursor);
      expect(generalCursors.size).toBeLessThan(18);
      missingTextSearch = await callTool("daylily.list_listings", {
        q: "zzzz-mcp-proof-no-match",
        cursor,
        limit: 100,
      });
      expect(missingTextSearch.content.items).toEqual([]);
    }
    expect(generalCursors.size).toBeGreaterThan(1);
    const missingTitleSearch = await callTool("daylily.list_listings", {
      title: "zzzz-mcp-proof-no-match",
      limit: 100,
    });
    expect(missingTitleSearch.content.items).toEqual([]);
    expect(missingTitleSearch.content.nextCursor).toBeTruthy();
    const [lateGeneralListing] = await db.listing.findMany({
      where: { userId: user.id },
      select: { id: true, title: true },
      orderBy: { id: "asc" },
      skip: 250,
      take: 1,
    });
    if (!lateGeneralListing) throw new Error("Seed listing page is too short.");
    let lateGeneralPage = await callTool("daylily.list_listings", {
      title: lateGeneralListing.title,
      limit: 25,
    });
    let generalPageCount = 1;
    while (
      !(lateGeneralPage.content.items as Array<{ id: string }>).some(
        (item) => item.id === lateGeneralListing.id,
      ) &&
      lateGeneralPage.content.nextCursor
    ) {
      generalPageCount += 1;
      expect(generalPageCount).toBeLessThan(18);
      lateGeneralPage = await callTool("daylily.list_listings", {
        title: lateGeneralListing.title,
        cursor: lateGeneralPage.content.nextCursor as string,
        limit: 25,
      });
    }
    expect(generalPageCount).toBeGreaterThan(1);
    expect(
      (lateGeneralPage.content.items as Array<{ id: string }>).some(
        (item) => item.id === lateGeneralListing.id,
      ),
    ).toBe(true);
    const expectedCommonTitle = await db.listing.findMany({
      where: { userId: user.id, title: { contains: "a" } },
      select: { id: true },
      orderBy: { id: "asc" },
      take: 50,
    });
    expect(expectedCommonTitle.length).toBe(50);
    let commonTitlePage = await callTool("daylily.list_listings", {
      title: "a",
      limit: 25,
    });
    const commonTitleIds: string[] = [];
    let commonTitlePageCount = 0;
    while (commonTitleIds.length < 50) {
      commonTitlePageCount += 1;
      expect(commonTitlePageCount).toBeLessThan(18);
      commonTitleIds.push(
        ...(commonTitlePage.content.items as Array<{ id: string }>).map(
          (item) => item.id,
        ),
      );
      if (commonTitleIds.length >= 50) break;
      const cursor = commonTitlePage.content.nextCursor as string | null;
      if (!cursor) break;
      commonTitlePage = await callTool("daylily.list_listings", {
        title: "a",
        cursor,
        limit: 25,
      });
    }
    expect(commonTitleIds.slice(0, 50)).toEqual(
      expectedCommonTitle.map((item) => item.id),
    );
    const expectedNoPrice = await db.listing.findMany({
      where: {
        userId: user.id,
        OR: [{ price: null }, { price: { lte: 0 } }],
      },
      select: { id: true },
      orderBy: { id: "asc" },
      take: 200,
    });
    expect(expectedNoPrice.length).toBe(200);
    let noPricePage = await callTool("daylily.list_listings", {
      hasPrice: false,
      limit: 100,
    });
    const noPriceIds: string[] = [];
    let noPricePageCount = 0;
    while (noPriceIds.length < 200) {
      noPricePageCount += 1;
      expect(noPricePageCount).toBeLessThan(18);
      noPriceIds.push(
        ...(noPricePage.content.items as Array<{ id: string }>).map(
          (item) => item.id,
        ),
      );
      if (noPriceIds.length >= 200) break;
      const cursor = noPricePage.content.nextCursor as string | null;
      if (!cursor) break;
      noPricePage = await callTool("daylily.list_listings", {
        hasPrice: false,
        cursor,
        limit: 100,
      });
    }
    expect(noPriceIds.slice(0, 200)).toEqual(
      expectedNoPrice.map((item) => item.id),
    );
    const linkedListing = await db.listing.findUnique({
      where: { id: "10" },
      select: { cultivarReferenceId: true },
    });
    if (!linkedListing?.cultivarReferenceId) {
      throw new Error("The seeded cultivar link is missing.");
    }
    const publicCultivarMatches = await callTool("daylily.search_cultivars", {
      cultivarName: "A Few Good Men",
      limit: 10,
    });
    const matchedCultivar = (
      publicCultivarMatches.content.results as Array<{
        cultivarReferenceId: string;
      }>
    ).find(
      (item) => item.cultivarReferenceId === linkedListing.cultivarReferenceId,
    );
    expect(matchedCultivar).toBeTruthy();
    await new Promise((resolve) => setTimeout(resolve, 50));
    const exactCultivar = await callTool("daylily.get_cultivar", {
      cultivarReferenceId: linkedListing.cultivarReferenceId,
    });
    expect(exactCultivar.sqlCount).toBeLessThanOrEqual(4);
    const { GET: getPublicCultivarJson } = await import(
      "@/app/api/v1/public/cultivars/route"
    );
    const cultivarUrl = new URL(
      "https://daylilycatalog.com/api/v1/public/cultivars",
    );
    cultivarUrl.searchParams.set(
      "cultivarReferenceId",
      linkedListing.cultivarReferenceId,
    );
    const cultivarResponse = await getPublicCultivarJson(
      new Request(cultivarUrl),
    );
    expect(cultivarResponse.status).toBe(200);
    expect(await cultivarResponse.json()).toEqual(exactCultivar.content);
    const cultivar = exactCultivar.content.cultivar as {
      normalizedName: string;
    };
    expect(cultivar.normalizedName).toBeTruthy();
    cultivarUrl.searchParams.delete("cultivarReferenceId");
    cultivarUrl.searchParams.set("normalizedName", cultivar.normalizedName);
    const nameResponse = await getPublicCultivarJson(new Request(cultivarUrl));
    expect(nameResponse.status).toBe(200);
    expect(await nameResponse.json()).toEqual(exactCultivar.content);
    cultivarUrl.searchParams.append("normalizedName", cultivar.normalizedName);
    expect((await getPublicCultivarJson(new Request(cultivarUrl))).status).toBe(
      400,
    );
    cultivarUrl.searchParams.delete("normalizedName");
    cultivarUrl.searchParams.set("normalizedName", cultivar.normalizedName);
    cultivarUrl.searchParams.set("cultivarReferenceId", "missing");
    expect((await getPublicCultivarJson(new Request(cultivarUrl))).status).toBe(
      400,
    );
    const invalidCultivarTool = await handleMcpRequest(
      new Request("https://daylilycatalog.com/api/mcp/server", {
        method: "POST",
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 2,
          method: "tools/call",
          params: {
            name: "daylily.get_cultivar",
            arguments: {
              cultivarReferenceId: linkedListing.cultivarReferenceId,
              normalizedName: cultivar.normalizedName,
            },
          },
        }),
      }),
    );
    const invalidCultivarResult = (await invalidCultivarTool.json()) as {
      result: {
        isError: boolean;
        structuredContent: { error: { code: string } };
      };
    };
    expect(invalidCultivarResult.result.isError).toBe(true);
    expect(invalidCultivarResult.result.structuredContent.error.code).toBe(
      "INVALID_ARGUMENTS",
    );
    cultivarUrl.searchParams.delete("normalizedName");
    expect((await getPublicCultivarJson(new Request(cultivarUrl))).status).toBe(
      404,
    );
    const beforeExactCultivarSearch = readSqlEvents().length;
    const exactCultivarSearch = await callTool("daylily.list_listings", {
      cultivarReferenceId: matchedCultivar!.cultivarReferenceId,
      limit: 100,
    });
    expect(
      (exactCultivarSearch.content.items as Array<{ id: string }>).some(
        (item) => item.id === "10",
      ),
    ).toBe(true);
    expect(
      readSqlEvents()
        .slice(beforeExactCultivarSearch)
        .some((event) => /\bJOIN\b/i.test(event.query)),
    ).toBe(false);
    const firstId = (listPage.content.items as Array<{ id: string }>)[0]!.id;
    const listing = await callTool("daylily.get_listing", { id: firstId });
    expect(listing.content.listing).toMatchObject({ id: firstId });
    const lists = await callTool("daylily.list_lists");
    expect((lists.content.items as unknown[]).length).toBeGreaterThan(0);
    expect((lists.content.items as unknown[])[0]).toHaveProperty("description");
    const unknownListFilter = await handleMcpRequest(
      new Request("http://localhost/api/mcp/server", {
        method: "POST",
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 2,
          method: "tools/call",
          params: {
            name: "daylily.list_lists",
            arguments: { title: "not-a-supported-filter" },
          },
        }),
      }),
    );
    expect(await unknownListFilter.json()).toMatchObject({
      result: {
        isError: true,
        structuredContent: { error: { code: "INVALID_ARGUMENTS" } },
      },
    });
    const firstListId = (lists.content.items as Array<{ id: string }>)[0]!.id;
    const list = await callTool("daylily.get_list", { id: firstListId });
    expect(list.content.list).toMatchObject({ id: firstListId });
    const listFiltered = await callTool("daylily.list_listings", {
      listId: firstListId,
      limit: 25,
    });
    const expectedListRows = await db.listing.findMany({
      where: { userId: user.id, lists: { some: { id: firstListId } } },
      select: { id: true, title: true },
      orderBy: { id: "asc" },
      take: 51,
    });
    expect(expectedListRows.length).toBeGreaterThan(25);
    expect(
      (listFiltered.content.items as Array<{ id: string }>).map(
        (item) => item.id,
      ),
    ).toEqual(expectedListRows.slice(0, 25).map((item) => item.id));
    const nextListPage = await callTool("daylily.list_listings", {
      listId: firstListId,
      cursor: listFiltered.content.nextCursor as string,
      limit: 25,
    });
    expect(
      (nextListPage.content.items as Array<{ id: string }>).map(
        (item) => item.id,
      ),
    ).toEqual(expectedListRows.slice(25, 50).map((item) => item.id));
    const listTitleMatch = await callTool("daylily.list_listings", {
      listId: firstListId,
      title: expectedListRows[0]!.title,
      limit: 25,
    });
    expect(
      (listTitleMatch.content.items as Array<{ id: string }>).some(
        (item) => item.id === expectedListRows[0]!.id,
      ),
    ).toBe(true);
    const foreignList = await db.list.findFirst({
      where: { userId: { not: user.id } },
      select: { id: true },
    });
    if (!foreignList) throw new Error("Seed foreign list is missing.");
    const foreignListPage = await callTool("daylily.list_listings", {
      listId: foreignList.id,
      limit: 25,
    });
    expect(foreignListPage.content.items).toEqual([]);
    expect(foreignListPage.content.nextCursor).toBeNull();
    let sparseLargeListPage = await callTool("daylily.list_listings", {
      listId: "5",
      q: "zzzz-mcp-proof-no-match",
      limit: 25,
    });
    const sparseCursors = new Set<string>();
    let sparsePageCount = 0;
    while (true) {
      sparsePageCount += 1;
      expect(sparseLargeListPage.content.items).toEqual([]);
      const nextCursor = sparseLargeListPage.content.nextCursor as
        | string
        | null;
      if (!nextCursor) break;
      expect(sparseCursors.has(nextCursor)).toBe(false);
      sparseCursors.add(nextCursor);
      expect(sparsePageCount).toBeLessThan(11);
      sparseLargeListPage = await callTool("daylily.list_listings", {
        listId: "5",
        q: "zzzz-mcp-proof-no-match",
        cursor: nextCursor,
        limit: 25,
      });
    }
    expect(sparsePageCount).toBeGreaterThan(1);
    expect(sparseLargeListPage.content.nextCursor).toBeNull();
    const [laterMember] = await db.listing.findMany({
      where: { userId: user.id, lists: { some: { id: "5" } } },
      select: { id: true, title: true },
      orderBy: { id: "asc" },
      skip: 250,
      take: 1,
    });
    if (!laterMember) throw new Error("Seeded large list is too short.");
    const beforeLateMatch = await callTool("daylily.list_listings", {
      listId: "5",
      title: laterMember.title,
      limit: 25,
    });
    expect(beforeLateMatch.content.items).toEqual([]);
    expect(beforeLateMatch.content.nextCursor).toBeTruthy();
    const lateMatch = await callTool("daylily.list_listings", {
      listId: "5",
      title: laterMember.title,
      cursor: beforeLateMatch.content.nextCursor as string,
      limit: 25,
    });
    expect(
      (lateMatch.content.items as Array<{ id: string }>).map((item) => item.id),
    ).toContain(laterMember.id);
    const link = await callTool("daylily.open_dashboard", {
      destination: "delete_listing",
      id: firstId,
    });
    expect(link.content.url).toContain("intent=delete");
    const publicProfile = await callTool("daylily.get_public_profile", {
      sellerSlug: user.profile.slug,
    });
    expect(publicProfile.content.profile).toBeTruthy();
    const beforePublicSellerSearch = readSqlEvents().length;
    const publicCultivarSearch = await callTool(
      "daylily.search_public_listings",
      {
        sellerSlug: user.profile.slug,
        cultivarName: "A Few Good Men",
        limit: 25,
      },
    );
    const publicSellerQueries = readSqlEvents()
      .slice(beforePublicSellerSearch)
      .map((event) => event.query);
    expect(
      publicSellerQueries.some(
        (query) =>
          query.includes("`main`.`User`.`id` IN (?)") &&
          query.includes("`main`.`User`.`stripeCustomerId` IS NOT NULL"),
      ),
    ).toBe(true);
    expect(
      publicSellerQueries.filter(
        (query) =>
          query.includes("FROM `main`.`User`") &&
          query.includes("`main`.`User`.`stripeCustomerId` IS NOT NULL") &&
          !query.includes("`main`.`User`.`id` IN (?)"),
      ),
    ).toEqual([]);
    expect(
      (publicCultivarSearch.content.items as Array<{ id: string }>).some(
        (item) => item.id === "10",
      ),
    ).toBe(true);

    const results = {
      database: "local realistic-data.sqlite",
      tools: {
        profile: { ...profile, content: { slug: user.profile.slug } },
        listPage: {
          ...listPage,
          content: { rowCount: (listPage.content.items as unknown[]).length },
        },
        missingTextSearch: {
          ...missingTextSearch,
          content: { rowCount: 0 },
        },
        missingTitleSearch: {
          ...missingTitleSearch,
          content: { rowCount: 0 },
        },
        exactCultivarSearch: {
          ...exactCultivarSearch,
          content: { foundKnownListing: true },
        },
        listing: { ...listing, content: { id: firstId } },
        lists: {
          ...lists,
          content: { rowCount: (lists.content.items as unknown[]).length },
        },
        list: { ...list, content: { id: firstListId } },
        link,
        publicProfile: {
          ...publicProfile,
          content: { found: Boolean(publicProfile.content.profile) },
        },
        publicCultivarSearch: {
          ...publicCultivarSearch,
          content: { foundKnownListing: true },
        },
      },
    };
    process.stdout.write(`${JSON.stringify(results)}\n`);

    expect(profile.sqlCount).toBeLessThanOrEqual(3);
    expect(listPage.sqlCount).toBeLessThanOrEqual(5);
    expect(listing.sqlCount).toBeLessThanOrEqual(9);
    expect(lists.sqlCount).toBeLessThanOrEqual(3);
    expect(list.sqlCount).toBeLessThanOrEqual(4);
    expect(link.sqlCount).toBeLessThanOrEqual(2);

    const { publicRouter } = await import("@/server/api/routers/public");
    const publicCaller = publicRouter.createCaller({
      db,
      headers: new Headers(),
    });
    const publicApiProfile = await publicCaller.getProfile({
      userSlugOrId: user.profile.slug,
    });
    const expectedPublicLists = await db.list.findMany({
      where: {
        userId: user.id,
        OR: [{ status: null }, { status: { not: "HIDDEN" } }],
      },
      select: {
        id: true,
        title: true,
        description: true,
        _count: {
          select: {
            listings: {
              where: {
                OR: [{ status: null }, { status: { not: "HIDDEN" } }],
              },
            },
          },
        },
      },
      orderBy: [{ listings: { _count: "desc" } }, { title: "asc" }],
    });
    expect(publicApiProfile.lists).toEqual(
      expectedPublicLists.map((list) => ({
        id: list.id,
        title: list.title,
        description: list.description,
        listingCount: list._count.listings,
      })),
    );
    const publicMcpLists = await callTool("daylily.list_public_profile_lists", {
      sellerSlug: user.profile.slug,
    });
    expect(publicMcpLists.content.items).toEqual(publicApiProfile.lists);
    const publicListId = publicApiProfile.lists.find(
      (list) => list.listingCount > 0,
    )?.id;
    if (!publicListId) throw new Error("Seeded public list is missing.");
    const publicDirectory = await publicCaller.getPublicProfiles();
    await new Promise((resolve) => setTimeout(resolve, 50));
    const publicDirectoryPage = await callTool("daylily.list_public_profiles", {
      limit: 100,
    });
    const singlePublicDirectory = await callTool(
      "daylily.list_public_profiles",
      { limit: 1 },
    );
    expect(
      (publicDirectoryPage.content.items as unknown[]).length,
    ).toBeGreaterThan(1);
    expect(publicDirectoryPage.sqlCount).toBeLessThanOrEqual(
      singlePublicDirectory.sqlCount + 2,
    );
    const { GET: getPublicProfilesJson } = await import(
      "@/app/api/v1/public/profiles/route"
    );
    const directoryResponse = await getPublicProfilesJson(
      new Request("http://localhost/api/v1/public/profiles?limit=100"),
    );
    const directoryJson = (await directoryResponse.json()) as {
      items: Array<{ id: string; hasActiveSubscription: boolean }>;
      nextCursor: string | null;
    };
    expect(directoryResponse.status).toBe(200);
    expect(directoryJson.items.map((item) => item.id).sort()).toEqual(
      publicDirectory.map((item) => item.id).sort(),
    );
    expect(
      (publicDirectoryPage.content.items as Array<{ id: string }>).map(
        (item) => item.id,
      ),
    ).toEqual(directoryJson.items.map((item) => item.id));
    expect(directoryJson.items).toContainEqual(
      expect.objectContaining({
        id: user.id,
        hasActiveSubscription: true,
      }),
    );
    expect(directoryJson.nextCursor).toBeNull();
    const firstDirectoryPage = await getPublicProfilesJson(
      new Request("http://localhost/api/v1/public/profiles?limit=2"),
    );
    const firstDirectoryJson = (await firstDirectoryPage.json()) as {
      items: Array<{ id: string }>;
      nextCursor: string | null;
    };
    expect(firstDirectoryJson.items).toHaveLength(2);
    expect(firstDirectoryJson.nextCursor).toBe(firstDirectoryJson.items[1]?.id);
    const secondDirectoryPage = await getPublicProfilesJson(
      new Request(
        `http://localhost/api/v1/public/profiles?limit=2&cursor=${firstDirectoryJson.nextCursor}`,
      ),
    );
    const secondDirectoryJson = (await secondDirectoryPage.json()) as {
      items: Array<{ id: string }>;
    };
    expect(secondDirectoryJson.items[0]?.id).toBe(directoryJson.items[2]?.id);
    expect(
      (
        await getPublicProfilesJson(
          new Request("http://localhost/api/v1/public/profiles?title=ignored"),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await getPublicProfilesJson(
          new Request(
            "http://localhost/api/v1/public/profiles?limit=2&limit=3",
          ),
        )
      ).status,
    ).toBe(400);
    const publicListings = await publicCaller.getListings({
      userSlugOrId: user.profile.slug,
      limit: 1,
    });
    const publicSearch = await publicCaller.searchListings({
      sellerSlug: user.profile.slug,
      cultivarName: "A Few Good Men",
      limit: 25,
    });
    expect(publicApiProfile.id).toBe(user.id);
    expect(publicListings.length).toBeGreaterThan(0);
    expect(publicListings.length).toBeLessThanOrEqual(2);
    expect(publicSearch.items.map((item) => item.id)).toEqual(
      (publicCultivarSearch.content.items as Array<{ id: string }>).map(
        (item) => item.id,
      ),
    );
    expect(publicSearch.items).toContainEqual(
      expect.objectContaining({ id: "10", hasActiveSubscription: true }),
    );
    const { GET: getPublicListingsJson } = await import(
      "@/app/api/v1/public/listings/route"
    );
    const publicSearchUrl = new URL("http://localhost/api/v1/public/listings");
    publicSearchUrl.searchParams.set("sellerSlug", user.profile.slug);
    publicSearchUrl.searchParams.set("cultivarName", "A Few Good Men");
    publicSearchUrl.searchParams.set("limit", "25");
    const publicJsonResponse = await getPublicListingsJson(
      new Request(publicSearchUrl),
    );
    const publicJsonPage = (await publicJsonResponse.json()) as {
      items: Array<{ id: string; hasActiveSubscription: boolean }>;
    };
    expect(publicJsonResponse.status).toBe(200);
    expect(publicJsonResponse.headers.get("access-control-allow-origin")).toBe(
      "*",
    );
    expect(publicJsonPage.items.map((item) => item.id)).toEqual(
      publicSearch.items.map((item) => item.id),
    );
    expect(publicJsonPage.items).toContainEqual(
      expect.objectContaining({ id: "10", hasActiveSubscription: true }),
    );
    const publicMcpListPage = await callTool("daylily.list_public_listings", {
      sellerSlug: user.profile.slug,
      listId: publicListId,
      limit: 25,
    });
    const publicListUrl = new URL("http://localhost/api/v1/public/listings");
    publicListUrl.searchParams.set("sellerSlug", user.profile.slug);
    publicListUrl.searchParams.set("listId", publicListId);
    publicListUrl.searchParams.set("limit", "25");
    const publicListResponse = await getPublicListingsJson(
      new Request(publicListUrl),
    );
    const publicListPage = (await publicListResponse.json()) as {
      items: Array<{ id: string }>;
      nextCursor: string | null;
    };
    expect(publicListResponse.status).toBe(200);
    expect(publicListPage.items.length).toBeGreaterThan(0);
    expect(publicListPage.items.map((item) => item.id)).toEqual(
      (publicMcpListPage.content.items as Array<{ id: string }>).map(
        (item) => item.id,
      ),
    );
    expect(publicListPage.nextCursor).toBe(
      publicMcpListPage.content.nextCursor,
    );
    publicSearchUrl.searchParams.set("userId", user.id);
    expect(
      (await getPublicListingsJson(new Request(publicSearchUrl))).status,
    ).toBe(400);
    publicSearchUrl.searchParams.delete("userId");
    publicSearchUrl.searchParams.append("limit", "25");
    expect(
      (await getPublicListingsJson(new Request(publicSearchUrl))).status,
    ).toBe(400);
    const { GET: getPublicListingJson } = await import(
      "@/app/api/v1/public/listings/[id]/route"
    );
    const exactListingResponse = await getPublicListingJson(
      new Request("http://localhost/api/v1/public/listings/10"),
      { params: Promise.resolve({ id: "10" }) },
    );
    expect(exactListingResponse.status).toBe(200);
    const exactListingBody = (await exactListingResponse.json()) as {
      id: string;
      hasActiveSubscription: boolean;
    };
    expect(exactListingBody).toMatchObject({
      id: "10",
      hasActiveSubscription: true,
    });
    const { GET: getPublicListingByPath } = await import(
      "@/app/api/v1/public/profiles/[slugOrId]/listings/[listingSlugOrId]/route"
    );
    const listingSlug = await db.listing.findUnique({
      where: { id: "10" },
      select: { slug: true },
    });
    if (!listingSlug) throw new Error("Seed listing is missing.");
    const byPath = await getPublicListingByPath(
      new Request(
        `http://localhost/api/v1/public/profiles/${user.profile.slug}/listings/${listingSlug.slug}`,
      ),
      {
        params: Promise.resolve({
          slugOrId: user.profile.slug,
          listingSlugOrId: listingSlug.slug,
        }),
      },
    );
    expect(byPath.status).toBe(200);
    expect(await byPath.json()).toEqual(exactListingBody);
    expect(
      (
        await getPublicListingByPath(
          new Request(
            "http://localhost/api/v1/public/profiles/missing/listings/a-few-good-men",
          ),
          {
            params: Promise.resolve({
              slugOrId: "missing",
              listingSlugOrId: listingSlug.slug,
            }),
          },
        )
      ).status,
    ).toBe(404);
    const foreignProfile = await db.userProfile.findFirst({
      where: { userId: { not: user.id }, slug: { not: null } },
      select: { slug: true },
    });
    if (!foreignProfile?.slug) {
      throw new Error("Seed foreign seller is missing.");
    }
    expect(
      (
        await getPublicListingByPath(
          new Request(
            `http://localhost/api/v1/public/profiles/${foreignProfile.slug}/listings/10`,
          ),
          {
            params: Promise.resolve({
              slugOrId: foreignProfile.slug,
              listingSlugOrId: "10",
            }),
          },
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await getPublicListingJson(
          new Request("http://localhost/api/v1/public/listings/missing"),
          { params: Promise.resolve({ id: "missing" }) },
        )
      ).status,
    ).toBe(404);
    const hiddenListing = await db.listing.findFirst({
      where: { userId: user.id, status: "HIDDEN" },
      select: { id: true, slug: true },
    });
    if (!hiddenListing) throw new Error("Seed hidden listing is missing.");
    expect(
      (
        await getPublicListingJson(
          new Request(
            `http://localhost/api/v1/public/listings/${hiddenListing.id}`,
          ),
          { params: Promise.resolve({ id: hiddenListing.id }) },
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await getPublicListingByPath(
          new Request(
            `http://localhost/api/v1/public/profiles/${user.profile.slug}/listings/${hiddenListing.slug}`,
          ),
          {
            params: Promise.resolve({
              slugOrId: user.profile.slug,
              listingSlugOrId: hiddenListing.slug,
            }),
          },
        )
      ).status,
    ).toBe(404);
    const { GET: getPublicProfileJson } = await import(
      "@/app/api/v1/public/profiles/[slugOrId]/route"
    );
    const exactProfileResponse = await getPublicProfileJson(
      new Request(
        `http://localhost/api/v1/public/profiles/${user.profile.slug}`,
      ),
      { params: Promise.resolve({ slugOrId: user.profile.slug }) },
    );
    expect(exactProfileResponse.status).toBe(200);
    expect(
      (await exactProfileResponse.json()) as {
        id: string;
        lists: unknown[];
      },
    ).toMatchObject({
      id: publicApiProfile.id,
      lists: publicMcpLists.content.items,
    });
    expect(
      (
        await getPublicProfileJson(
          new Request("http://localhost/api/v1/public/profiles/missing"),
          { params: Promise.resolve({ slugOrId: "missing" }) },
        )
      ).status,
    ).toBe(404);

    const inactiveUser = await db.user.findFirst({
      where: { profile: { is: { slug: "blueberry" } }, stripeCustomerId: null },
      select: { id: true },
    });
    if (!inactiveUser)
      throw new Error("The seeded inactive catalog is missing.");
    const inactiveListing = await db.listing.findFirst({
      where: {
        userId: inactiveUser.id,
        OR: [{ status: null }, { status: { not: "HIDDEN" } }],
      },
      select: { id: true },
    });
    if (!inactiveListing)
      throw new Error("The seeded inactive listing is missing.");
    const inactiveApiListing = await publicCaller.getListingById({
      id: inactiveListing.id,
    });
    const inactiveMcpListing = await callTool("daylily.get_public_listing", {
      id: inactiveListing.id,
    });
    const inactiveApiProfile = await publicCaller.getProfile({
      userSlugOrId: "blueberry",
    });
    const inactiveMcpProfile = await callTool("daylily.get_public_profile", {
      sellerSlug: "blueberry",
    });
    const inactiveJsonListing = await getPublicListingJson(
      new Request(
        `http://localhost/api/v1/public/listings/${inactiveListing.id}`,
      ),
      { params: Promise.resolve({ id: inactiveListing.id }) },
    );
    const inactiveJsonProfile = await getPublicProfileJson(
      new Request("http://localhost/api/v1/public/profiles/blueberry"),
      { params: Promise.resolve({ slugOrId: "blueberry" }) },
    );
    const inactiveSearch = await publicCaller.searchListings({
      sellerSlug: "blueberry",
      limit: 1,
    });
    expect(inactiveApiListing.hasActiveSubscription).toBe(false);
    expect(inactiveMcpListing.content.listing).toMatchObject({
      id: inactiveApiListing.id,
    });
    expect(inactiveApiProfile.hasActiveSubscription).toBe(false);
    expect(inactiveMcpProfile.content.profile).toMatchObject({
      id: inactiveApiProfile.id,
    });
    expect(inactiveJsonListing.status).toBe(200);
    expect((await inactiveJsonListing.json()) as { id: string }).toMatchObject({
      id: inactiveApiListing.id,
    });
    expect(inactiveJsonProfile.status).toBe(200);
    expect((await inactiveJsonProfile.json()) as { id: string }).toMatchObject({
      id: inactiveApiProfile.id,
    });
    expect(inactiveSearch.items).toEqual([]);
  }, 120_000);
});
