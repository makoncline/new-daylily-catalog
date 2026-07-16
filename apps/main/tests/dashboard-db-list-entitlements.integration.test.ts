// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TRPCInternalContext } from "@/server/api/trpc";
import { APP_CONFIG } from "@/config/constants";
import { withTempAppDb } from "@/lib/test-utils/app-test-db";

process.env.SKIP_ENV_VALIDATION = "1";
process.env.DATABASE_URL ??=
  "file:./tests/.tmp/dashboard-db-list-entitlements.sqlite";

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
      headers: new Headers(),
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
) {
  await db.list.createMany({
    data: Array.from(
      { length: APP_CONFIG.LIST.FREE_TIER_MAX_LISTS },
      (_, index) => ({
        userId,
        title: `List ${index + 1}`,
      }),
    ),
  });
}

describe("dashboard list creation entitlements", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks a confirmed free account at the server-side list limit", async () => {
    getStripeSubscriptionResult.mockResolvedValue({
      subscription: { status: "none" },
      confirmed: true,
    });

    await withTempAppDb(async ({ user }) => {
      const { caller, db } = await createAuthedCaller(user.id);
      await seedFreeTierLimit(db, user.id);

      await expect(
        caller.dashboardDb.list.create({ title: "One Too Many" }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(db.list.count({ where: { userId: user.id } })).resolves.toBe(
        APP_CONFIG.LIST.FREE_TIER_MAX_LISTS,
      );
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
        caller.dashboardDb.list.create({ title: "Allowed List" }),
      ).resolves.toMatchObject({ title: "Allowed List" });
      await expect(db.list.count({ where: { userId: user.id } })).resolves.toBe(
        APP_CONFIG.LIST.FREE_TIER_MAX_LISTS + 1,
      );
    });
  });
});
