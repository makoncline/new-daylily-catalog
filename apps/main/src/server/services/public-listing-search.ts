import type { Prisma } from "@prisma/client";
import { z } from "zod";
import type { db } from "@/server/db";
import {
  getActiveProUserIdsForUserIds,
  getProUserIds,
} from "@/server/db/getProUserIds";
import {
  buildPublicListingDetail,
  publicListingSelect,
} from "@/server/db/public-listing-read-model";
import { getUserIdFromSlugOrId } from "@/server/db/public-seller-read-model";
import {
  isPublicList,
  shouldShowToPublic,
} from "@/server/db/public-visibility/filters";
import {
  ahsListingWhere,
  cultivarNameWhere,
  cultivarTextWhere,
  hybridizerWhere,
  textContains,
  v2CultivarWhere,
} from "@/server/services/listing-search-filters";

const searchText = z.string().trim().min(1).max(200).optional();

export const publicListingSearchSchema = z.strictObject({
  cursor: z.string().trim().min(1).max(128).optional(),
  limit: z.number().int().min(1).max(100).default(25),
  color: searchText,
  cultivarName: searchText,
  description: searchText,
  hasPhoto: z.boolean().optional(),
  hasPrice: z.boolean().optional(),
  hybridizer: searchText,
  listId: z.string().trim().min(1).max(128).optional(),
  listTitle: searchText,
  parentage: searchText,
  priceMax: z.number().finite().optional(),
  priceMin: z.number().finite().optional(),
  q: searchText,
  sellerSlug: z.string().trim().min(1).max(128).optional(),
  title: searchText,
  year: searchText,
});

export type PublicListingSearchInput = z.infer<
  typeof publicListingSearchSchema
>;

async function buildPublicListingWhere(
  database: typeof db,
  input: PublicListingSearchInput,
) {
  const sellerUserId = input.sellerSlug
    ? await getUserIdFromSlugOrId(input.sellerSlug, database)
    : null;
  const proUserIds = sellerUserId
    ? await getActiveProUserIdsForUserIds([sellerUserId], database)
    : await getProUserIds(database);
  const and: Prisma.ListingWhereInput[] = [shouldShowToPublic(proUserIds)];

  if (input.cursor) and.push({ id: { gt: input.cursor } });
  if (sellerUserId) and.push({ userId: sellerUserId });

  if (input.q) {
    const contains = textContains(input.q);
    and.push({
      OR: [
        { title: contains },
        { description: contains },
        ...cultivarNameWhere(input.q),
        ...hybridizerWhere(input.q),
        ...cultivarTextWhere({
          ahsField: "color",
          v2Field: "color",
          value: input.q,
        }),
        ...cultivarTextWhere({
          ahsField: "parentage",
          v2Field: "parentage",
          value: input.q,
        }),
      ],
    });
  }

  if (input.title) and.push({ title: textContains(input.title) });
  if (input.description) {
    and.push({ description: textContains(input.description) });
  }
  if (input.listId) {
    and.push({ lists: { some: { ...isPublicList(), id: input.listId } } });
  }
  if (input.listTitle) {
    and.push({
      lists: {
        some: { ...isPublicList(), title: textContains(input.listTitle) },
      },
    });
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

  if (input.hasPrice === true) and.push({ price: { gt: 0 } });
  else if (input.hasPrice === false) {
    and.push({ OR: [{ price: null }, { price: { lte: 0 } }] });
  }
  if (typeof input.priceMin === "number") {
    and.push({ price: { gte: input.priceMin } });
  }
  if (typeof input.priceMax === "number") {
    and.push({ price: { lte: input.priceMax } });
  }
  if (input.cultivarName) {
    and.push({ OR: cultivarNameWhere(input.cultivarName) });
  }
  if (input.hybridizer) {
    and.push({ OR: hybridizerWhere(input.hybridizer) });
  }
  if (input.year) {
    const contains = textContains(input.year);
    and.push({
      OR: [
        ...ahsListingWhere({ year: contains }),
        v2CultivarWhere({ introduction_date: contains }),
      ],
    });
  }
  for (const [inputKey, ahsField, v2Field] of [
    ["color", "color", "color"],
    ["parentage", "parentage", "parentage"],
  ] as const) {
    const value = input[inputKey];
    if (value) {
      and.push({
        OR: cultivarTextWhere({ ahsField, v2Field, value }),
      });
    }
  }

  return { AND: and } satisfies Prisma.ListingWhereInput;
}

export async function searchPublicListings(args: {
  database: typeof db;
  input: PublicListingSearchInput;
}) {
  const rows = await args.database.listing.findMany({
    where: await buildPublicListingWhere(args.database, args.input),
    select: publicListingSelect,
    orderBy: { id: "asc" },
    take: args.input.limit + 1,
  });
  const pageRows = rows.slice(0, args.input.limit);
  return {
    items: pageRows.map((listing) => buildPublicListingDetail(listing, true)),
    nextCursor: rows.length > args.input.limit ? pageRows.at(-1)?.id : null,
  };
}
