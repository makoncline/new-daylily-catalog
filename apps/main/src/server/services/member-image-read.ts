import "server-only";

import { Prisma } from "@prisma/client";
import type { db } from "@/server/db";
import {
  assertOwnedListing,
  assertOwnedProfile,
} from "@/server/api/routers/dashboard-db/dashboard-db-router-helpers";

export const MEMBER_IMAGE_DETAIL_LIMIT = 20;
export const MEMBER_IMAGE_PAGE_LIMIT = 100;

export async function pageOwnedMemberImages(args: {
  database: typeof db;
  userId: string;
  type: "listing" | "profile";
  referenceId: string;
  cursor?: string;
  limit: number;
}) {
  if (args.type === "listing") {
    await assertOwnedListing({
      db: args.database,
      listingId: args.referenceId,
      userId: args.userId,
    });
  } else {
    await assertOwnedProfile({
      db: args.database,
      userProfileId: args.referenceId,
      userId: args.userId,
    });
  }

  const target =
    args.type === "listing"
      ? Prisma.sql`"Image" INDEXED BY "Image_listingId_idx" WHERE "listingId" = ${args.referenceId}`
      : Prisma.sql`"Image" INDEXED BY "Image_userProfileId_idx" WHERE "userProfileId" = ${args.referenceId}`;
  const rows = await args.database.$queryRaw<
    Array<{
      id: string;
      url: string;
      order: number;
      status: string | null;
      updatedAt: Date;
    }>
  >(Prisma.sql`
    SELECT id, url, "order", status, updatedAt
    FROM ${target}
    ${args.cursor ? Prisma.sql`AND id > ${args.cursor}` : Prisma.empty}
    ORDER BY id
    LIMIT ${args.limit + 1}
  `);
  const items = rows.slice(0, args.limit);
  return {
    items,
    nextCursor: rows.length > args.limit ? (items.at(-1)?.id ?? null) : null,
  };
}
