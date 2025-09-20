import { describe, it, expect } from "vitest";
import { withTempAppDb } from "@/lib/test-utils/app-test-db";

describe("dashboardTwo listings ownership enforcement", () => {
  it("prevents non-owners from updating or deleting another user's listing (NOT_FOUND) and causes no side-effects", async () => {
    await withTempAppDb(async ({ user }) => {
      const { db } = await import("@/server/db");
      // client imported elsewhere as needed

      // Owner (user.id) creates a listing via router A (legacy or dashboardTwo)
      const created = await db.listing.create({
        data: {
          userId: user.id,
          title: "Owner Listing",
          slug: "owner-listing",
        },
      });

      // Create a second user who will attempt forbidden actions
      const other = await db.user.create({ data: {} });

      // Swap caller context to act as other user for this test
      const { createCaller } = await import("@/server/api/root");
      const callerAsOther = createCaller({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        db: db as any,
        user: { id: other.id },
        headers: new Headers(),
      });

      const reload = async () =>
        db.listing.findUnique({
          where: { id: created.id },
          select: {
            id: true,
            title: true,
            description: true,
            price: true,
            status: true,
            privateNote: true,
            ahsId: true,
          },
        });

      // Update should fail with NOT_FOUND (scoped where filters)
      await expect(
        callerAsOther.dashboardTwo.updateListing({
          id: created.id,
          data: { title: "Hacked" },
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });

      // No side-effects
      expect(await reload()).toMatchObject({
        id: created.id,
        title: "Owner Listing",
      });

      // Field update should fail with NOT_FOUND
      await expect(
        callerAsOther.dashboardTwo.updateListing({
          id: created.id,
          data: { description: "x" },
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });

      // No side-effects on other fields
      expect(await reload()).toMatchObject({
        description: null,
        price: null,
        status: null,
        privateNote: null,
      });

      // setListingAhsId should fail with NOT_FOUND
      await expect(
        callerAsOther.dashboardTwo.setListingAhsId({
          id: created.id,
          ahsId: null,
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });

      // No side-effects
      expect(await reload()).toMatchObject({ ahsId: null });

      // Delete should fail with NOT_FOUND
      await expect(
        callerAsOther.dashboardTwo.deleteListing({ id: created.id }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });

      // Still exists
      expect(await reload()).not.toBeNull();

      // Sanity: owner can still update
      const callerAsOwner = createCaller({
        db,
        user: { id: user.id },
        headers: new Headers(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const updated = await callerAsOwner.dashboardTwo.updateListing({
        id: created.id,
        data: { title: "Owner OK" },
      });
      expect(updated.title).toBe("Owner OK");
    });
  });

  it("getListings returns only caller's rows", async () => {
    await withTempAppDb(async ({ user }) => {
      const { db } = await import("@/server/db");
      const { createCaller } = await import("@/server/api/root");

      const mine = await db.listing.create({
        data: { userId: user.id, title: "Mine", slug: "mine" },
      });
      const other = await db.user.create({ data: {} });
      await db.listing.create({
        data: { userId: other.id, title: "Theirs", slug: "theirs" },
      });

      const caller = createCaller({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        db: db as any,
        user: { id: user.id },
        headers: new Headers(),
      });
      const rows = await caller.dashboardTwo.getListings();
      expect(rows.map((r: { id: string }) => r.id)).toEqual([mine.id]);
    });
  });
});
