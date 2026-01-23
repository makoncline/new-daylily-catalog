import type { E2EPrismaClient } from "./e2e-db";

export const TEST_USER = {
  email: "makon+clerk_test@hey.com",
  clerkId: "user_32T1tvQIoeDiev3SJwar7ogR8oo",
  stripeCustomerId: "cus_test_daylily_catalog",
} as const;

export async function createAuthedUser(db: E2EPrismaClient) {
  const user = await db.user.upsert({
    where: { clerkUserId: TEST_USER.clerkId },
    update: {
      stripeCustomerId: TEST_USER.stripeCustomerId,
    },
    create: {
      clerkUserId: TEST_USER.clerkId,
      stripeCustomerId: TEST_USER.stripeCustomerId,
    },
  });
  if (TEST_USER.stripeCustomerId) {
    await db.keyValue.upsert({
      where: { key: `stripe:customer:${TEST_USER.stripeCustomerId}` },
      update: { value: JSON.stringify({ status: "none" }) },
      create: {
        key: `stripe:customer:${TEST_USER.stripeCustomerId}`,
        value: JSON.stringify({ status: "none" }),
      },
    });
  }
  return user;
}
