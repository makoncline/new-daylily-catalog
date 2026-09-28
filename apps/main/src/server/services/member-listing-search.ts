import "server-only";

import { Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { db } from "@/server/db";
import { textContains } from "@/server/services/listing-search-filters";

const searchText = z.string().trim().min(1).max(200).optional();

export const memberListingSearchSchema = z.strictObject({
  cursor: z.string().min(1).max(130).optional(),
  limit: z.number().int().min(1).max(100).default(25),
  cultivarReferenceId: z.string().trim().min(1).max(128).optional(),
  description: searchText,
  hasPhoto: z.boolean().optional(),
  hasPrice: z.boolean().optional(),
  linkedToCultivar: z.boolean().optional(),
  listId: z.string().trim().min(1).max(128).optional(),
  priceMax: z.number().finite().optional(),
  priceMin: z.number().finite().optional(),
  q: searchText,
  status: searchText,
  title: searchText,
});

export type MemberListingSearchInput = z.infer<
  typeof memberListingSearchSchema
>;

const listingSummarySelect = {
  id: true,
  title: true,
  slug: true,
  price: true,
  status: true,
  cultivarReferenceId: true,
  updatedAt: true,
} as const satisfies Prisma.ListingSelect;
const ownedListingSummarySelect = {
  ...listingSummarySelect,
  userId: true,
} as const satisfies Prisma.ListingSelect;

type ListingSummary = Prisma.ListingGetPayload<{
  select: typeof listingSummarySelect;
}>;

const FILTERED_CANDIDATE_LIMIT = 200;

function buildMemberListingWhere(
  userId: string,
  input: MemberListingSearchInput,
  options: { includeIdRange?: boolean; includeOwner?: boolean } = {},
) {
  const and: Prisma.ListingWhereInput[] =
    options.includeOwner === false ? [] : [{ userId }];

  if (options.includeIdRange !== false && !input.listId) {
    and.push({
      id: input.cursor ? { gt: input.cursor.slice(2) } : { gte: "" },
    });
  }

  if (input.q) {
    const contains = textContains(input.q);
    and.push({
      OR: [
        { title: contains },
        { description: contains },
        { privateNote: contains },
      ],
    });
  }

  if (input.title) and.push({ title: textContains(input.title) });
  if (input.description) {
    and.push({ description: textContains(input.description) });
  }
  if (input.status) and.push({ status: input.status });
  if (input.listId) {
    and.push({ lists: { some: { id: input.listId } } });
  }

  if (input.hasPhoto === true) {
    and.push({
      OR: [
        { images: { some: {} } },
        { imageAssets: { some: { status: "ready" } } },
      ],
    });
  } else if (input.hasPhoto === false) {
    and.push({
      AND: [
        { images: { none: {} } },
        { imageAssets: { none: { status: "ready" } } },
      ],
    });
  }

  if (input.hasPrice === true) {
    and.push({ price: { gt: 0 } });
  } else if (input.hasPrice === false) {
    and.push({ OR: [{ price: null }, { price: { lte: 0 } }] });
  }
  if (typeof input.priceMin === "number") {
    and.push({ price: { gte: input.priceMin } });
  }
  if (typeof input.priceMax === "number") {
    and.push({ price: { lte: input.priceMax } });
  }

  if (input.linkedToCultivar === true) {
    and.push({ cultivarReferenceId: { not: null } });
  } else if (input.linkedToCultivar === false) {
    and.push({ cultivarReferenceId: null });
  }
  if (input.cultivarReferenceId) {
    and.push({ cultivarReferenceId: input.cultivarReferenceId });
  }
  return { AND: and } satisfies Prisma.ListingWhereInput;
}

async function findListFilteredRows(args: {
  database: typeof db;
  input: MemberListingSearchInput & { listId: string };
  userId: string;
}): Promise<{ rows: ListingSummary[]; nextCursor: string | null }> {
  const { database, input, userId } = args;
  const { cursor, limit, listId, ...filters } = input;
  const hasOtherFilters = Object.values(filters).some(
    (value) => value !== undefined,
  );
  const scanLimit = hasOtherFilters ? FILTERED_CANDIDATE_LIMIT : limit;
  const where = buildMemberListingWhere(
    userId,
    {
      ...input,
      cursor: undefined,
      listId: undefined,
    },
    { includeIdRange: false },
  );
  const candidates = await database.$queryRaw<Array<{ id: string }>>(
    Prisma.sql`
        SELECT m.B AS id
        FROM _ListToListing AS m
        JOIN List AS li ON li.id = m.A
        WHERE m.A = ${listId}
          AND li.userId = ${userId}
          ${cursor ? Prisma.sql`AND m.B > ${cursor}` : Prisma.empty}
        ORDER BY m.B
        LIMIT ${scanLimit + 1}
      `,
  );
  const scanned = candidates.slice(0, scanLimit);
  if (scanned.length === 0) return { rows: [], nextCursor: null };

  const matching = await database.listing.findMany({
    where: {
      AND: [where, { id: { in: scanned.map((item) => item.id) } }],
    },
    select: listingSummarySelect,
    orderBy: { id: "asc" },
    take: limit + 1,
  });
  const rows = matching.slice(0, limit);
  const nextCursor =
    matching.length > limit
      ? (rows.at(-1)?.id ?? null)
      : candidates.length > scanLimit
        ? (scanned.at(-1)?.id ?? null)
        : null;
  return { rows, nextCursor };
}

async function findGeneralFilteredRows(args: {
  database: typeof db;
  input: MemberListingSearchInput;
  userId: string;
}): Promise<{ rows: ListingSummary[]; nextCursor: string | null }> {
  const { database, input, userId } = args;
  const candidates = await database.listing.findMany({
    where: {
      userId,
      id: input.cursor ? { gt: input.cursor.slice(2) } : { gte: "" },
    },
    select: { id: true },
    orderBy: { id: "asc" },
    take: FILTERED_CANDIDATE_LIMIT + 1,
  });
  const scanned = candidates.slice(0, FILTERED_CANDIDATE_LIMIT);
  if (scanned.length === 0) return { rows: [], nextCursor: null };

  const matching = await database.listing.findMany({
    where: {
      AND: [
        // Candidate IDs are owner-scoped. Check the owner again after these
        // primary-key lookups, including if ownership changed between queries.
        buildMemberListingWhere(userId, input, {
          includeIdRange: false,
          includeOwner: false,
        }),
        { id: { in: scanned.map((item) => item.id) } },
      ],
    },
    select: ownedListingSummarySelect,
    orderBy: { id: "asc" },
  });
  const ownedMatching = matching.filter((item) => item.userId === userId);
  const rows = ownedMatching
    .slice(0, input.limit)
    .map(({ userId: _, ...item }) => item);
  const nextCursor =
    ownedMatching.length > input.limit
      ? `i:${rows.at(-1)?.id}`
      : candidates.length > FILTERED_CANDIDATE_LIMIT
        ? `i:${scanned.at(-1)?.id}`
        : null;
  return { rows, nextCursor };
}

async function findExactCultivarRows(args: {
  database: typeof db;
  input: MemberListingSearchInput & { cultivarReferenceId: string };
  userId: string;
}): Promise<{ rows: ListingSummary[]; nextCursor: string | null }> {
  const { database, input, userId } = args;
  const candidates = await database.$queryRaw<Array<{ id: string }>>(
    Prisma.sql`
      SELECT id
      FROM Listing INDEXED BY Listing_userId_id_idx
      WHERE userId = ${userId}
        AND cultivarReferenceId = ${input.cultivarReferenceId}
        AND id ${input.cursor ? Prisma.sql`> ${input.cursor.slice(2)}` : Prisma.sql`>= ${""}`}
      ORDER BY id
      LIMIT ${input.limit + 1}
    `,
  );
  const pageIds = candidates.slice(0, input.limit).map((item) => item.id);
  const rows = pageIds.length
    ? await database.listing.findMany({
        where: { userId, id: { in: pageIds } },
        select: listingSummarySelect,
        orderBy: { id: "asc" },
      })
    : [];
  return {
    rows,
    nextCursor:
      candidates.length > input.limit
        ? `i:${candidates[input.limit - 1]?.id}`
        : null,
  };
}

export async function searchOwnedMemberListings(args: {
  database: typeof db;
  input: MemberListingSearchInput;
  userId: string;
}) {
  if (
    !args.input.listId &&
    args.input.cursor &&
    !/^i:[^:]{1,128}$/.test(args.input.cursor)
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Invalid listing page cursor.",
    });
  }
  const listPage = args.input.listId
    ? await findListFilteredRows({
        ...args,
        input: { ...args.input, listId: args.input.listId },
      })
    : null;
  const hasGeneralFilters = Object.entries(args.input).some(
    ([key, value]) =>
      key !== "cursor" &&
      key !== "limit" &&
      key !== "listId" &&
      key !== "cultivarReferenceId" &&
      value !== undefined,
  );
  const exactCultivarPage =
    !listPage && !hasGeneralFilters && args.input.cultivarReferenceId
      ? await findExactCultivarRows({
          ...args,
          input: {
            ...args.input,
            cultivarReferenceId: args.input.cultivarReferenceId,
          },
        })
      : null;
  const generalFilteredPage =
    !listPage && hasGeneralFilters ? await findGeneralFilteredRows(args) : null;
  const rows =
    listPage?.rows ??
    exactCultivarPage?.rows ??
    generalFilteredPage?.rows ??
    (await args.database.listing.findMany({
      where: buildMemberListingWhere(args.userId, args.input),
      select: listingSummarySelect,
      orderBy: { id: "asc" },
      take: args.input.limit + 1,
    }));
  const pageRows = rows.slice(0, args.input.limit);
  const facts = pageRows.length
    ? await args.database.$queryRaw<
        Array<{ id: string; hasPhoto: bigint | number }>
      >`
        SELECT l.id,
          CASE WHEN EXISTS (SELECT 1 FROM Image AS i WHERE i.listingId = l.id)
            OR EXISTS (SELECT 1 FROM ImageAsset AS a WHERE a.listingId = l.id AND a.status = 'ready')
            THEN 1 ELSE 0 END AS hasPhoto
        FROM Listing AS l
        WHERE l.userId = ${args.userId}
          AND l.id IN (${Prisma.join(pageRows.map((listing) => listing.id))})
      `
    : [];
  const factsById = new Map(facts.map((fact) => [fact.id, fact]));
  const items = pageRows.map((listing) => ({
    ...listing,
    hasPhoto: Number(factsById.get(listing.id)?.hasPhoto ?? 0) > 0,
  }));

  return {
    items,
    nextCursor: listPage
      ? listPage.nextCursor
      : exactCultivarPage
        ? exactCultivarPage.nextCursor
        : generalFilteredPage
          ? generalFilteredPage.nextCursor
          : rows.length > args.input.limit
            ? `i:${items.at(-1)?.id}`
            : null,
  };
}
