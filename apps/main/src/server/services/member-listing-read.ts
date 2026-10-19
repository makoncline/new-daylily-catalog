import "server-only";

import { Prisma } from "@prisma/client";
import type { db } from "@/server/db";
import { cultivarReferenceSelect } from "@/server/services/public-cultivar-reference";
import { MEMBER_LISTING_LIST_PAGE_SIZE } from "@/server/services/member-list-read";
import { MEMBER_IMAGE_DETAIL_LIMIT } from "@/server/services/member-image-read";

const memberListingSelect = {
  id: true,
  title: true,
  slug: true,
  price: true,
  description: true,
  privateNote: true,
  status: true,
  cultivarReferenceId: true,
  createdAt: true,
  updatedAt: true,
  images: {
    select: {
      id: true,
      url: true,
      order: true,
      status: true,
    },
    orderBy: [{ order: "asc" }, { id: "asc" }],
    take: MEMBER_IMAGE_DETAIL_LIMIT + 1,
  },
  lists: {
    select: {
      id: true,
      title: true,
    },
    orderBy: { id: "asc" },
    take: MEMBER_LISTING_LIST_PAGE_SIZE + 1,
  },
} as const satisfies Prisma.ListingSelect;

export type MemberListingDetail = Prisma.ListingGetPayload<{
  select: typeof memberListingSelect;
}> & {
  listsNextCursor: string | null;
  imagesHasMore: boolean;
  cultivarReference: Prisma.CultivarReferenceGetPayload<{
    select: typeof cultivarReferenceSelect;
  }> | null;
};

const {
  images: imageRelation,
  lists: listRelation,
  ...listingSelect
} = memberListingSelect;

export async function getOwnedMemberListingDetail(args: {
  id: string;
  memberDb: typeof db;
  publicDb: typeof db | null;
  userId: string;
}): Promise<MemberListingDetail | null> {
  const listing = await args.memberDb.listing.findFirst({
    where: { id: args.id, userId: args.userId },
    select: listingSelect,
  });
  if (!listing) return null;

  const [images, allLists, cultivarReference] = await Promise.all([
    args.memberDb.image.findMany({
      where: { listingId: listing.id },
      select: imageRelation.select,
      orderBy: imageRelation.orderBy,
      take: imageRelation.take,
    }),
    args.memberDb.$queryRaw<
      Array<Prisma.ListGetPayload<{ select: typeof listRelation.select }>>
    >(Prisma.sql`
      SELECT list.id, list.title
      FROM "_ListToListing" AS membership INDEXED BY "_ListToListing_B_index"
      JOIN "List" AS list ON list.id = membership."A"
      WHERE membership."B" = ${listing.id}
        AND list."userId" = ${args.userId}
      ORDER BY membership."A"
      LIMIT ${listRelation.take}
    `),
    listing.cultivarReferenceId && args.publicDb
      ? args.publicDb.cultivarReference.findFirst({
          where: { id: listing.cultivarReferenceId },
          select: cultivarReferenceSelect,
        })
      : Promise.resolve(null),
  ]);

  const lists = allLists.slice(0, MEMBER_LISTING_LIST_PAGE_SIZE);
  return {
    ...listing,
    images: images.slice(0, MEMBER_IMAGE_DETAIL_LIMIT),
    imagesHasMore: images.length > MEMBER_IMAGE_DETAIL_LIMIT,
    lists,
    listsNextCursor:
      allLists.length > MEMBER_LISTING_LIST_PAGE_SIZE
        ? (lists.at(-1)?.id ?? null)
        : null,
    cultivarReference,
  };
}
