import { z } from "zod";
import type { db } from "@/server/db";
import { getProUserIds } from "@/server/db/getProUserIds";
import { getPublicSellerSummariesByUserIds } from "@/server/db/public-seller-read-model";
import { isPublished } from "@/server/db/public-visibility/filters";

export const publicProfilePageSchema = z.strictObject({
  cursor: z.string().trim().min(1).max(128).optional(),
  limit: z.number().int().min(1).max(100).default(25),
});

export type PublicProfilePageInput = z.infer<typeof publicProfilePageSchema>;

export async function pagePublicProfiles(args: {
  database: typeof db;
  input: PublicProfilePageInput;
}) {
  const activeUserIds = await getProUserIds(args.database);
  if (activeUserIds.length === 0) {
    return { items: [], nextCursor: null };
  }

  const rows = await args.database.user.findMany({
    where: {
      id: {
        in: activeUserIds,
        ...(args.input.cursor ? { gt: args.input.cursor } : {}),
      },
      listings: { some: isPublished() },
    },
    select: { id: true },
    orderBy: { id: "asc" },
    take: args.input.limit + 1,
  });
  const pageIds = rows.slice(0, args.input.limit).map((row) => row.id);
  const summaries = await getPublicSellerSummariesByUserIds(
    pageIds,
    { activeUserIds },
    args.database,
  );

  return {
    items: pageIds.flatMap((id) => {
      const summary = summaries.get(id);
      return summary ? [summary] : [];
    }),
    nextCursor: rows.length > args.input.limit ? pageIds.at(-1) : null,
  };
}
