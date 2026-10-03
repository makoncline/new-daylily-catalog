// @vitest-environment node

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
import { randomUUID } from "node:crypto";
import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { afterAll, describe, expect, it, vi } from "vitest";
import { memberOperationResultSchemas } from "@/lib/member-result-contract";

const seedPath = path.resolve(
  process.cwd(),
  "local/realistic-data/realistic-data.sqlite",
);
const enabled =
  process.env.RUN_MEMBER_HTTP_PROOF === "1" && existsSync(seedPath);
const tempDir = enabled
  ? mkdtempSync(path.join(tmpdir(), "daylily-member-http-"))
  : null;
const databasePath = tempDir ? path.join(tempDir, "member.sqlite") : null;
if (databasePath) {
  copyFileSync(seedPath, databasePath);
  process.env.DATABASE_URL = `file:${databasePath}`;
  process.env.TURSO_DATABASE_AUTH_TOKEN = "";
  process.env.TURSO_EMBEDDED_REPLICA_URL = "";
  process.env.DAYLILY_MCP_OAUTH_CLIENT_ID = "member_http_test";
  process.env.DAYLILY_MEMBER_API_OAUTH_CLIENT_IDS =
    "another_client,trusted_manage_test";
  process.env.LOCAL_QUERY_PROFILER = "1";
  process.env.LOCAL_QUERY_PROFILER_RESET = "1";
  process.env.LOCAL_QUERY_PROFILER_OUTPUT = path.join(
    tempDir!,
    "queries.jsonl",
  );
}

const auth = vi.hoisted(() => ({
  clientId: "member_http_test",
  clerkUserId: "",
  isAuthenticated: true,
  scopes: ["catalog:read", "catalog:write"],
}));
const getClerkUserData = vi.hoisted(() =>
  vi.fn(async () => ({ email: "member@example.com" })),
);

vi.mock("server-only", () => ({}));
vi.mock("@/server/clerk/client", () => ({
  getClerk: async () => ({
    authenticateRequest: async () => ({
      toAuth: () => ({
        clientId: auth.clientId,
        isAuthenticated: auth.isAuthenticated,
        scopes: auth.scopes,
        userId: auth.clerkUserId,
      }),
    }),
  }),
}));
vi.mock("@/server/clerk/sync-user", () => ({
  getClerkUserData,
}));

afterAll(() => {
  if (tempDir) rmSync(tempDir, { recursive: true, force: true });
});

describe.skipIf(!enabled)("member OAuth HTTP with realistic SQLite", () => {
  it("scopes bounded reads and owned writes through the shared member router", async () => {
    const { db } = await import("@/server/db");
    const { handleMemberHttpRequest } = await import(
      "@/server/api/member-http"
    );
    const { memberRouter } = await import("@/server/api/routers/member");
    const {
      MEMBER_MANAGE_OPERATIONS,
      MEMBER_READ_OPERATIONS,
      MEMBER_WRITE_OPERATIONS,
    } = await import("@/lib/member-api-contract");
    expect(Object.keys(memberRouter._def.procedures).sort()).toEqual(
      [
        ...MEMBER_READ_OPERATIONS,
        ...MEMBER_WRITE_OPERATIONS,
        ...MEMBER_MANAGE_OPERATIONS,
      ]
        .map(([name]) => name)
        .sort(),
    );
    const owner = await db.user.findFirst({
      where: { profile: { is: { slug: "rollingoaksdaylilies" } } },
      select: { id: true, clerkUserId: true },
    });
    if (!owner?.clerkUserId) throw new Error("Seed member is missing.");
    auth.clerkUserId = owner.clerkUserId;

    async function readSqlQueries() {
      await new Promise((resolve) => setTimeout(resolve, 20));
      const profilerPath = process.env.LOCAL_QUERY_PROFILER_OUTPUT;
      if (!profilerPath || !existsSync(profilerPath)) return [];
      return readFileSync(profilerPath, "utf8")
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line) as { eventType: string; query: string })
        .filter((event) => event.eventType === "sql")
        .map((event) => event.query);
    }

    async function call(
      pathName: string,
      input: unknown,
      mutation = false,
      token = true,
      origin?: string,
    ) {
      const url = new URL(`http://localhost:3217/api/v1/member/${pathName}`);
      if (!mutation)
        url.searchParams.set("input", JSON.stringify({ json: input }));
      const request = new Request(url, {
        method: mutation ? "POST" : "GET",
        headers: {
          ...(token ? { Authorization: "Bearer local-test-token" } : {}),
          ...(origin ? { Origin: origin } : {}),
          "Content-Type": "application/json",
        },
        ...(mutation ? { body: JSON.stringify({ json: input }) } : {}),
      });
      const response = await handleMemberHttpRequest(request, pathName);
      const body = (await response.json()) as {
        result?: { data?: { json?: unknown } };
        error?: { json?: { data?: { code?: string } } };
      };
      if (response.ok && body.result?.data) {
        const schema =
          memberOperationResultSchemas[
            pathName as keyof typeof memberOperationResultSchemas
          ];
        expect(schema, `Missing result schema for ${pathName}`).toBeDefined();
        schema.parse(body.result.data.json);
      }
      return {
        response,
        body: body as {
          result?: { data?: { json?: Record<string, unknown> } };
          error?: { json?: { data?: { code?: string } } };
        },
      };
    }

    const { OPTIONS: memberOptions } = await import(
      "@/app/api/v1/member/[trpc]/route"
    );
    const preflight = memberOptions();
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get("access-control-allow-origin")).toBe("*");
    expect(preflight.headers.get("access-control-allow-headers")).toContain(
      "Authorization",
    );
    expect(preflight.headers.has("access-control-allow-credentials")).toBe(
      false,
    );

    const noToken = await call(
      "listing.page",
      { limit: 1 },
      false,
      false,
      "https://dashboard.example",
    );
    expect(noToken.response.status).toBe(401);
    expect(noToken.response.headers.get("access-control-allow-origin")).toBe(
      "*",
    );
    expect(noToken.response.headers.get("www-authenticate")).toContain(
      "http://localhost:3217/.well-known/oauth-protected-resource",
    );
    expect(
      noToken.response.headers.get("access-control-expose-headers"),
    ).toContain("WWW-Authenticate");

    auth.isAuthenticated = false;
    const rejectedToken = await call("listing.page", { limit: 1 });
    expect(rejectedToken.response.status).toBe(401);
    expect(rejectedToken.response.headers.get("www-authenticate")).toContain(
      "oauth-protected-resource",
    );
    auth.isAuthenticated = true;
    auth.scopes = [];
    const missingScope = await call("listing.page", { limit: 1 });
    expect(missingScope.response.status).toBe(403);
    expect(missingScope.response.headers.get("www-authenticate")).toContain(
      'error="insufficient_scope"',
    );

    auth.scopes = ["catalog:read"];
    const beforePage = (await readSqlQueries()).length;
    const listings = await call("listing.page", { limit: 2 });
    const pageQueries = (await readSqlQueries()).slice(beforePage);
    expect(listings.response.status).toBe(200);
    expect(pageQueries).toHaveLength(3);
    expect(getClerkUserData).not.toHaveBeenCalled();
    expect(
      pageQueries.filter((query) => /FROM `main`\.`User`/i.test(query)),
    ).toHaveLength(1);
    expect(pageQueries.some((query) => /\bCOUNT\s*\(/i.test(query))).toBe(
      false,
    );
    expect(listings.response.headers.get("cache-control")).toBe("no-store");
    const listingItems = listings.body.result?.data?.json?.items as
      | Array<{ id: string; slug: string }>
      | undefined;
    expect(listingItems).toHaveLength(2);
    const listingCursor = listings.body.result?.data?.json?.nextCursor;
    expect(listingCursor).toBe(`i:${listingItems?.[1]?.id}`);
    const nextListings = await call("listing.page", {
      limit: 2,
      cursor: listingCursor,
    });
    expect(nextListings.response.status).toBe(200);
    const firstFour = await db.listing.findMany({
      where: { userId: owner.id },
      select: { id: true },
      orderBy: { id: "asc" },
      take: 4,
    });
    expect([
      ...listingItems!.map((item) => item.id),
      ...(
        nextListings.body.result?.data?.json?.items as Array<{ id: string }>
      ).map((item) => item.id),
    ]).toEqual(firstFour.map((item) => item.id));
    expect(
      (await call("listing.page", { cursor: "wrong-cursor" })).response.status,
    ).toBe(400);
    expect((await call("listing.page", { cursor: "i:" })).response.status).toBe(
      400,
    );
    const firstPagedListing = listingItems![0]!;
    const originalSlug = firstPagedListing.slug;
    try {
      await db.listing.update({
        where: { id: firstPagedListing.id },
        data: { slug: `renamed-${randomUUID()}` },
      });
      const afterRename = await call("listing.page", {
        limit: 1,
        cursor: `i:${firstPagedListing.id}`,
      });
      expect(
        (afterRename.body.result?.data?.json?.items as Array<{ id: string }>)[0]
          ?.id,
      ).not.toBe(firstPagedListing.id);
    } finally {
      await db.listing.update({
        where: { id: firstPagedListing.id },
        data: { slug: originalSlug },
      });
    }
    const firstListing = listingItems?.[0];
    if (!firstListing) throw new Error("Seed listing page is empty.");
    expect(firstListing).toHaveProperty("hasPhoto");
    expect(listings.body.result?.data?.json).not.toHaveProperty("total");
    const beforeHandoff = (await readSqlQueries()).length;
    const deletionHandoff = await call("handoff.get", {
      destination: "delete_listing",
      id: firstListing.id,
    });
    const handoffQueries = (await readSqlQueries()).slice(beforeHandoff);
    expect(deletionHandoff.response.status).toBe(200);
    expect(handoffQueries).toHaveLength(2);
    expect(getClerkUserData).not.toHaveBeenCalled();
    expect(handoffQueries.some((query) => /\bCOUNT\s*\(/i.test(query))).toBe(
      false,
    );
    expect(deletionHandoff.body.result?.data?.json).toMatchObject({
      dashboardPath: `/dashboard/listings?editing=${firstListing.id}&intent=delete`,
      canComplete: true,
    });
    expect(
      (await call("handoff.get", { destination: "delete_listing" })).response
        .status,
    ).toBe(400);
    expect(
      (await call("listing.get", { id: "x".repeat(129) })).response.status,
    ).toBe(400);
    expect(
      (
        await call("image.listForTarget", {
          type: "listing",
          referenceId: "x".repeat(129),
        })
      ).response.status,
    ).toBe(400);
    expect(
      (
        await call("image.get", {
          type: "listing",
          referenceId: firstListing.id,
          imageId: "x".repeat(129),
        })
      ).response.status,
    ).toBe(400);
    expect(
      (await call("list.page", { title: "Daylilies" })).response.status,
    ).toBe(400);
    const obsoleteCultivarFilter = await call("listing.page", {
      cultivarName: "A Few Good Men",
      limit: 25,
    });
    expect(obsoleteCultivarFilter.response.status).toBe(400);
    const knownCultivarLink = await db.listing.findUnique({
      where: { id: "10" },
      select: { cultivarReferenceId: true },
    });
    if (!knownCultivarLink?.cultivarReferenceId) {
      throw new Error("Seed cultivar link is missing.");
    }
    const beforeCultivarQueries = (await readSqlQueries()).length;
    const exactCultivarFiltered = await call("listing.page", {
      cultivarReferenceId: knownCultivarLink.cultivarReferenceId,
      limit: 25,
    });
    const cultivarQueries = (await readSqlQueries()).slice(
      beforeCultivarQueries,
    );
    expect(exactCultivarFiltered.response.status).toBe(200);
    expect(
      cultivarQueries.some((query) =>
        query.startsWith("SELECT `main`.`Listing`.`id` FROM `main`.`Listing`"),
      ),
    ).toBe(true);
    expect(exactCultivarFiltered.body.result?.data?.json?.items).toMatchObject([
      { id: "10" },
    ]);
    const beforeListingDetail = (await readSqlQueries()).length;
    const listingDetail = await call("listing.get", { id: firstListing.id });
    const listingDetailQueries = (await readSqlQueries()).slice(
      beforeListingDetail,
    );
    expect(listingDetail.response.status).toBe(200);
    expect(listingDetailQueries.length).toBeLessThanOrEqual(7);
    expect(
      listingDetailQueries.some((query) => /\bCOUNT\s*\(/i.test(query)),
    ).toBe(false);
    expect(listingDetail.body.result?.data?.json).toMatchObject({
      id: firstListing.id,
    });
    expect(Array.isArray(listingDetail.body.result?.data?.json?.images)).toBe(
      true,
    );
    expect(Array.isArray(listingDetail.body.result?.data?.json?.lists)).toBe(
      true,
    );
    expect(listingDetail.body.result?.data?.json).toHaveProperty(
      "cultivarReference",
    );

    const cultivar = await db.cultivarReference.findFirst({
      where: { v2AhsCultivar: { isNot: null } },
      select: { id: true },
    });
    if (!cultivar) throw new Error("Seed cultivar is missing.");
    const cultivarDetail = await call("cultivar.get", { id: cultivar.id });
    expect(cultivarDetail.response.status).toBe(200);
    expect(cultivarDetail.body.result?.data?.json?.name).toBeTruthy();
    expect(
      (await call("cultivar.search", { query: "x".repeat(201) })).response
        .status,
    ).toBe(400);

    const tooLarge = await call("listing.page", { limit: 101 });
    expect(tooLarge.response.status).toBe(400);
    const tooLong = await call("listing.page", { q: "x".repeat(201) });
    expect(tooLong.response.status).toBe(400);

    const deniedWrite = await call(
      "list.create",
      { requestId: randomUUID(), title: "Denied" },
      true,
    );
    expect(deniedWrite.response.status).toBe(403);

    auth.scopes = ["catalog:read", "catalog:write"];
    auth.clientId = "unlisted_client";
    const unlistedClient = await call("listing.page", { limit: 1 });
    expect(unlistedClient.response.status).toBe(403);
    auth.clientId = "another_client";
    const alternateClientPage = await call(
      "listing.page",
      { limit: 1 },
      false,
      true,
      "https://dashboard.example",
    );
    expect(alternateClientPage.response.status).toBe(200);
    expect(
      alternateClientPage.response.headers.get("access-control-allow-origin"),
    ).toBe("*");
    const alternateClientCreate = await call(
      "list.create",
      { requestId: randomUUID(), title: "Other OAuth Client List" },
      true,
      true,
      "https://dashboard.example",
    );
    expect(alternateClientCreate.response.status).toBe(200);
    expect(
      alternateClientCreate.response.headers.get("access-control-allow-origin"),
    ).toBe("*");
    expect(alternateClientCreate.body.result?.data?.json).toMatchObject({
      title: "Other OAuth Client List",
      userId: owner.id,
    });
    auth.clientId = "member_http_test";

    expect(
      (await call("list.create", { title: "Missing retry ID" }, true)).response
        .status,
    ).toBe(400);
    expect(
      (await call("image.create", { type: "profile" }, true)).response.status,
    ).toBe(400);
    const oversizedCreate = await handleMemberHttpRequest(
      new Request("http://localhost:3217/api/v1/member/list.create", {
        method: "POST",
        headers: { Authorization: "Bearer local-test-token" },
        body: "x".repeat(65_537),
      }),
      "list.create",
    );
    expect(oversizedCreate.status).toBe(413);
    const beforeOversizedEdit = (await readSqlQueries()).length;
    const oversizedEdit = await handleMemberHttpRequest(
      new Request("http://localhost:3217/api/v1/member/profile.update", {
        method: "POST",
        headers: {
          Authorization: "Bearer local-test-token",
          "Content-Length": "65537",
        },
        body: "x".repeat(65_537),
      }),
      "profile.update",
    );
    expect(oversizedEdit.status).toBe(413);
    expect((await readSqlQueries()).slice(beforeOversizedEdit)).toHaveLength(0);

    const beforeStreamedEdit = (await readSqlQueries()).length;
    const streamedEdit = await handleMemberHttpRequest(
      new Request("http://localhost:3217/api/v1/member/profile.update", {
        method: "POST",
        headers: { Authorization: "Bearer local-test-token" },
        body: "x".repeat(65_537),
      }),
      "profile.update",
    );
    expect(streamedEdit.status).toBe(413);
    expect((await readSqlQueries()).slice(beforeStreamedEdit)).toHaveLength(0);

    const beforeMalformedEdit = (await readSqlQueries()).length;
    const malformedEdit = await handleMemberHttpRequest(
      new Request("http://localhost:3217/api/v1/member/profile.update", {
        method: "POST",
        headers: { Authorization: "Bearer local-test-token" },
        body: "{invalid",
      }),
      "profile.update",
    );
    expect(malformedEdit.status).toBe(400);
    expect((await readSqlQueries()).slice(beforeMalformedEdit)).toHaveLength(0);

    const requestId = randomUUID();
    const beforeCreate = (await readSqlQueries()).length;
    const created = await call(
      "list.create",
      { requestId, title: "Local member HTTP proof" },
      true,
    );
    const createQueries = (await readSqlQueries()).slice(beforeCreate);
    expect(created.response.status).toBe(200);
    expect(getClerkUserData).toHaveBeenCalledWith(auth.clerkUserId);
    expect(
      createQueries.filter((query) => /FROM `main`\.`KeyValue`/i.test(query)),
    ).toHaveLength(1);
    expect(createQueries.some((query) => /\bCOUNT\s*\(/i.test(query))).toBe(
      false,
    );
    const listId = created.body.result?.data?.json?.id as string;
    expect(listId).toBeTruthy();

    const beforeListingCreate = (await readSqlQueries()).length;
    const createdListing = await call(
      "listing.create",
      {
        requestId: randomUUID(),
        title: "Local member HTTP listing proof",
        hidden: true,
      },
      true,
    );
    const listingCreateQueries = (await readSqlQueries()).slice(
      beforeListingCreate,
    );
    expect(createdListing.response.status).toBe(200);
    expect(
      listingCreateQueries.filter((query) =>
        /FROM `main`\.`KeyValue`/i.test(query),
      ),
    ).toHaveLength(1);
    expect(
      listingCreateQueries.some((query) => /\bCOUNT\s*\(/i.test(query)),
    ).toBe(false);
    const listingId = createdListing.body.result?.data?.json?.id as string;
    expect(listingId).toBeTruthy();
    const syncCultivar = await db.cultivarReference.findFirst({
      where: { v2AhsCultivar: { isNot: null } },
      select: {
        id: true,
        v2AhsCultivar: { select: { post_title: true } },
      },
    });
    if (!syncCultivar?.v2AhsCultivar?.post_title) {
      throw new Error("Seed cultivar display name is missing.");
    }
    expect(
      (
        await call(
          "listing.linkCultivar",
          { id: listingId, cultivarReferenceId: syncCultivar.id },
          true,
        )
      ).response.status,
    ).toBe(200);
    const syncedListing = await call(
      "listing.syncCultivarName",
      { id: listingId },
      true,
    );
    expect(syncedListing.response.status).toBe(200);
    expect(syncedListing.body.result?.data?.json?.title).toBe(
      syncCultivar.v2AhsCultivar.post_title,
    );
    const largeImagePreparation = await call(
      "image.prepareUpload",
      {
        type: "listing",
        referenceId: listingId,
        contentType: "image/png",
        size: 1,
        imageDataUrl: "x".repeat(65_537),
      },
      true,
    );
    expect(largeImagePreparation.response.status).toBe(400);
    expect(largeImagePreparation.body.error?.json?.data?.code).toBe(
      "BAD_REQUEST",
    );

    const updated = await call(
      "list.update",
      {
        id: listId,
        expectedUpdatedAt: new Date(
          (
            await db.list.findUniqueOrThrow({ where: { id: listId } })
          ).updatedAt,
        ).toISOString(),
        data: { description: "Edited through HTTP" },
      },
      true,
    );
    expect(updated.response.status).toBe(200);
    expect(updated.body.result?.data?.json).not.toHaveProperty("listings");
    const readBack = await call("list.get", { id: listId });
    expect(readBack.body.result?.data?.json?.description).toBe(
      "Edited through HTTP",
    );
    expect(readBack.body.result?.data?.json?.hasMembers).toBe(false);

    const largeList = await db.list.findFirst({
      where: { id: "5", userId: owner.id },
      select: { id: true },
    });
    if (!largeList) throw new Error("Seed member's large list is missing.");
    const membershipSample = await db.$queryRaw<Array<{ B: string }>>`
      SELECT B FROM "_ListToListing" WHERE A = ${largeList.id} LIMIT 101
    `;
    expect(membershipSample).toHaveLength(101);
    const largeListUpdatedAt = (
      await db.list.findUniqueOrThrow({ where: { id: largeList.id } })
    ).updatedAt.toISOString();
    const beforeLargeListEdit = (await readSqlQueries()).length;
    const largeListEdit = await call(
      "list.update",
      {
        id: largeList.id,
        expectedUpdatedAt: largeListUpdatedAt,
        data: { description: "Bounded member edit" },
      },
      true,
    );
    const largeListQueries = (await readSqlQueries()).slice(
      beforeLargeListEdit,
    );
    expect(largeListEdit.response.status).toBe(200);
    expect(largeListEdit.body.result?.data?.json).not.toHaveProperty(
      "listings",
    );
    expect(
      largeListQueries.some((query) =>
        /SELECT[\s\S]*FROM [`"]?(?:main[`"]?\.)?[`"]?_ListToListing/i.test(
          query,
        ),
      ),
    ).toBe(false);

    const profileEditVersion = (
      await db.userProfile.findUniqueOrThrow({ where: { userId: owner.id } })
    ).updatedAt.toISOString();
    const oversizedProfile = await call(
      "profile.update",
      {
        expectedUpdatedAt: profileEditVersion,
        data: { location: "x".repeat(201) },
      },
      true,
    );
    expect(oversizedProfile.response.status).toBe(400);
    expect(
      (
        await call(
          "profile.update",
          {
            expectedUpdatedAt: profileEditVersion,
            data: { slug: "changed-without-review" },
          },
          true,
        )
      ).response.status,
    ).toBe(400);
    const profileUrlHandoff = await call("handoff.get", {
      destination: "edit_profile_url",
    });
    expect(profileUrlHandoff.response.status).toBe(200);
    expect(profileUrlHandoff.body.result?.data?.json?.dashboardPath).toBe(
      "/dashboard/profile#profile-url",
    );
    const updatedProfile = await call(
      "profile.update",
      {
        expectedUpdatedAt: profileEditVersion,
        data: { location: "Local member API proof" },
      },
      true,
    );
    expect(updatedProfile.response.status).toBe(200);
    expect(updatedProfile.body.result?.data?.json?.location).toBe(
      "Local member API proof",
    );

    const profileBefore = await call("profile.get", {});
    const profileImages = profileBefore.body.result?.data?.json?.images as
      | Array<{ id: string; order: number }>
      | undefined;
    expect(profileImages?.length).toBeGreaterThan(0);
    expect(typeof profileImages?.[0]?.id).toBe("string");
    expect(profileImages?.map((image) => image.order)).toEqual(
      [...(profileImages ?? [])]
        .map((image) => image.order)
        .sort((a, b) => a - b),
    );
    const expectedUpdatedAt = profileBefore.body.result?.data?.json?.updatedAt;
    if (typeof expectedUpdatedAt !== "string") {
      throw new Error("Seed profile timestamp is missing.");
    }
    const appended = await call(
      "profile.appendParagraph",
      { paragraph: "Member API paragraph proof", expectedUpdatedAt },
      true,
    );
    expect(appended.response.status).toBe(200);
    const content = appended.body.result?.data?.json?.content;
    expect(typeof content).toBe("string");
    const parsedContent = JSON.parse(content as string) as {
      blocks: Array<{ id?: string; data: { text: string } }>;
    };
    expect(parsedContent.blocks.at(-1)?.data.text).toBe(
      "Member API paragraph proof",
    );
    const paragraphId = parsedContent.blocks.at(-1)?.id;
    expect(paragraphId).toBeTruthy();
    const blockHandoff = await call("handoff.get", {
      destination: "remove_profile_content_block",
      blockId: paragraphId,
    });
    expect(blockHandoff.body.result?.data?.json?.dashboardPath).toBe(
      `/dashboard/profile?contentBlock=${paragraphId}#profile-content`,
    );
    expect(
      (
        await call("handoff.get", {
          destination: "remove_profile_content_block",
          blockId: "missing-block",
        })
      ).response.status,
    ).toBe(404);
    const richContent = JSON.stringify({
      blocks: [
        ...parsedContent.blocks,
        {
          id: randomUUID(),
          type: "header",
          data: { text: "Member API heading", level: 2 },
        },
      ],
    });
    const richEdit = await call(
      "profile.updateContent",
      {
        content: richContent,
        expectedUpdatedAt: appended.body.result?.data?.json?.updatedAt,
      },
      true,
    );
    expect(richEdit.response.status).toBe(200);
    const savedRichContent = JSON.parse(
      richEdit.body.result?.data?.json?.content as string,
    ) as { blocks: Array<{ data: { text?: string } }> };
    expect(savedRichContent.blocks.at(-1)?.data.text).toBe(
      "Member API heading",
    );
    expect(
      (
        await call(
          "profile.updateContent",
          {
            content: JSON.stringify({ blocks: parsedContent.blocks.slice(1) }),
            expectedUpdatedAt: richEdit.body.result?.data?.json?.updatedAt,
          },
          true,
        )
      ).response.status,
    ).toBe(400);
    expect(
      (
        await call(
          "profile.updateContent",
          {
            content: richContent,
            expectedUpdatedAt: appended.body.result?.data?.json?.updatedAt,
          },
          true,
        )
      ).response.status,
    ).toBe(409);
    expect(
      (
        await call(
          "profile.appendParagraph",
          { paragraph: "Stale retry", expectedUpdatedAt },
          true,
        )
      ).response.status,
    ).toBe(409);

    const largeStory = JSON.stringify({
      blocks: [
        ...(
          JSON.parse(richEdit.body.result?.data?.json?.content as string) as {
            blocks: unknown[];
          }
        ).blocks,
        ...Array.from({ length: 6 }, () => ({
          id: randomUUID(),
          type: "paragraph",
          data: { text: "花".repeat(4_000) },
        })),
      ],
    });
    const largeStoryInput = {
      content: largeStory,
      expectedUpdatedAt: richEdit.body.result?.data?.json?.updatedAt,
    };
    expect(largeStory.length).toBeLessThan(40_000);
    expect(
      Buffer.byteLength(JSON.stringify({ json: largeStoryInput })),
    ).toBeGreaterThan(64 * 1024);
    const savedLargeStory = await call(
      "profile.updateContent",
      largeStoryInput,
      true,
    );
    expect(savedLargeStory.response.status).toBe(200);
    expect(
      (
        JSON.parse(
          savedLargeStory.body.result?.data?.json?.content as string,
        ) as {
          blocks: Array<{ data: { text?: string } }>;
        }
      ).blocks.at(-1)?.data.text?.length,
    ).toBe(4_000);

    const added = await call(
      "list.addListing",
      { listId, listingId: firstListing.id },
      true,
    );
    expect(added.response.status).toBe(200);
    expect(added.body.result?.data?.json).not.toHaveProperty("listings");
    const members = await call("listing.page", { listId, limit: 1 });
    expect(members.body.result?.data?.json?.items).toMatchObject([
      { id: firstListing.id },
    ]);
    expect(
      (await call("list.get", { id: listId })).body.result?.data?.json
        ?.hasMembers,
    ).toBe(true);

    const extraListIds = Array.from(
      { length: 110 },
      (_, index) => `mcp_page_${String(index).padStart(3, "0")}`,
    );
    await db.list.createMany({
      data: extraListIds.map((id) => ({
        id,
        userId: owner.id,
        title: `Member list ${id}`,
      })),
    });
    await db.$executeRaw(
      Prisma.sql`INSERT INTO "_ListToListing" ("A", "B") VALUES ${Prisma.join(
        extraListIds.map((id) => Prisma.sql`(${id}, ${firstListing.id})`),
      )}`,
    );
    const largeMembershipDetail = await call("listing.get", {
      id: firstListing.id,
    });
    expect(largeMembershipDetail.response.status).toBe(200);
    const detail = largeMembershipDetail.body.result?.data?.json as {
      lists: Array<{ id: string }>;
      listsNextCursor: string | null;
    };
    expect(detail.lists).toHaveLength(100);
    expect(detail.listsNextCursor).toBe(detail.lists.at(-1)?.id);

    const listedIds: string[] = [];
    let cursor: string | null = null;
    do {
      const page = await call("list.page", {
        listingId: firstListing.id,
        limit: 100,
        ...(cursor ? { cursor } : {}),
      });
      expect(page.response.status).toBe(200);
      const result = page.body.result?.data?.json as {
        items: Array<{ id: string }>;
        nextCursor: string | null;
      };
      expect(result.items.length).toBeLessThanOrEqual(100);
      listedIds.push(...result.items.map((item) => item.id));
      cursor = result.nextCursor;
    } while (cursor);
    const expectedLists = await db.list.findMany({
      where: {
        userId: owner.id,
        listings: { some: { id: firstListing.id } },
      },
      select: { id: true },
      orderBy: { id: "asc" },
    });
    expect(listedIds).toEqual(expectedLists.map((list) => list.id));
    expect(detail.lists.map((list) => list.id)).toEqual(
      listedIds.slice(0, 100),
    );

    const profileId = profileBefore.body.result?.data?.json?.id;
    if (typeof profileId !== "string") {
      throw new Error("Seed member profile is missing.");
    }
    const imageTargets = [
      { type: "listing" as const, referenceId: firstListing.id },
      { type: "profile" as const, referenceId: profileId },
    ];
    for (const target of imageTargets) {
      await db.image.createMany({
        data: Array.from({ length: 25 }, (_, index) => ({
          id: `mcp_image_${target.type}_${String(index).padStart(3, "0")}`,
          url: `https://example.com/${target.type}/${index}.png`,
          order: index + 100,
          ...(target.type === "listing"
            ? { listingId: target.referenceId }
            : { userProfileId: target.referenceId }),
        })),
      });
      const exact = await call(
        target.type === "listing" ? "listing.get" : "profile.get",
        target.type === "listing" ? { id: target.referenceId } : {},
      );
      expect(exact.response.status).toBe(200);
      expect(exact.body.result?.data?.json?.images).toHaveLength(20);
      expect(exact.body.result?.data?.json?.imagesHasMore).toBe(true);

      const imageIds: string[] = [];
      let imageCursor: string | null = null;
      do {
        const page = await call("image.listForTarget", {
          ...target,
          limit: 20,
          ...(imageCursor ? { cursor: imageCursor } : {}),
        });
        expect(page.response.status).toBe(200);
        const result = page.body.result?.data?.json as {
          items: Array<{ id: string }>;
          nextCursor: string | null;
        };
        expect(result.items.length).toBeLessThanOrEqual(20);
        imageIds.push(...result.items.map((item) => item.id));
        imageCursor = result.nextCursor;
      } while (imageCursor);
      const expectedImages = await db.image.findMany({
        where:
          target.type === "listing"
            ? { listingId: target.referenceId }
            : { userProfileId: target.referenceId },
        select: { id: true },
        orderBy: { id: "asc" },
      });
      expect(imageIds).toEqual(expectedImages.map((image) => image.id));
    }

    const foreignList = await db.list.findFirst({
      where: { userId: { not: owner.id } },
      select: { id: true },
    });
    if (!foreignList) throw new Error("Seed foreign list is missing.");
    const foreign = await call("list.get", { id: foreignList.id });
    expect(foreign.response.status).toBe(404);
    const foreignListing = await db.listing.findFirst({
      where: { userId: { not: owner.id } },
      select: { id: true },
    });
    if (!foreignListing) throw new Error("Seed foreign listing is missing.");
    const foreignMemberships = await call("list.page", {
      listingId: foreignListing.id,
    });
    expect(foreignMemberships.response.status).toBe(200);
    expect(foreignMemberships.body.result?.data?.json?.items).toEqual([]);
    expect(
      (
        await call("image.listForTarget", {
          type: "listing",
          referenceId: foreignListing.id,
        })
      ).response.status,
    ).toBe(404);
    const beforeForeignListing = (await readSqlQueries()).length;
    expect(
      (await call("listing.get", { id: foreignListing.id })).response.status,
    ).toBe(404);
    const foreignListingQueries = (await readSqlQueries()).slice(
      beforeForeignListing,
    );
    expect(foreignListingQueries).toHaveLength(2);
    expect(
      (
        await call("handoff.get", {
          destination: "delete_listing",
          id: foreignListing.id,
        })
      ).response.status,
    ).toBe(404);

    expect(
      (
        await call(
          "list.removeListing",
          { listId, listingId: firstListing.id },
          true,
        )
      ).response.status,
    ).toBe(403);
    expect(
      (await call("list.delete", { id: listId }, true)).response.status,
    ).toBe(403);
    expect(
      (await call("listing.delete", { id: firstListing.id }, true)).response
        .status,
    ).toBe(403);
    expect(
      (await call("image.delete", { id: "any" }, true)).response.status,
    ).toBe(403);
    expect(await db.list.findUnique({ where: { id: listId } })).not.toBeNull();

    auth.scopes = ["catalog:read", "catalog:write", "catalog:manage"];
    const mcpClientRemoval = await call(
      "list.removeListings",
      { listId, listingIds: [firstListing.id] },
      true,
    );
    expect(mcpClientRemoval.response.status).toBe(403);
    process.env.DAYLILY_MEMBER_API_OAUTH_CLIENT_IDS =
      "another_client,trusted_manage_test,member_http_test";
    try {
      const allowlistedMcpRemoval = await call(
        "list.removeListings",
        { listId, listingIds: [firstListing.id] },
        true,
      );
      expect(allowlistedMcpRemoval.response.status).toBe(403);
    } finally {
      process.env.DAYLILY_MEMBER_API_OAUTH_CLIENT_IDS =
        "another_client,trusted_manage_test";
    }
    expect(
      await db.list.findFirst({
        where: { id: listId, listings: { some: { id: firstListing.id } } },
      }),
    ).not.toBeNull();

    auth.clientId = "trusted_manage_test";
    auth.scopes = ["catalog:read", "catalog:write", "catalog:manage"];
    const beforeManage = (await readSqlQueries()).length;
    expect(
      (await call("list.delete", { id: listId }, true)).response.status,
    ).toBe(412);
    expect(await db.list.findUnique({ where: { id: listId } })).not.toBeNull();
    expect(
      (
        await call(
          "list.removeListing",
          { listId, listingId: firstListing.id },
          true,
        )
      ).response.status,
    ).toBe(200);
    expect(
      await db.list.findFirst({
        where: { id: listId, listings: { some: { id: firstListing.id } } },
      }),
    ).toBeNull();
    expect(
      (
        await call(
          "list.addListing",
          { listId, listingId: firstListing.id },
          true,
        )
      ).response.status,
    ).toBe(200);
    expect(
      (
        await call(
          "list.removeListings",
          { listId, listingIds: [foreignListing.id] },
          true,
        )
      ).response.status,
    ).toBe(412);
    expect(
      (
        await call(
          "list.removeListings",
          { listId, listingIds: [firstListing.id] },
          true,
        )
      ).response.status,
    ).toBe(200);
    expect(
      (await call("list.delete", { id: listId }, true)).response.status,
    ).toBe(200);
    expect(await db.list.findUnique({ where: { id: listId } })).toBeNull();
    expect(
      (await call("list.delete", { id: foreignList.id }, true)).response.status,
    ).toBe(404);
    expect(
      await db.list.findUnique({ where: { id: foreignList.id } }),
    ).not.toBeNull();

    expect(
      (await call("listing.unlinkCultivar", { id: foreignListing.id }, true))
        .response.status,
    ).toBe(404);
    expect(
      (await call("listing.unlinkCultivar", { id: listingId }, true)).response
        .status,
    ).toBe(200);
    expect(
      (await call("listing.delete", { id: listingId }, true)).response.status,
    ).toBe(200);
    expect(
      await db.listing.findUnique({ where: { id: listingId } }),
    ).toBeNull();
    expect(
      (await call("listing.delete", { id: foreignListing.id }, true)).response
        .status,
    ).toBe(404);
    expect(
      await db.listing.findUnique({ where: { id: foreignListing.id } }),
    ).not.toBeNull();

    expect(
      (
        await call(
          "image.delete",
          {
            type: "listing",
            referenceId: foreignListing.id,
            imageId: "mcp_image_listing_000",
          },
          true,
        )
      ).response.status,
    ).toBe(404);

    expect(
      (
        await call(
          "image.delete",
          {
            type: "listing",
            referenceId: firstListing.id,
            imageId: "mcp_image_listing_000",
          },
          true,
        )
      ).response.status,
    ).toBe(200);
    expect(
      await db.image.findUnique({ where: { id: "mcp_image_listing_000" } }),
    ).toBeNull();

    expect(
      (
        await call(
          "profile.updateWithUrl",
          {
            expectedUpdatedAt: (
              await db.userProfile.findUniqueOrThrow({
                where: { userId: owner.id },
              })
            ).updatedAt.toISOString(),
            data: { slug: "rolling-oaks-local-manage" },
          },
          true,
        )
      ).response.status,
    ).toBe(200);
    expect(
      (await db.userProfile.findUniqueOrThrow({ where: { userId: owner.id } }))
        .slug,
    ).toBe("rolling-oaks-local-manage");
    const profileForRemoval = await call("profile.get", {});
    const removalTimestamp =
      profileForRemoval.body.result?.data?.json?.updatedAt;
    expect(typeof removalTimestamp).toBe("string");
    expect(
      (
        await call(
          "profile.replaceContent",
          { content: null, expectedUpdatedAt: removalTimestamp },
          true,
        )
      ).response.status,
    ).toBe(200);
    expect(
      (await db.userProfile.findUniqueOrThrow({ where: { userId: owner.id } }))
        .content,
    ).toBeNull();
    const manageQueries = (await readSqlQueries()).slice(beforeManage);
    expect(manageQueries.some((query) => /\bCOUNT\s*\(/i.test(query))).toBe(
      false,
    );
    const { consumeMemberRequestBudget } = await import(
      "@/server/security/member-request-budget"
    );
    for (let request = 0; request < 120; request += 1) {
      consumeMemberRequestBudget(auth.clientId, auth.clerkUserId);
    }
    const beforeLimitedRequest = (await readSqlQueries()).length;
    const limited = await call("listing.page", { limit: 1 });
    expect(limited.response.status).toBe(429);
    expect(limited.response.headers.get("retry-after")).toBe("60");
    expect((await readSqlQueries()).slice(beforeLimitedRequest)).toHaveLength(
      0,
    );
  }, 120_000);

  it("reads owned listing details through the libSQL adapter", async () => {
    if (!databasePath) throw new Error("Disposable database is missing.");
    const database = new PrismaClient({
      adapter: new PrismaLibSql(
        { url: `file:${databasePath}` },
        { timestampFormat: "unixepoch-ms" },
      ),
    });
    try {
      const knownListing = await database.listing.findUnique({
        where: { id: "10" },
        select: { userId: true },
      });
      if (!knownListing) throw new Error("Seed listing is missing.");
      const userId = knownListing.userId;
      const listing = await database.listing.findFirst({
        where: { userId, lists: { some: {} } },
        select: {
          id: true,
          images: { select: { id: true }, orderBy: { order: "asc" } },
          lists: { select: { id: true, title: true }, orderBy: { id: "asc" } },
        },
      });
      if (!listing) throw new Error("Seed list membership is missing.");
      const { getOwnedMemberListingDetail } = await import(
        "@/server/services/member-listing-read"
      );
      const { MEMBER_IMAGE_DETAIL_LIMIT } = await import(
        "@/server/services/member-image-read"
      );
      const { MEMBER_LISTING_LIST_PAGE_SIZE } = await import(
        "@/server/services/member-list-read"
      );
      const detail = await getOwnedMemberListingDetail({
        id: listing.id,
        memberDb: database,
        publicDb: null,
        userId,
      });
      expect(detail?.images.map(({ id }) => id)).toEqual(
        listing.images.slice(0, MEMBER_IMAGE_DETAIL_LIMIT).map(({ id }) => id),
      );
      expect(detail?.imagesHasMore).toBe(
        listing.images.length > MEMBER_IMAGE_DETAIL_LIMIT,
      );
      expect(detail?.lists).toEqual(
        listing.lists.slice(0, MEMBER_LISTING_LIST_PAGE_SIZE),
      );
      expect(detail?.listsNextCursor).toBe(
        listing.lists.length > MEMBER_LISTING_LIST_PAGE_SIZE
          ? listing.lists[MEMBER_LISTING_LIST_PAGE_SIZE - 1]?.id
          : null,
      );
      const foreign = await database.listing.findFirst({
        where: { userId: { not: userId } },
        select: { id: true },
      });
      if (!foreign) throw new Error("Seed foreign listing is missing.");
      expect(
        await getOwnedMemberListingDetail({
          id: foreign.id,
          memberDb: database,
          publicDb: null,
          userId,
        }),
      ).toBeNull();
    } finally {
      await database.$disconnect();
    }
  });
});
