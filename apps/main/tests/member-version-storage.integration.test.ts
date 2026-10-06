// @vitest-environment node

import { readFileSync } from "node:fs";
import { createClient } from "@libsql/client";
import { describe, expect, it } from "vitest";
import type { TRPCInternalContext } from "@/server/api/trpc";
import { withTempAppDb } from "@/lib/test-utils/app-test-db";

const sql = readFileSync(
  "prisma/data-migrations/20261006_normalize_member_version_storage.sql",
  "utf8",
);

describe("member version storage correction", () => {
  it("preserves stored dates, enables edits, and still rejects stale versions", async () => {
    await withTempAppDb(async ({ user }) => {
      const { db } = await import("@/server/db");
      const { createCaller } = await import("@/server/api/root");
      const caller = createCaller({
        db,
        headers: new Headers(),
        _authUser: { id: user.id } as TRPCInternalContext["_authUser"],
      });
      const profile = await db.userProfile.create({
        data: { userId: user.id, slug: user.id },
      });
      const listing = await db.listing.create({
        data: { userId: user.id, title: "Bloom", slug: "bloom" },
      });
      const list = await db.list.create({
        data: { userId: user.id, title: "Collection" },
      });
      const isoDate = "2026-03-02T22:28:08.430+00:00";
      const version = new Date(isoDate).toISOString();
      for (const [table, id] of [
        ["UserProfile", profile.id],
        ["Listing", listing.id],
        ["List", list.id],
      ]) {
        await db.$executeRawUnsafe(
          `UPDATE "${table}" SET "updatedAt" = ? WHERE id = ?`,
          isoDate,
          id,
        );
      }
      const input = {
        expectedUpdatedAt: version,
        data: { description: "Garden" },
      };
      await expect(
        caller.dashboardDb.userProfile.updateBasic(input),
      ).rejects.toMatchObject({ code: "CONFLICT" });

      const client = createClient({ url: process.env.DATABASE_URL! });
      try {
        await client.executeMultiple(sql);
        await client.executeMultiple(sql);
      } finally {
        client.close();
      }
      for (const [table, id] of [
        ["UserProfile", profile.id],
        ["Listing", listing.id],
        ["List", list.id],
      ]) {
        expect(
          await db.$queryRawUnsafe(
            `SELECT updatedAt, typeof(updatedAt) AS storageType FROM "${table}" WHERE id = ?`,
            id,
          ),
        ).toEqual([{ updatedAt: new Date(isoDate), storageType: "integer" }]);
      }
      const saved = await caller.dashboardDb.userProfile.updateBasic(input);
      expect(saved.description).toBe("Garden");
      await caller.dashboardDb.listing.update({
        id: listing.id,
        expectedUpdatedAt: version,
        data: { price: 19 },
      });
      await caller.dashboardDb.list.update({
        id: list.id,
        expectedUpdatedAt: version,
        data: { description: "Collection description" },
      });
      await expect(
        caller.dashboardDb.userProfile.updateBasic(input),
      ).rejects.toMatchObject({ code: "CONFLICT" });
      await expect(
        caller.dashboardDb.listing.update({
          id: listing.id,
          expectedUpdatedAt: version,
          data: { price: 20 },
        }),
      ).rejects.toMatchObject({ code: "CONFLICT" });
      await expect(
        caller.dashboardDb.list.update({
          id: list.id,
          expectedUpdatedAt: version,
          data: { description: "Stale description" },
        }),
      ).rejects.toMatchObject({ code: "CONFLICT" });
    });
  }, 30_000);

  it("stops before changing data when a stored text date is invalid", async () => {
    await withTempAppDb(async ({ user }) => {
      const { db } = await import("@/server/db");
      await db.userProfile.create({ data: { userId: user.id, slug: user.id } });
      await db.$executeRaw`UPDATE UserProfile SET updatedAt = 'invalid' WHERE userId = ${user.id}`;
      const client = createClient({ url: process.env.DATABASE_URL! });
      try {
        await expect(client.executeMultiple(sql)).rejects.toThrow();
      } finally {
        client.close();
      }
      expect(
        await db.$queryRaw`SELECT CAST(updatedAt AS TEXT) AS value FROM UserProfile WHERE userId = ${user.id}`,
      ).toEqual([{ value: "invalid" }]);
    });
  }, 30_000);
});
