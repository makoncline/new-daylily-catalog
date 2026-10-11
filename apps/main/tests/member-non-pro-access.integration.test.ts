// @vitest-environment node

import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { APP_CONFIG } from "@/config/constants";
import { withTempAppDb } from "@/lib/test-utils/app-test-db";
import { memberOperationResultSchemas } from "@/lib/member-result-contract";
import { memberMcpProfileResultSchema } from "@/server/mcp/member-mcp-result-contract";

const auth = vi.hoisted(() => ({
  clientId: "non_pro_remote_test",
  clerkUserId: "",
  isAuthenticated: true,
  scopes: ["catalog:read", "catalog:write"],
}));
const getStripeClient = vi.hoisted(() => vi.fn());

vi.mock("@/server/clerk/client", () => ({
  getClerk: async () => ({
    authenticateRequest: async () => ({
      toAuth: () => ({
        ...auth,
        userId: auth.clerkUserId,
      }),
    }),
  }),
}));
vi.mock("@/server/clerk/sync-user", () => ({
  getClerkUserData: async () => ({ email: "remote-tier-test@example.com" }),
}));
vi.mock("@/server/stripe/client", () => ({ getStripeClient }));
vi.mock("@/lib/error-utils", () => ({ reportError: vi.fn() }));

type Transport = "MCP" | "HTTP";
type RemoteResponse = { ok: boolean; status: number; text: string };

async function remoteCaller(transport: Transport) {
  const { handleMemberHttpRequest } = await import("@/server/api/member-http");
  const { handleMcpRequest } = await import("@/server/mcp/read-only-mcp");
  return async (
    mcpName: string,
    apiPath: string,
    mcpInput: Record<string, unknown>,
    apiInput = mcpInput,
    mutation = true,
  ): Promise<RemoteResponse> => {
    const headers = {
      Authorization: "Bearer local-test-token",
      "Content-Type": "application/json",
    };
    if (transport === "MCP") {
      const response = await handleMcpRequest(
        new Request("https://daylilycatalog.com/api/mcp/server", {
          method: "POST",
          headers,
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "tools/call",
            params: { name: mcpName, arguments: mcpInput },
          }),
        }),
      );
      const body = (await response.json()) as {
        error?: unknown;
        result?: { isError?: boolean };
      };
      return {
        ok: response.ok && !!body.result && !body.result.isError && !body.error,
        status: response.status,
        text: JSON.stringify(body),
      };
    }
    const url = new URL(`https://daylilycatalog.com/api/v1/member/${apiPath}`);
    if (!mutation)
      url.searchParams.set("input", JSON.stringify({ json: apiInput }));
    const response = await handleMemberHttpRequest(
      new Request(url, {
        method: mutation ? "POST" : "GET",
        headers,
        ...(mutation ? { body: JSON.stringify({ json: apiInput }) } : {}),
      }),
      apiPath,
    );
    return {
      ok: response.ok,
      status: response.status,
      text: await response.text(),
    };
  };
}

function readVersion(
  response: RemoteResponse,
  transport: Transport,
  entity: "listing" | "list" | "profile",
  id: string,
) {
  expect(response.ok, response.text).toBe(true);
  const body = JSON.parse(response.text) as {
    result?: {
      structuredContent?: Record<string, unknown>;
      data?: { json?: unknown };
    };
  };
  const schema =
    transport === "MCP" && entity === "profile"
      ? memberMcpProfileResultSchema
      : memberOperationResultSchemas[`${entity}.get`];
  const record = schema.parse(
    transport === "MCP"
      ? body.result?.structuredContent?.[entity]
      : body.result?.data?.json,
  );
  expect(record?.id).toBe(id);
  return record!.updatedAt;
}

function expectConflict(response: RemoteResponse, transport: Transport) {
  expect(response.ok, response.text).toBe(false);
  const body: unknown = JSON.parse(response.text);
  if (transport === "MCP") {
    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      result: {
        isError: true,
        structuredContent: { error: { code: "CONFLICT" } },
      },
    });
  } else {
    expect(response.status).toBe(409);
    expect(body).toMatchObject({
      error: { json: { data: { code: "CONFLICT", httpStatus: 409 } } },
    });
  }
}

describe.each<Transport>(["MCP", "HTTP"])(
  "%s account tier access",
  (transport) => {
    beforeEach(() => {
      vi.clearAllMocks();
      vi.stubEnv("SKIP_ENV_VALIDATION", "1");
      vi.stubEnv("INTEGRATION_MODE", "1");
      vi.stubEnv("TURSO_EMBEDDED_REPLICA_URL", "");
      vi.stubEnv("DAYLILY_MCP_OAUTH_CLIENT_ID", "non_pro_remote_test");
      vi.stubEnv("DAYLILY_MEMBER_API_OAUTH_CLIENT_IDS", "");
      auth.clientId = "non_pro_remote_test";
      auth.clerkUserId = `user_${randomUUID()}`;
      auth.isAuthenticated = true;
      auth.scopes = ["catalog:read", "catalog:write"];
      getStripeClient.mockImplementation(() => {
        throw new Error("Stripe is unavailable in this local test.");
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
      vi.unstubAllEnvs();
    });

    it("round-trips remote versions, rejects stale edits, and keeps non-Pro authorization and handoffs", async () => {
      await withTempAppDb(async ({ user }) => {
        const { db } = await import("@/server/db");
        await db.user.update({
          where: { id: user.id },
          data: { clerkUserId: auth.clerkUserId },
        });
        const call = await remoteCaller(transport);
        const listingInput = {
          requestId: randomUUID(),
          title: "Private test listing",
          hidden: true,
        };
        expect(
          (await call("daylily.create_listing", "listing.create", listingInput))
            .ok,
        ).toBe(true);
        expect(
          (await call("daylily.create_listing", "listing.create", listingInput))
            .ok,
        ).toBe(true);
        const listings = await db.listing.findMany({
          where: { userId: user.id },
        });
        expect(listings).toHaveLength(1);
        const listing = listings[0]!;
        expect(listing.status).toBe("HIDDEN");

        const listInput = { requestId: randomUUID(), title: "Test list" };
        expect(
          (await call("daylily.create_list", "list.create", listInput)).ok,
        ).toBe(true);
        expect(
          (await call("daylily.create_list", "list.create", listInput)).ok,
        ).toBe(true);
        const list = await db.list.findFirstOrThrow({
          where: { userId: user.id },
        });
        expect(
          (
            await call("daylily.add_listing_to_list", "list.addListing", {
              listId: list.id,
              listingId: listing.id,
            })
          ).ok,
        ).toBe(true);

        const expectedUpdatedAt = readVersion(
          await call(
            "daylily.get_listing",
            "listing.get",
            { id: listing.id },
            undefined,
            false,
          ),
          transport,
          "listing",
          listing.id,
        );
        const update = await call(
          "daylily.update_listing",
          "listing.update",
          { listingId: listing.id, expectedUpdatedAt, price: 12 },
          { id: listing.id, expectedUpdatedAt, data: { price: 12 } },
        );
        expect(update.ok, update.text).toBe(true);
        const savedListing = await db.listing.findUniqueOrThrow({
          where: { id: listing.id },
        });
        expect(savedListing.price).toBe(12);
        expect(savedListing.updatedAt.toISOString()).not.toBe(
          expectedUpdatedAt,
        );
        expectConflict(
          await call(
            "daylily.update_listing",
            "listing.update",
            { listingId: listing.id, expectedUpdatedAt, price: 99 },
            { id: listing.id, expectedUpdatedAt, data: { price: 99 } },
          ),
          transport,
        );
        expect(
          await db.listing.findUniqueOrThrow({ where: { id: listing.id } }),
        ).toEqual(savedListing);

        const listVersion = readVersion(
          await call(
            "daylily.get_list",
            "list.get",
            { id: list.id },
            undefined,
            false,
          ),
          transport,
          "list",
          list.id,
        );
        const listUpdate = await call(
          "daylily.update_list",
          "list.update",
          {
            listId: list.id,
            expectedUpdatedAt: listVersion,
            title: "Edited list",
          },
          {
            id: list.id,
            expectedUpdatedAt: listVersion,
            data: { title: "Edited list" },
          },
        );
        expect(listUpdate.ok, listUpdate.text).toBe(true);
        const savedList = await db.list.findUniqueOrThrow({
          where: { id: list.id },
        });
        expect(savedList.updatedAt.toISOString()).not.toBe(listVersion);
        expectConflict(
          await call(
            "daylily.update_list",
            "list.update",
            {
              listId: list.id,
              expectedUpdatedAt: listVersion,
              title: "Stale list",
            },
            {
              id: list.id,
              expectedUpdatedAt: listVersion,
              data: { title: "Stale list" },
            },
          ),
          transport,
        );
        expect(
          await db.list.findUniqueOrThrow({ where: { id: list.id } }),
        ).toEqual(savedList);
        expect(
          await db.list.findUnique({
            where: { id: list.id },
            include: { listings: true },
          }),
        ).toMatchObject({
          title: "Edited list",
          listings: [{ id: listing.id, price: 12 }],
        });

        const profileUpdate = await call(
          "daylily.update_profile",
          "profile.update",
          { expectedUpdatedAt: null, description: "Test grower" },
          { expectedUpdatedAt: null, data: { description: "Test grower" } },
        );
        expect(profileUpdate.ok, profileUpdate.text).toBe(true);
        const profile = await db.userProfile.findUniqueOrThrow({
          where: { userId: user.id },
        });
        expect(profile.description).toBe("Test grower");
        const profileVersion = readVersion(
          await call(
            "daylily.get_profile",
            "profile.get",
            {},
            undefined,
            false,
          ),
          transport,
          "profile",
          profile.id,
        );
        const profileEdit = await call(
          "daylily.update_profile",
          "profile.update",
          { expectedUpdatedAt: profileVersion, description: "Edited grower" },
          {
            expectedUpdatedAt: profileVersion,
            data: { description: "Edited grower" },
          },
        );
        expect(profileEdit.ok, profileEdit.text).toBe(true);
        const savedProfile = await db.userProfile.findUniqueOrThrow({
          where: { id: profile.id },
        });
        expect(savedProfile.description).toBe("Edited grower");
        expect(savedProfile.updatedAt.toISOString()).not.toBe(profileVersion);
        expectConflict(
          await call(
            "daylily.update_profile",
            "profile.update",
            { expectedUpdatedAt: profileVersion, description: "Stale grower" },
            {
              expectedUpdatedAt: profileVersion,
              data: { description: "Stale grower" },
            },
          ),
          transport,
        );
        expect(
          await db.userProfile.findUniqueOrThrow({ where: { id: profile.id } }),
        ).toEqual(savedProfile);

        const beforeDashboardVersion = readVersion(
          await call(
            "daylily.get_profile",
            "profile.get",
            {},
            undefined,
            false,
          ),
          transport,
          "profile",
          profile.id,
        );
        const { createCaller } = await import("@/server/api/root");
        const dashboard = createCaller({
          db,
          headers: new Headers(),
          clerkUserId: auth.clerkUserId,
        });
        await dashboard.dashboardDb.userProfile.updateBasic({
          expectedUpdatedAt: beforeDashboardVersion,
          data: { location: "Dashboard garden" },
        });
        const dashboardProfile = await db.userProfile.findUniqueOrThrow({
          where: { id: profile.id },
        });
        expect(dashboardProfile.location).toBe("Dashboard garden");
        expectConflict(
          await call(
            "daylily.update_profile",
            "profile.update",
            {
              expectedUpdatedAt: beforeDashboardVersion,
              location: "Stale garden",
            },
            {
              expectedUpdatedAt: beforeDashboardVersion,
              data: { location: "Stale garden" },
            },
          ),
          transport,
        );
        expect(
          await db.userProfile.findUniqueOrThrow({ where: { id: profile.id } }),
        ).toEqual(dashboardProfile);
        const afterDashboardVersion = readVersion(
          await call(
            "daylily.get_profile",
            "profile.get",
            {},
            undefined,
            false,
          ),
          transport,
          "profile",
          profile.id,
        );
        expect(afterDashboardVersion).not.toBe(beforeDashboardVersion);
        const afterDashboardEdit = await call(
          "daylily.update_profile",
          "profile.update",
          {
            expectedUpdatedAt: afterDashboardVersion,
            location: "Remote garden",
          },
          {
            expectedUpdatedAt: afterDashboardVersion,
            data: { location: "Remote garden" },
          },
        );
        expect(afterDashboardEdit.ok, afterDashboardEdit.text).toBe(true);
        expect(
          await db.userProfile.findUniqueOrThrow({ where: { id: profile.id } }),
        ).toMatchObject({
          description: "Edited grower",
          location: "Remote garden",
        });
        const first = await db.image.create({
          data: {
            userProfileId: profile.id,
            url: "https://example.com/first.jpg",
            order: 0,
          },
        });
        const second = await db.image.create({
          data: {
            userProfileId: profile.id,
            url: "https://example.com/second.jpg",
            order: 1,
          },
        });
        const reorder = await call(
          "daylily.reorder_images",
          "image.reorder",
          {
            type: "profile",
            referenceId: profile.id,
            imageIds: [second.id, first.id],
          },
          {
            type: "profile",
            referenceId: profile.id,
            images: [
              { id: second.id, order: 0 },
              { id: first.id, order: 1 },
            ],
          },
        );
        expect(reorder.ok, reorder.text).toBe(true);
        expect(
          (
            await db.image.findMany({
              where: { userProfileId: profile.id },
              orderBy: { order: "asc" },
            })
          ).map((image) => image.id),
        ).toEqual([second.id, first.id]);

        const foreignUser = await db.user.create({ data: {} });
        const foreignListing = await db.listing.create({
          data: {
            userId: foreignUser.id,
            title: "Foreign",
            slug: "foreign",
            status: "HIDDEN",
          },
        });
        const deniedOwnership = await call(
          "daylily.update_listing",
          "listing.update",
          {
            listingId: foreignListing.id,
            expectedUpdatedAt: foreignListing.updatedAt.toISOString(),
            price: 99,
          },
          {
            id: foreignListing.id,
            expectedUpdatedAt: foreignListing.updatedAt.toISOString(),
            data: { price: 99 },
          },
        );
        expect(deniedOwnership.ok).toBe(false);
        expect(
          (
            await db.listing.findUniqueOrThrow({
              where: { id: foreignListing.id },
            })
          ).price,
        ).toBeNull();

        auth.scopes = ["catalog:read"];
        expect(
          (
            await call("daylily.create_listing", "listing.create", {
              ...listingInput,
              requestId: randomUUID(),
            })
          ).ok,
        ).toBe(false);
        auth.scopes = ["catalog:read", "catalog:write"];
        auth.clientId = "wrong_client";
        expect(
          (
            await call("daylily.create_listing", "listing.create", {
              ...listingInput,
              requestId: randomUUID(),
            })
          ).ok,
        ).toBe(false);
        auth.clientId = "non_pro_remote_test";

        const handoff = await call(
          "daylily.open_dashboard",
          "handoff.get",
          { destination: "delete_listing", id: listing.id },
          undefined,
          false,
        );
        expect(handoff.ok, handoff.text).toBe(true);
        expect(handoff.text).toContain("dashboard/listings");
        auth.scopes.push("catalog:manage");
        expect(
          (
            await call("daylily.delete_listing", "listing.delete", {
              id: listing.id,
            })
          ).ok,
        ).toBe(false);
        expect(
          await db.listing.findUnique({ where: { id: listing.id } }),
        ).toBeTruthy();
        expect(getStripeClient).not.toHaveBeenCalled();

        if (transport === "HTTP") {
          vi.stubEnv(
            "DAYLILY_MEMBER_API_OAUTH_CLIENT_IDS",
            "trusted_member_test",
          );
          auth.clientId = "trusted_member_test";
          const currentProfile = await db.userProfile.findUniqueOrThrow({
            where: { userId: user.id },
          });
          const customUrl = await call(
            "",
            "profile.updateWithUrl",
            {},
            {
              expectedUpdatedAt: currentProfile.updatedAt.toISOString(),
              data: { slug: "review-garden" },
            },
          );
          expect(customUrl.ok).toBe(false);
          expect(customUrl.text).toContain("Upgrade to Pro");
          expect(
            (
              await db.userProfile.findUniqueOrThrow({
                where: { userId: user.id },
              })
            ).slug,
          ).toBe(profile.slug);
        }
      });
    });

    it("enforces caps, reuses one tier lookup, and blocks unconfirmed billing", async () => {
      await withTempAppDb(async ({ user }) => {
        const { db } = await import("@/server/db");
        const { kvStore } = await import("@/server/db/kvStore");
        const customerId = `cus_${randomUUID()}`;
        await db.user.update({
          where: { id: user.id },
          data: { clerkUserId: auth.clerkUserId, stripeCustomerId: customerId },
        });
        const key = `stripe:customer:${customerId}`;
        await kvStore.set(key, { status: "canceled" });
        await db.listing.createMany({
          data: Array.from(
            { length: APP_CONFIG.LISTING.FREE_TIER_MAX_LISTINGS - 1 },
            (_, index) => ({
              userId: user.id,
              title: `Seed ${index}`,
              slug: `seed-${index}`,
              status: "HIDDEN",
            }),
          ),
        });
        await db.list.create({
          data: { userId: user.id, title: "Existing list" },
        });
        const lookup = vi.spyOn(kvStore, "get");
        const call = await remoteCaller(transport);
        const create = () =>
          call("daylily.create_listing", "listing.create", {
            requestId: randomUUID(),
            title: "New listing",
            hidden: true,
          });
        const createList = () =>
          call("daylily.create_list", "list.create", {
            requestId: randomUUID(),
            title: "Another list",
          });

        const allowed = await create();
        expect(allowed.ok, allowed.text).toBe(true);
        expect(lookup).toHaveBeenCalledTimes(1);
        lookup.mockClear();
        const deniedListing = await create();
        expect(deniedListing.ok).toBe(false);
        expect(deniedListing.text).toContain("Upgrade to Pro");
        expect(lookup).toHaveBeenCalledTimes(1);
        lookup.mockClear();
        const deniedList = await createList();
        expect(deniedList.ok).toBe(false);
        expect(deniedList.text).toContain("Upgrade to Pro");
        expect(lookup).toHaveBeenCalledTimes(1);
        expect(await db.listing.count({ where: { userId: user.id } })).toBe(
          APP_CONFIG.LISTING.FREE_TIER_MAX_LISTINGS,
        );
        expect(await db.list.count({ where: { userId: user.id } })).toBe(
          APP_CONFIG.LIST.FREE_TIER_MAX_LISTS,
        );

        for (const status of ["active", "trialing"]) {
          await kvStore.set(key, { status });
          lookup.mockClear();
          const paidListing = await create();
          expect(paidListing.ok, paidListing.text).toBe(true);
          expect(lookup).toHaveBeenCalledTimes(1);
          lookup.mockClear();
          const paidList = await createList();
          expect(paidList.ok, paidList.text).toBe(true);
          expect(lookup).toHaveBeenCalledTimes(1);
        }
        expect(getStripeClient).not.toHaveBeenCalled();

        await kvStore.delete(key);
        lookup.mockClear();
        const unconfirmed = await create();
        expect(unconfirmed.ok).toBe(false);
        expect(unconfirmed.text).toContain("could not be confirmed");
        expect(lookup).toHaveBeenCalledTimes(1);
        expect(getStripeClient).toHaveBeenCalledTimes(1);
        expect(await db.listing.count({ where: { userId: user.id } })).toBe(
          APP_CONFIG.LISTING.FREE_TIER_MAX_LISTINGS + 2,
        );
      });
    });
  },
);
