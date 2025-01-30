import { db } from "../db";

export async function getUserAndListingIdsAndSlugs() {
  const users = await db.user.findMany({
    select: {
      id: true,
      profile: {
        select: {
          slug: true,
        },
      },
      listings: {
        select: {
          id: true,
          slug: true,
        },
      },
    },
  });
  return users;
}
