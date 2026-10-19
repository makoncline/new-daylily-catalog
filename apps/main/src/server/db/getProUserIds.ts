import { publicDb } from "@/server/db";
import { getProUserIdSet } from "@/server/db/getProUserIdSet";

export async function getProUserIds(
  database: typeof publicDb = publicDb,
): Promise<string[]> {
  const users = await database.user.findMany({
    where: {
      stripeCustomerId: {
        not: null,
      },
    },
    select: {
      id: true,
      stripeCustomerId: true,
    },
  });

  const proUserIds = await getProUserIdSet(users, database);

  return Array.from(proUserIds).sort();
}

export async function getActiveProUserIdsForUserIds(
  userIds: readonly string[],
  database: typeof publicDb = publicDb,
): Promise<string[]> {
  const uniqueUserIds = Array.from(new Set(userIds));
  if (uniqueUserIds.length === 0) {
    return [];
  }

  const users = await database.user.findMany({
    where: {
      id: {
        in: uniqueUserIds,
      },
      stripeCustomerId: {
        not: null,
      },
    },
    select: {
      id: true,
      stripeCustomerId: true,
    },
  });

  const proUserIds = await getProUserIdSet(users, database);

  return Array.from(proUserIds).sort();
}
