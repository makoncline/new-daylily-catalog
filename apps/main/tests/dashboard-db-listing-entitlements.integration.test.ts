// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TRPCInternalContext } from "@/server/api/trpc";
import { APP_CONFIG } from "@/config/constants";
import { withTempAppDb } from "@/lib/test-utils/app-test-db";

process.env.SKIP_ENV_VALIDATION = "1";
process.env.DATABASE_URL ??=
  "file:./tests/.tmp/dashboard-db-listing-entitlements.sqlite";

const getStripeSubscriptionResult = vi.hoisted(() => vi.fn());
const getStripeSubscription = vi.hoisted(() => vi.fn());

vi.mock("@/server/stripe/sync-subscription", () => ({
  getStripeSubscription,
  getStripeSubscriptionResult,
}));

async function createAuthedCaller(userId: string) {
  const { db } = await import("@/server/db");
  const { createCaller } = await import("@/server/api/root");
  const caller = createCaller(async () => {
    const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
    return {
      db,
      headers: new Headers({ "x-dashboard-member-id": user.id }),
      _authUser: user as unknown as TRPCInternalContext["_authUser"],
    } satisfies TRPCInternalContext;
  });

  return { caller, db } satisfies {
    caller: ReturnType<typeof createCaller>;
    db: TRPCInternalContext["db"];
  };
}

async function seedFreeTierLimit(
  db: TRPCInternalContext["db"],
  userId: string,
  count: number = APP_CONFIG.LISTING.FREE_TIER_MAX_LISTINGS,
) {
  await db.listing.createMany({
    data: Array.from({ length: count }, (_, index) => ({
      userId,
      title: `Listing ${index + 1}`,
      slug: `listing-${index + 1}`,
    })),
  });
}

describe("dashboard listing creation entitlements", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks a confirmed free account at the server-side listing limit", async () => {
    getStripeSubscriptionResult.mockResolvedValue({
      subscription: { status: "none" },
      confirmed: true,
    });

    await withTempAppDb(async ({ user }) => {
      const { caller, db } = await createAuthedCaller(user.id);
      await seedFreeTierLimit(db, user.id);

      await expect(
        caller.dashboardV2.listing.create({ title: "One Too Many" }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(
        db.listing.count({ where: { userId: user.id } }),
      ).resolves.toBe(APP_CONFIG.LISTING.FREE_TIER_MAX_LISTINGS);
    });
  });

  it.each([
    {
      name: "active Pro account",
      result: {
        subscription: { status: "active" },
        confirmed: true,
      },
    },
    {
      name: "temporarily unconfirmed Stripe lookup",
      result: {
        subscription: { status: "none" },
        confirmed: false,
      },
    },
  ])("allows creation for an $name", async ({ result }) => {
    getStripeSubscriptionResult.mockResolvedValue(result);

    await withTempAppDb(async ({ user }) => {
      const { caller, db } = await createAuthedCaller(user.id);
      await seedFreeTierLimit(db, user.id);

      await expect(
        caller.dashboardV2.listing.create({ title: "Allowed Listing" }),
      ).resolves.toMatchObject({ title: "Allowed Listing" });
      await expect(
        db.listing.count({ where: { userId: user.id } }),
      ).resolves.toBe(APP_CONFIG.LISTING.FREE_TIER_MAX_LISTINGS + 1);
    });
  });

  it("imports listing rows once when a batch is retried", async () => {
    getStripeSubscriptionResult.mockResolvedValue({
      subscription: { status: "trialing" },
      confirmed: true,
    });

    await withTempAppDb(async ({ user }) => {
      const { caller, db } = await createAuthedCaller(user.id);
      const rows = [
        {
          cultivarReferenceId: null,
          description: "First import row",
          importKey: "project-1:source-row-2",
          price: 12,
          privateNote: "Front bed",
          title: "Stella de Oro",
        },
        {
          cultivarReferenceId: null,
          description: "Second size",
          importKey: "project-1:source-row-3",
          price: 10,
          privateNote: null,
          title: "Stella de Oro",
        },
      ];

      await expect(
        caller.dashboardV2.listing.importRows({ rows }),
      ).resolves.toMatchObject({
        createdCount: 2,
        reusedCount: 0,
        alreadyImportedCount: 0,
      });
      await expect(
        caller.dashboardV2.listing.importRows({ rows }),
      ).resolves.toMatchObject({
        createdCount: 0,
        reusedCount: 0,
        alreadyImportedCount: 2,
      });

      const listings = await db.listing.findMany({
        where: { userId: user.id },
        orderBy: { slug: "asc" },
      });
      expect(listings).toHaveLength(2);
      expect(listings.map((listing) => listing.slug)).toEqual([
        "stella-de-oro",
        "stella-de-oro-1",
      ]);
      expect(listings[0]).toMatchObject({
        description: "First import row",
        importKey: "project-1:source-row-2",
        price: 12,
        privateNote: "Front bed",
      });
    });
  });

  it("rejects a free-tier import batch that crosses the listing limit", async () => {
    getStripeSubscriptionResult.mockResolvedValue({
      subscription: { status: "none" },
      confirmed: true,
    });

    await withTempAppDb(async ({ user }) => {
      const { caller, db } = await createAuthedCaller(user.id);
      await seedFreeTierLimit(
        db,
        user.id,
        APP_CONFIG.LISTING.FREE_TIER_MAX_LISTINGS - 1,
      );
      const rows = ["First", "Second"].map((title, index) => ({
        cultivarReferenceId: null,
        description: null,
        importKey: `free-tier-batch:${index}`,
        price: null,
        privateNote: null,
        title,
      }));

      await expect(
        caller.dashboardV2.listing.importRows({ rows }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(
        caller.dashboardV2.listing.importRows({ rows: [rows[0]!] }),
      ).resolves.toMatchObject({ createdCount: 1 });
      await expect(
        db.listing.count({ where: { userId: user.id } }),
      ).resolves.toBe(APP_CONFIG.LISTING.FREE_TIER_MAX_LISTINGS);
    });
  });

  it("keeps an equivalent listing unchanged and creates different sale details", async () => {
    getStripeSubscriptionResult.mockResolvedValue({
      subscription: { status: "trialing" },
      confirmed: true,
    });

    await withTempAppDb(async ({ user }) => {
      const { caller, db } = await createAuthedCaller(user.id);
      await db.listing.create({
        data: {
          description: "Display row",
          price: 15,
          privateNote: "Front bed",
          slug: "happy-returns",
          title: "Happy Returns",
          userId: user.id,
        },
      });

      const exactRow = {
        cultivarReferenceId: null,
        description: "Display row",
        importKey: "project-2:source-row-2",
        price: 15,
        privateNote: "Front bed",
        title: "Happy Returns",
      };
      await expect(
        caller.dashboardV2.listing.importRows({ rows: [exactRow] }),
      ).resolves.toMatchObject({
        createdCount: 0,
        reusedCount: 1,
      });

      const changedRow = {
        ...exactRow,
        importKey: "project-2:source-row-3",
        price: 18,
      };
      await expect(
        caller.dashboardV2.listing.importRows({
          rows: [changedRow],
        }),
      ).resolves.toMatchObject({ createdCount: 1, reusedCount: 0 });
      await expect(
        db.listing.count({ where: { userId: user.id } }),
      ).resolves.toBe(2);
    });
  });
});

describe("catalog sale rows across batches", () => {
  it("keeps 350 distinct sale rows, merges explicit lists, and safely retries response loss", async () => {
    getStripeSubscriptionResult.mockResolvedValue({
      subscription: { status: "active" },
      confirmed: true,
    });
    await withTempAppDb(async ({ user }) => {
      const { caller, db } = await createAuthedCaller(user.id);
      const reference = await db.cultivarReference.create({
        data: { normalizedName: "batch bloom" },
      });
      const rows = Array.from({ length: 350 }, (_, index) => ({
        title: index < 3 ? `Batch Bloom ${index}` : "Batch Bloom",
        cultivarReferenceId: reference.id,
        price: index,
        description: index % 2 ? "Single fan" : "Double fan",
        privateNote: `Bed ${index}`,
        importKey: `large-project:${index}`,
        lists: ["Sale"],
      }));
      const owned = await db.listing.create({
        data: {
          userId: user.id,
          slug: "existing",
          ...rows[0]!,
          lists: undefined,
          importKey: null,
        },
      });
      const otherUser = await db.user.create({
        data: { clerkUserId: "other-sale-owner" },
      });
      await db.listing.create({
        data: {
          ...rows[1]!,
          lists: undefined,
          userId: otherUser.id,
          slug: "other-owned",
          importKey: null,
        },
      });
      let previousVersion = 0;
      for (let offset = 0; offset < rows.length; offset += 100) {
        const batch = rows.slice(offset, offset + 100);
        const result = await caller.dashboardV2.listing.importRows({
          rows: batch,
        });
        expect(result.createdCount).toBe(batch.length - (offset === 0 ? 1 : 0));
        expect(result.skippedCount).toBe(0);
        const sale = await db.list.findFirstOrThrow({
          where: { userId: user.id, title: "Sale" },
          include: { listings: true },
        });
        expect(sale.updatedAt.getTime()).toBeGreaterThan(previousVersion);
        previousVersion = sale.updatedAt.getTime();
        expect(sale.listings).toHaveLength(Math.min(offset + 100, 350));
        const replay = await caller.dashboardV2.listing.importRows({
          rows: batch,
        });
        expect(replay).toMatchObject({
          createdCount: 0,
          alreadyImportedCount: batch.length,
          skippedCount: 0,
        });
        expect(
          (
            await db.list.findUniqueOrThrow({ where: { id: sale.id } })
          ).updatedAt.getTime(),
        ).toBe(previousVersion);
      }
      const saved = await db.listing.findMany({
        where: { userId: user.id },
        orderBy: { price: "asc" },
      });
      expect(saved).toHaveLength(350);
      expect(
        saved.map(
          ({
            title,
            price,
            description,
            privateNote,
            cultivarReferenceId,
          }) => ({
            title,
            price,
            description,
            privateNote,
            cultivarReferenceId,
          }),
        ),
      ).toEqual(
        rows.map(
          ({
            title,
            price,
            description,
            privateNote,
            cultivarReferenceId,
          }) => ({
            title,
            price,
            description,
            privateNote,
            cultivarReferenceId,
          }),
        ),
      );
      expect(saved[0]!.id).toBe(owned.id);
      expect(await db.listing.count({ where: { userId: otherUser.id } })).toBe(
        1,
      );
      await expect(
        caller.dashboardV2.userProfile.checkSlug({ slug: "playground" }),
      ).resolves.toEqual({ available: false });
    });
  });
});
