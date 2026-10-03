// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import type { TRPCInternalContext } from "@/server/api/trpc";
import { withTempAppDb } from "@/lib/test-utils/app-test-db";

vi.mock("server-only", () => ({}));

describe("dashboard listing deletion with SQLite", () => {
  it("deletes only an owned listing and advances its lists' sync time", async () => {
    await withTempAppDb(async ({ user }) => {
      const { db } = await import("@/server/db");
      const { dashboardDbListingRouter } = await import(
        "@/server/api/routers/dashboard-db/listing"
      );
      const otherUser = await db.user.create({ data: {} });
      const cultivar = await db.cultivarReference.create({
        data: { normalizedName: "owned cultivar" },
      });
      const owned = await db.listing.create({
        data: {
          userId: user.id,
          title: "Owned",
          slug: "owned",
          cultivarReferenceId: cultivar.id,
        },
      });
      const foreign = await db.listing.create({
        data: {
          userId: otherUser.id,
          title: "Foreign",
          slug: "foreign",
          cultivarReferenceId: cultivar.id,
        },
      });
      const oldTime = new Date("2020-01-01T00:00:00.000Z");
      const ownedList = await db.list.create({
        data: {
          userId: user.id,
          title: "Owned list",
          listings: { connect: { id: owned.id } },
        },
      });
      const unrelatedList = await db.list.create({
        data: {
          userId: otherUser.id,
          title: "Foreign list",
          listings: { connect: { id: foreign.id } },
        },
      });
      await db.list.updateMany({
        where: { id: { in: [ownedList.id, unrelatedList.id] } },
        data: { updatedAt: oldTime },
      });

      const caller = dashboardDbListingRouter.createCaller({
        db,
        headers: new Headers(),
        _authUser: { id: user.id } as TRPCInternalContext["_authUser"],
      });

      await expect(caller.unlinkAhs({ id: foreign.id })).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
      expect(
        (await db.listing.findUniqueOrThrow({ where: { id: foreign.id } }))
          .cultivarReferenceId,
      ).toBe(cultivar.id);
      await expect(caller.unlinkAhs({ id: owned.id })).resolves.toMatchObject({
        cultivarReferenceId: null,
      });

      await expect(caller.delete({ id: foreign.id })).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
      expect(
        await db.listing.findUnique({ where: { id: foreign.id } }),
      ).not.toBeNull();
      expect(
        (await db.list.findUniqueOrThrow({ where: { id: unrelatedList.id } }))
          .updatedAt,
      ).toEqual(oldTime);

      await expect(caller.delete({ id: owned.id })).resolves.toEqual({
        id: owned.id,
      });
      expect(
        await db.listing.findUnique({ where: { id: owned.id } }),
      ).toBeNull();
      expect(
        (
          await db.list.findUniqueOrThrow({ where: { id: ownedList.id } })
        ).updatedAt.getTime(),
      ).toBeGreaterThan(oldTime.getTime());
      expect(
        (await db.list.findUniqueOrThrow({ where: { id: unrelatedList.id } }))
          .updatedAt,
      ).toEqual(oldTime);
    });
  });
});
