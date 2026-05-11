import { replicaDb } from "@/server/db";
import { isPublished } from "@/server/db/public-visibility/filters";

export async function getUserAndListingIdsAndSlugs() {
  const users = await replicaDb.user.findMany({
    select: {
      id: true,
      profile: {
        select: {
          slug: true,
        },
      },
      listings: {
        where: isPublished(),
        select: {
          id: true,
          slug: true,
        },
      },
    },
    where: {
      listings: {
        some: isPublished(),
      },
    },
  });
  return users;
}
