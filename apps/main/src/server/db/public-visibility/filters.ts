import { STATUS } from "@/config/constants";
import type { Prisma } from "@prisma/client";

export function isPublished(): Prisma.ListingWhereInput {
  return {
    OR: [{ status: null }, { NOT: { status: STATUS.HIDDEN } }],
  };
}

export function hasActiveSubscription(
  proUserIds: readonly string[],
): Prisma.ListingWhereInput {
  return {
    userId: {
      in: [...proUserIds],
    },
  };
}

export function shouldShowToPublic(
  proUserIds: readonly string[],
): Prisma.ListingWhereInput {
  return {
    ...isPublished(),
    ...hasActiveSubscription(proUserIds),
  };
}
