import { STATUS } from "@/config/constants";
import { db } from "../db";

export async function getUserAndListingIdsAndSlugs() {
  const publicListingVisibilityFilter = {
    OR: [{ status: null }, { NOT: { status: STATUS.HIDDEN } }],
  };

  const users = await db.user.findMany({
    select: {
      id: true,
      profile: {
        select: {
          slug: true,
        },
      },
      listings: {
        where: publicListingVisibilityFilter,
        select: {
          id: true,
          slug: true,
        },
      },
    },
    where: {
      listings: {
        some: publicListingVisibilityFilter,
      },
    },
  });
  return users;
}
