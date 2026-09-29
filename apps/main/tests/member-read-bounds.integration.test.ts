// @vitest-environment node

import { PrismaClient, type Prisma } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { describe, expect, it } from "vitest";
import { withTempAppDb } from "@/lib/test-utils/app-test-db";

process.env.SKIP_ENV_VALIDATION = "1";
process.env.DATABASE_URL ??= "file:./tests/.tmp/member-read-bounds.sqlite";

function queryClient() {
  const database = new PrismaClient({
    adapter: new PrismaBetterSqlite3(
      { url: process.env.DATABASE_URL! },
      { timestampFormat: "unixepoch-ms" },
    ),
    log: [{ level: "query", emit: "event" }],
  });
  const events: Prisma.QueryEvent[] = [];
  database.$on("query", (event) => events.push(event));
  return { database, events };
}

async function explain(database: PrismaClient, event: Prisma.QueryEvent) {
  const params: unknown[] = JSON.parse(event.params);
  const plan = await database.$queryRawUnsafe<Array<{ detail: string }>>(
    `EXPLAIN QUERY PLAN ${event.query}`,
    ...params,
  );
  return plan.map((step) => step.detail).join(" ");
}

describe("member read bounds", () => {
  it("caps exact cultivar candidates and pages past empty windows without foreign rows", async () => {
    await withTempAppDb(async ({ user }) => {
      const { database, events } = queryClient();
      try {
        const { searchOwnedMemberListings } = await import(
          "@/server/services/member-listing-search"
        );
        const foreign = await database.user.create({ data: {} });
        const cultivar = await database.cultivarReference.create({ data: {} });
        await database.listing.createMany({
          data: Array.from({ length: 450 }, (_, index) => ({
            id: `owned-${String(index).padStart(3, "0")}`,
            userId: user.id,
            slug: `bloom-${index}`,
            title: `Bloom ${index}`,
            cultivarReferenceId: [300, 400].includes(index)
              ? cultivar.id
              : null,
          })),
        });
        await database.listing.createMany({
          data: Array.from({ length: 450 }, (_, index) => ({
            id: `foreign-${index}`,
            userId: foreign.id,
            slug: `foreign-${index}`,
            title: "Foreign bloom",
            cultivarReferenceId: cultivar.id,
          })),
        });

        events.length = 0;
        const missing = await searchOwnedMemberListings({
          database,
          userId: user.id,
          input: { cultivarReferenceId: "absent-cultivar", limit: 1 },
        });
        expect(missing).toEqual({ items: [], nextCursor: "i:owned-199" });
        const reads = events.filter((event) =>
          event.query.startsWith("SELECT"),
        );
        expect(reads).toHaveLength(2);
        expect(
          (JSON.parse(reads[0]!.params) as unknown[]).map(String),
        ).toContain("201");
        expect(await explain(database, reads[0]!)).toContain(
          "Listing_userId_id_idx (userId=? AND id>?)",
        );
        expect(await explain(database, reads[1]!)).toContain(
          "sqlite_autoindex_Listing_1 (id=?)",
        );

        const ids: string[] = [];
        let cursor: string | undefined;
        let pages = 0;
        do {
          const page = await searchOwnedMemberListings({
            database,
            userId: user.id,
            input: { cultivarReferenceId: cultivar.id, cursor, limit: 1 },
          });
          ids.push(...page.items.map((item) => item.id));
          cursor = page.nextCursor ?? undefined;
          expect(++pages).toBeLessThanOrEqual(3);
        } while (cursor);
        expect(pages).toBe(3);
        expect(ids).toEqual(["owned-300", "owned-400"]);
      } finally {
        await database.$disconnect();
      }
    });
  }, 30_000);

  it("seeks the owner and ID for first and later list pages without sorting", async () => {
    await withTempAppDb(async ({ user }) => {
      const { database, events } = queryClient();
      try {
        const { pageOwnedMemberLists } = await import(
          "@/server/services/member-list-read"
        );
        const foreign = await database.user.create({ data: {} });
        await database.list.createMany({
          data: [user.id, foreign.id].flatMap((userId, ownerIndex) =>
            Array.from({ length: 500 }, (_, index) => ({
              id: `${ownerIndex ? "foreign" : "owned"}-${String(index).padStart(3, "0")}`,
              userId,
              title: `List ${index}`,
            })),
          ),
        });

        for (const cursor of [undefined, "owned-024"]) {
          events.length = 0;
          const page = await pageOwnedMemberLists({
            database,
            userId: user.id,
            cursor,
            limit: 25,
          });
          expect(page.items).toHaveLength(25);
          expect(page.items[0]?.id).toBe(cursor ? "owned-025" : "owned-000");
          expect(page.nextCursor).toBe(cursor ? "owned-049" : "owned-024");
          expect(events).toHaveLength(1);
          const plan = await explain(database, events[0]!);
          expect(plan).toContain("List_userId_id_idx (userId=? AND id>?)");
          expect(plan).not.toContain("TEMP B-TREE");
          expect(plan).not.toContain("SCAN");
        }
      } finally {
        await database.$disconnect();
      }
    });
  }, 30_000);
});
