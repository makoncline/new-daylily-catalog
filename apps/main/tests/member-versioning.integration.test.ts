// @vitest-environment node

import { describe, expect, it } from "vitest";
import type { TRPCInternalContext } from "@/server/api/trpc";
import { withTempAppDb } from "@/lib/test-utils/app-test-db";

process.env.SKIP_ENV_VALIDATION = "1";
process.env.DATABASE_URL ??= "file:./tests/.tmp/member-versioning.sqlite";

async function createCaller(userId: string) {
  const { db } = await import("@/server/db");
  const { createCaller } = await import("@/server/api/root");
  const caller = createCaller(async () => ({
    db,
    headers: new Headers(),
    _authUser: {
      id: userId,
    } as TRPCInternalContext["_authUser"],
  }));
  return { caller, db };
}

describe("member mutation versions", () => {
  it("advances listing versions through cultivar commands", async () => {
    await withTempAppDb(async ({ user }) => {
      const { caller, db } = await createCaller(user.id);
      const ahs = await db.v2AhsCultivar.create({
        data: { id: "versioning-ahs", post_title: "Golden Bloom" },
      });
      const cultivar = await db.cultivarReference.create({
        data: { v2AhsCultivarId: ahs.id },
      });
      const listing = await db.listing.create({
        data: {
          userId: user.id,
          title: "Original",
          slug: "original",
          updatedAt: new Date(Date.now() + 10_000),
        },
      });

      const linked = await caller.dashboardDb.listing.linkAhs({
        id: listing.id,
        cultivarReferenceId: cultivar.id,
        syncName: true,
      });
      expect(linked.title).toBe("Golden Bloom");
      expect(linked.updatedAt.getTime()).toBeGreaterThan(
        listing.updatedAt.getTime(),
      );

      const synced = await caller.dashboardDb.listing.syncAhsName({
        id: listing.id,
      });
      expect(synced.updatedAt.getTime()).toBeGreaterThan(
        linked.updatedAt.getTime(),
      );

      const unlinked = await caller.dashboardDb.listing.unlinkAhs({
        id: listing.id,
      });
      expect(unlinked.updatedAt.getTime()).toBeGreaterThan(
        synced.updatedAt.getTime(),
      );
      await expect(
        caller.dashboardDb.listing.update({
          id: listing.id,
          expectedUpdatedAt: listing.updatedAt.toISOString(),
          data: { title: "Stale title" },
        }),
      ).rejects.toMatchObject({ code: "CONFLICT" });
    });
  }, 30_000);

  it("keeps list sync monotonic when deleting a listing", async () => {
    await withTempAppDb(async ({ user }) => {
      const { caller, db } = await createCaller(user.id);
      const listing = await db.listing.create({
        data: { userId: user.id, title: "Bloom", slug: "bloom" },
      });
      const list = await db.list.create({
        data: {
          userId: user.id,
          title: "Future version",
          updatedAt: new Date(Date.now() + 10_000),
        },
      });
      const added = await caller.dashboardDb.list.addListingToList({
        listId: list.id,
        listingId: listing.id,
      });
      await caller.dashboardDb.listing.delete({ id: listing.id });
      const afterDelete = await db.list.findUniqueOrThrow({
        where: { id: list.id },
      });
      expect(afterDelete.updatedAt.getTime()).toBeGreaterThan(
        added.updatedAt.getTime(),
      );
      expect(
        (
          await caller.dashboardDb.list.sync({
            since: added.updatedAt.toISOString(),
          })
        ).find((row) => row.id === list.id)?.listings,
      ).toEqual([]);
    });
  }, 30_000);

  it("syncs an older list after each membership change", async () => {
    await withTempAppDb(async ({ user }) => {
      const { caller, db } = await createCaller(user.id);
      const older = await db.list.create({
        data: {
          userId: user.id,
          title: "Older",
          updatedAt: new Date("2024-01-01T00:00:00.000Z"),
        },
      });
      const newer = await db.list.create({
        data: {
          userId: user.id,
          title: "Newer",
          updatedAt: new Date(Date.now() - 500),
        },
      });
      const listing = await db.listing.create({
        data: { userId: user.id, title: "Bloom", slug: "bloom" },
      });

      const added = await caller.dashboardDb.list.addListingToList({
        listId: older.id,
        listingId: listing.id,
      });
      expect(added.updatedAt.getTime()).toBeGreaterThan(
        newer.updatedAt.getTime(),
      );
      expect(
        (
          await caller.dashboardDb.list.sync({
            since: newer.updatedAt.toISOString(),
          })
        ).find((list) => list.id === older.id)?.listings,
      ).toEqual([{ id: listing.id }]);

      const removed = await caller.dashboardDb.list.removeListingFromList({
        listId: older.id,
        listingId: listing.id,
      });
      expect(removed.updatedAt.getTime()).toBeGreaterThan(
        added.updatedAt.getTime(),
      );
      expect(
        (
          await caller.dashboardDb.list.sync({
            since: added.updatedAt.toISOString(),
          })
        ).find((list) => list.id === older.id)?.listings,
      ).toEqual([]);

      const addedAgain = await caller.dashboardDb.list.addListingToList({
        listId: older.id,
        listingId: listing.id,
      });
      const batchRemoved = await caller.dashboardDb.list.removeListingsFromList(
        {
          listId: older.id,
          listingIds: [listing.id],
        },
      );
      expect(batchRemoved.updatedAt.getTime()).toBeGreaterThan(
        addedAgain.updatedAt.getTime(),
      );
      expect(
        (
          await caller.dashboardDb.list.sync({
            since: addedAgain.updatedAt.toISOString(),
          })
        ).find((list) => list.id === older.id)?.listings,
      ).toEqual([]);
    });
  }, 30_000);

  it("advances the concurrency token for each profile content command", async () => {
    await withTempAppDb(async ({ user }) => {
      const { caller, db } = await createCaller(user.id);
      const initialContent = JSON.stringify({
        time: 1,
        version: "2.30.8",
        blocks: [{ id: "p1", type: "paragraph", data: { text: "First" } }],
      });
      const initial = await db.userProfile.create({
        data: {
          userId: user.id,
          slug: user.id,
          content: initialContent,
          updatedAt: new Date(Date.now() + 10_000),
        },
      });
      const replaced = await caller.dashboardDb.userProfile.updateContent({
        content: initialContent,
        expectedUpdatedAt: initial.updatedAt.toISOString(),
      });
      expect(replaced.updatedAt.getTime()).toBeGreaterThan(
        initial.updatedAt.getTime(),
      );

      const preserved =
        await caller.dashboardDb.userProfile.updateContentPreservingBlocks({
          content: initialContent,
          expectedUpdatedAt: replaced.updatedAt.toISOString(),
        });
      expect(preserved.updatedAt.getTime()).toBeGreaterThan(
        replaced.updatedAt.getTime(),
      );

      const appended = await caller.dashboardDb.userProfile.appendParagraph({
        paragraph: "Second",
        expectedUpdatedAt: preserved.updatedAt.toISOString(),
      });
      expect(appended.updatedAt.getTime()).toBeGreaterThan(
        preserved.updatedAt.getTime(),
      );

      const edited = await caller.dashboardDb.userProfile.updateParagraph({
        blockId: "p1",
        text: "Third",
        expectedUpdatedAt: appended.updatedAt.toISOString(),
      });
      expect(edited.updatedAt.getTime()).toBeGreaterThan(
        appended.updatedAt.getTime(),
      );
      await expect(
        caller.dashboardDb.userProfile.updateContent({
          content: initialContent,
          expectedUpdatedAt: initial.updatedAt.toISOString(),
        }),
      ).rejects.toMatchObject({ code: "CONFLICT" });
    });
  }, 30_000);
});
