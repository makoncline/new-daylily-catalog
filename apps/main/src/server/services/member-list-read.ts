import "server-only";

import { Prisma } from "@prisma/client";
import type { db } from "@/server/db";

export const MEMBER_LISTING_LIST_PAGE_SIZE = 100;

const memberListSelect = {
  id: true,
  title: true,
  description: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const satisfies Prisma.ListSelect;

const memberListPageSelect = {
  id: true,
  title: true,
  description: true,
  status: true,
  updatedAt: true,
} as const satisfies Prisma.ListSelect;

export async function pageOwnedMemberLists(args: {
  database: typeof db;
  userId: string;
  cursor?: string;
  limit: number;
  listingId?: string;
}) {
  if (args.listingId) {
    const ids = await args.database.$queryRaw<Array<{ id: string }>>(
      Prisma.sql`
        SELECT l.id
        FROM "_ListToListing" AS membership
        JOIN "List" AS l ON l.id = membership."A"
        WHERE membership."B" = ${args.listingId}
          AND l."userId" = ${args.userId}
          ${
            args.cursor
              ? Prisma.sql`AND membership."A" > ${args.cursor}`
              : Prisma.empty
          }
        ORDER BY membership."A"
        LIMIT ${args.limit + 1}
      `,
    );
    const pageIds = ids.slice(0, args.limit).map((row) => row.id);
    const rows = await args.database.list.findMany({
      where: { userId: args.userId, id: { in: pageIds } },
      select: memberListPageSelect,
    });
    const rowsById = new Map(rows.map((row) => [row.id, row]));
    return {
      items: pageIds.flatMap((id) => {
        const row = rowsById.get(id);
        return row ? [row] : [];
      }),
      nextCursor: ids.length > args.limit ? (pageIds.at(-1) ?? null) : null,
    };
  }

  const rows = await args.database.$queryRaw<
    Array<Prisma.ListGetPayload<{ select: typeof memberListPageSelect }>>
  >(Prisma.sql`
    SELECT id, title, description, status, updatedAt
    FROM "List" INDEXED BY "List_userId_idx"
    WHERE userId = ${args.userId}
    ${args.cursor ? Prisma.sql`AND id > ${args.cursor}` : Prisma.empty}
    ORDER BY id
    LIMIT ${args.limit + 1}
  `);
  const items = rows.slice(0, args.limit);
  return {
    items,
    nextCursor: rows.length > args.limit ? items.at(-1)?.id : null,
  };
}

export async function hasCurrentListMembers(
  database: typeof db,
  listId: string,
) {
  const rows = await database.$queryRaw<Array<{ present: number }>>`
    SELECT 1 AS present FROM _ListToListing WHERE A = ${listId} LIMIT 1
  `;
  return rows.length > 0;
}

export async function getOwnedMemberListDetail(args: {
  database: typeof db;
  id: string;
  userId: string;
}) {
  const list = await args.database.list.findFirst({
    where: { id: args.id, userId: args.userId },
    select: memberListSelect,
  });
  if (!list) return null;
  return {
    ...list,
    hasMembers: await hasCurrentListMembers(args.database, list.id),
  };
}
