// @vitest-environment node
import { describe, it, expect } from "vitest";
import { withTempAppDb } from "@/lib/test-utils/app-test-db";

describe("temp SQLite DB per test via env (global Prisma)", () => {
  it("creates, seeds, and queries a fresh DB", async () => {
    await withTempAppDb(async () => {
      const { db } = await import("@/server/db");
      const user = await db.user.create({ data: {} });
      await db.listing.create({
        data: { userId: user.id, title: "Hello", slug: "hello" },
      });
      const listings = await db.listing.findMany({ include: { user: true } });
      expect(listings.length).toBe(1);
      expect(listings[0]?.title).toBe("Hello");
      expect(listings[0]?.userId).toBe(user.id);
      expect(listings[0]?.user?.id).toBe(user.id);
    });
  });

  it("uses a different isolated DB in another test", async () => {
    await withTempAppDb(async () => {
      const { db } = await import("@/server/db");
      const user = await db.user.create({ data: {} });
      await db.listing.create({
        data: { userId: user.id, title: "World", slug: "world" },
      });
      const titles = (
        await db.listing.findMany({ select: { title: true }, orderBy: { title: "asc" } })
      ).map((r) => r.title);
      expect(titles).toEqual(["World"]);
    });
  });
});
