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
      const rows = ["First", "Second"].map((title) => ({
        cultivarReferenceId: null,
        description: null,
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

  it("still requires Pro to import lists", async () => {
    getStripeSubscriptionResult.mockResolvedValue({
      subscription: { status: "none" },
      confirmed: true,
    });
    await withTempAppDb(async ({ user }) => {
      const { caller, db } = await createAuthedCaller(user.id);
      await expect(
        caller.dashboardV2.listing.importRows({
          rows: [{ ...importRow("For sale"), lists: ["Sale"] }],
        }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      expect(await db.listing.count({ where: { userId: user.id } })).toBe(0);
    });
  });
});

function importRow(title: string) {
  return {
    title,
    cultivarReferenceId: null,
    price: null,
    description: null,
    privateNote: null,
  };
}

describe("catalog import batches", () => {
  beforeEach(() => {
    getStripeSubscriptionResult.mockResolvedValue({
      subscription: { status: "active" },
      confirmed: true,
    });
  });

  it("skips owned names with the same link without changing their details or lists", async () => {
    await withTempAppDb(async ({ user }) => {
      const { caller, db } = await createAuthedCaller(user.id);
      const reference = await db.cultivarReference.create({
        data: { normalizedName: "batch bloom" },
      });
      const owned = await db.listing.create({
        data: {
          userId: user.id,
          slug: "batch-bloom",
          title: "Batch Bloom",
          price: 12,
          description: "Original",
          privateNote: "Original note",
        },
      });
      const sale = await db.list.create({
        data: {
          userId: user.id,
          title: "Sale",
          listings: { connect: { id: owned.id } },
        },
      });
      const otherUser = await db.user.create({
        data: { clerkUserId: "other-sale-owner" },
      });
      await db.listing.create({
        data: {
          userId: otherUser.id,
          title: "Batch Bloom",
          slug: "batch-bloom",
          cultivarReferenceId: reference.id,
        },
      });

      const rows = [
        { ...importRow("batch   bloom"), price: 15, lists: ["Unused list"] },
        {
          ...importRow("Batch Bloom"),
          cultivarReferenceId: reference.id,
          lists: ["sale"],
        },
        {
          ...importRow(" BATCH BLOOM "),
          cultivarReferenceId: reference.id,
          price: 66,
          lists: ["Unused list"],
        },
      ];
      await expect(
        caller.dashboardV2.listing.importRows({ rows }),
      ).resolves.toEqual({
        createdCount: 1,
        skippedNames: ["batch   bloom", "BATCH BLOOM"],
      });
      const stored = await db.listing.findUniqueOrThrow({
        where: { id: owned.id },
        include: { lists: true },
      });
      expect(stored).toMatchObject({ ...owned, lists: [{ id: sale.id }] });
      const updatedSale = await db.list.findUniqueOrThrow({
        where: { id: sale.id },
        include: { listings: true },
      });
      expect(updatedSale.updatedAt.getTime()).toBeGreaterThan(
        sale.updatedAt.getTime(),
      );
      expect(updatedSale.listings).toMatchObject(
        expect.arrayContaining([
          { ...owned },
          expect.objectContaining({
            title: "Batch Bloom",
            cultivarReferenceId: reference.id,
            userId: user.id,
            slug: "batch-bloom-1",
          }),
        ]),
      );
      await expect(
        caller.dashboardV2.listing.importRows({ rows }),
      ).resolves.toEqual({
        createdCount: 0,
        skippedNames: ["batch   bloom", "Batch Bloom", "BATCH BLOOM"],
      });
      expect(await db.listing.count({ where: { userId: user.id } })).toBe(2);
      expect(await db.list.findMany({ where: { userId: user.id } })).toEqual([
        expect.objectContaining({
          id: sale.id,
          updatedAt: updatedSale.updatedAt,
        }),
      ]);
    });
  });

  it("rejects 101 distinct lists before writing and accepts 100", async () => {
    await withTempAppDb(async ({ user }) => {
      const { caller, db } = await createAuthedCaller(user.id);
      const first = {
        ...importRow("First"),
        lists: Array.from({ length: 100 }, (_, index) => `List ${index + 1}`),
      };
      const second = { ...importRow("Second"), lists: ["List 101"] };
      await expect(
        caller.dashboardV2.listing.importRows({ rows: [first, second] }),
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: "Import at most 100 lists at a time.",
      });
      expect(await db.listing.count({ where: { userId: user.id } })).toBe(0);
      expect(await db.list.count({ where: { userId: user.id } })).toBe(0);
      await expect(
        caller.dashboardV2.listing.importRows({
          rows: [first, { ...second, lists: [" list   100 "] }],
        }),
      ).resolves.toEqual({ createdCount: 2, skippedNames: [] });
      expect(await db.list.count({ where: { userId: user.id } })).toBe(100);
      expect(
        await db.list.findFirstOrThrow({
          where: { userId: user.id, title: "List 100" },
          include: { _count: { select: { listings: true } } },
        }),
      ).toMatchObject({ _count: { listings: 2 } });
    });
  });
});
