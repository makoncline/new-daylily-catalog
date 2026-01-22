import { type PrismaClient } from "@prisma/client";

export const TEST_USER = {
  email: "test_playwright+clerk_test@gmail.com",
  clerkId: "user_2tNBvfz00pi17Kavs9M6wurk1VP",
  stripeCustomerId: "cus_test_daylily_catalog",
} as const;

export async function createAuthedUser(db: PrismaClient) {
  const user = await db.user.create({
    data: {
      clerkUserId: TEST_USER.clerkId,
      stripeCustomerId: TEST_USER.stripeCustomerId,
    },
  });
  return user;
}
