import { CACHE_CONFIG } from "@/config/cache-config";
import { createServerCache } from "@/lib/cache/server-cache";
import { db } from "@/server/db";
import { getProUserIdSet } from "@/server/db/getProUserIdSet";

async function getProUserIds(): Promise<string[]> {
  const users = await db.user.findMany({
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

  const proUserIds = await getProUserIdSet(users);

  return Array.from(proUserIds).sort();
}

export const getCachedProUserIds = createServerCache(getProUserIds, {
  key: "public:pro-user-ids",
  revalidateSeconds: CACHE_CONFIG.DURATIONS.MINUTE * 5,
  tags: [CACHE_CONFIG.TAGS.PUBLIC_PRO_USER_IDS],
});
