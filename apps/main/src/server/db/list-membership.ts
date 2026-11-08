import "server-only";

import { createClient, type Client, type Row } from "@libsql/client";
import type { List } from "@prisma/client";
import { env, requireEnv } from "@/env";

let primary: Client | undefined;

function primaryClient() {
  return (primary ??= createClient({
    url: requireEnv("DATABASE_URL", env.DATABASE_URL),
    authToken: env.TURSO_DATABASE_AUTH_TOKEN,
  }));
}

function listRowsQuery(userId: string, ids?: string[]) {
  return {
    sql: `
      SELECT "id", "userId", "title", "description", "status", "createdAt", "updatedAt",
        (SELECT json_group_array("B") FROM "_ListToListing" WHERE "A" = "List"."id") AS members
      FROM "List"
      WHERE "userId" = ?
      ${ids ? 'AND "id" IN (SELECT value FROM json_each(?))' : 'ORDER BY "createdAt" DESC'}
    `,
    args: ids ? [userId, JSON.stringify(ids)] : [userId],
  };
}

type MembershipListRow = Row & {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  status: string | null;
  createdAt: number | string;
  updatedAt: number | string;
  members: string;
};

function fromSqliteDate(value: number | string) {
  if (typeof value === "number") return new Date(value);
  const iso = value.replace(" ", "T");
  return new Date(/(?:Z|[+-]\d{2}:\d{2})$/i.test(iso) ? iso : `${iso}Z`);
}

function listRows(rows: Row[]): (List & { listings: { id: string }[] })[] {
  return (rows as MembershipListRow[]).map(
    ({ createdAt, updatedAt, members, ...list }) => ({
      ...list,
      createdAt: fromSqliteDate(createdAt),
      updatedAt: fromSqliteDate(updatedAt),
      listings: (JSON.parse(members) as string[]).map((id) => ({ id })),
    }),
  );
}

export async function readMembershipLists(userId: string) {
  return listRows((await primaryClient().execute(listRowsQuery(userId))).rows);
}

export async function writeListMemberships({
  userId,
  lists,
  listingIds,
  present,
  requireMembers = false,
}: {
  userId: string;
  lists: { id: string; expectedUpdatedAt?: string }[];
  listingIds: string[];
  present: boolean;
  requireMembers?: boolean;
}) {
  const ids = lists.map(({ id }) => id);
  const listVersions = JSON.stringify(
    Object.fromEntries(
      lists.map(({ id, expectedUpdatedAt }) => [
        id,
        expectedUpdatedAt ? Date.parse(expectedUpdatedAt) : null,
      ]),
    ),
  );
  const listIdsJson = JSON.stringify(ids);
  const listingIdsJson = JSON.stringify(listingIds);

  // The first statement validates every target before changing any version.
  // changes() gates the membership statement on that result on the same connection.
  const [versions, , snapshot] = await primaryClient().batch(
    [
      {
        sql: `
          WITH requestedLists AS (SELECT key AS id, value AS version FROM json_each(?)),
               requestedListings AS (SELECT value AS id FROM json_each(?))
          UPDATE "List"
          SET "updatedAt" = MAX("updatedAt" + 1, ?)
          WHERE "id" IN (SELECT id FROM requestedLists)
            AND NOT EXISTS (
              SELECT 1 FROM requestedLists AS target
              LEFT JOIN "List" AS owned
                ON owned."id" = target.id AND owned."userId" = ?
                AND (target.version IS NULL OR owned."updatedAt" = target.version)
              WHERE owned."id" IS NULL
            )
            AND NOT EXISTS (
              SELECT 1 FROM requestedListings AS target
              LEFT JOIN "Listing" AS owned ON owned."id" = target.id AND owned."userId" = ?
              WHERE owned."id" IS NULL
            )
            AND (? = 0 OR NOT EXISTS (
              SELECT 1 FROM requestedLists CROSS JOIN requestedListings
              LEFT JOIN "_ListToListing" AS membership
                ON membership."A" = requestedLists.id AND membership."B" = requestedListings.id
              WHERE membership."A" IS NULL
            ))
        `,
        args: [
          listVersions,
          listingIdsJson,
          Date.now(),
          userId,
          userId,
          Number(requireMembers),
        ],
      },
      {
        sql: present
          ? `
            INSERT INTO "_ListToListing" ("A", "B")
            SELECT lists.value, listings.value FROM json_each(?) AS lists CROSS JOIN json_each(?) AS listings
            WHERE changes() = ?
            ON CONFLICT("A", "B") DO NOTHING
          `
          : `
            DELETE FROM "_ListToListing"
            WHERE "A" IN (SELECT value FROM json_each(?))
              AND "B" IN (SELECT value FROM json_each(?))
              AND changes() = ?
          `,
        args: [listIdsJson, listingIdsJson, lists.length],
      },
      listRowsQuery(userId, ids),
    ],
    "write",
  );

  return {
    changed: versions!.rowsAffected === lists.length,
    lists: listRows(snapshot!.rows),
  };
}
