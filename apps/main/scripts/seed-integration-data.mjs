import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";

export const INTEGRATION_SELLER = {
  userId: "integration-user",
  clerkUserId: "user_integration_seller",
  email: "integration-seller@example.test",
  stripeCustomerId: "cus_integration_seller",
};

/** @type {readonly (readonly [string, string, string])[]} */
const onboardingCultivars = [
  ["cr-ahs-176320", "ahs-176320", "Onboarding Rose"],
  ["cr-ahs-170157", "ahs-170157", "Onboarding Gold"],
  ["cr-ahs-8527", "ahs-8527", "Onboarding Sunset"],
];

/** @param {string} databaseUrl */
export async function seedIntegrationData(databaseUrl) {
  const db = new PrismaClient({
    adapter: new PrismaLibSql(
      { url: databaseUrl },
      { timestampFormat: "unixepoch-ms" },
    ),
  });

  try {
    await db.$transaction([
      db.user.create({
        data: {
          id: INTEGRATION_SELLER.userId,
          clerkUserId: INTEGRATION_SELLER.clerkUserId,
          stripeCustomerId: INTEGRATION_SELLER.stripeCustomerId,
        },
      }),
      db.userProfile.create({
        data: {
          id: "integration-profile",
          userId: INTEGRATION_SELLER.userId,
          title: "Integration Seller",
          slug: "integration-seller",
        },
      }),
      db.v2AhsCultivar.create({
        data: {
          id: "integration-v2-cultivar",
          link_normalized_name: "integration bloom",
          post_title: "Integration Bloom",
          primary_hybridizer_name: "Test Garden",
          introduction_date: "2026",
          color: "Rose and gold",
        },
      }),
      db.cultivarReference.create({
        data: {
          id: "integration-cultivar-reference",
          v2AhsCultivarId: "integration-v2-cultivar",
          normalizedName: "integration bloom",
        },
      }),
      ...onboardingCultivars.flatMap(
        ([cultivarReferenceId, ahsId, name]) => [
          db.ahsListing.create({
            data: {
              id: ahsId,
              name,
              hybridizer: "Integration Garden",
              year: "2026",
              ahsImageUrl: "/assets/catalog-blooms.webp",
            },
          }),
          db.cultivarReference.create({
            data: {
              id: cultivarReferenceId,
              ahsId,
              normalizedName: name.toLowerCase(),
            },
          }),
        ],
      ),
      db.listing.create({
        data: {
          id: "integration-existing-listing",
          userId: INTEGRATION_SELLER.userId,
          title: "Existing Bloom",
          slug: "existing-bloom",
          cultivarReferenceId: "integration-cultivar-reference",
          status: "PUBLISHED",
        },
      }),
      db.listing.create({
        data: {
          id: "integration-media-listing",
          userId: INTEGRATION_SELLER.userId,
          title: "Integration Media Listing",
          slug: "integration-media-listing",
          status: "PUBLISHED",
        },
      }),
      ...["first", "second", "third"].map((token, order) =>
        db.image.create({
          data: {
            id: `integration-media-image-${order + 1}`,
            listingId: "integration-media-listing",
            order,
            url: `/assets/bouquet.png?token=${token}`,
          },
        }),
      ),
      db.list.create({
        data: {
          id: "integration-favorites-list",
          userId: INTEGRATION_SELLER.userId,
          title: "Integration Favorites",
          description: "List membership integration fixture",
        },
      }),
      db.keyValue.create({
        data: {
          key: `clerk:user:${INTEGRATION_SELLER.clerkUserId}`,
          value: JSON.stringify({
            id: INTEGRATION_SELLER.clerkUserId,
            email: INTEGRATION_SELLER.email,
            imageUrl: "",
            primaryEmailAddress: {
              emailAddress: INTEGRATION_SELLER.email,
            },
          }),
        },
      }),
      db.keyValue.create({
        data: {
          key: `stripe:customer:${INTEGRATION_SELLER.stripeCustomerId}`,
          value: JSON.stringify({
            subscriptionId: "sub_integration_seller",
            status: "active",
            priceId: "price_integration",
            cancelAtPeriodEnd: false,
          }),
        },
      }),
    ]);
  } finally {
    await db.$disconnect();
  }
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) ===
    path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
  const databaseUrl = process.argv[2] ?? process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required.");
  await seedIntegrationData(databaseUrl);
}
