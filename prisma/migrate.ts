import { PrismaClient as PostgresClient } from "./generated/postgres-client";
import { PrismaClient as SQLiteClient } from "./generated/sqlite-client";
import { clerkClient, type User } from "@clerk/clerk-sdk-node";
import { z } from "zod";
import { setTimeout } from "timers/promises";
import Stripe from "stripe";
import { env } from "../src/env.js";
import { syncStripeSubscriptionToKVBase } from "../src/server/stripe/sync-subscription";
import { kvStore } from "../src/server/db/kvStore";

const stripe = new Stripe(process.env.PROD_STRIPE_SECRET_KEY!);

const postgres = new PostgresClient({
  datasources: {
    db: {
      url: process.env.POSTGRES_DATABASE_URL!,
    },
  },
});

const sqlite = new SQLiteClient({
  datasources: {
    db: {
      url: env.DATABASE_URL,
    },
  },
});

const clerkUserSchema = z.object({
  id: z.string(),
  primaryEmailAddressId: z.string(),
  emailAddresses: z.array(
    z.object({
      id: z.string(),
      emailAddress: z.string(),
    }),
  ),
  username: z.string().nullable(),
});

async function fetchAllClerkUsers() {
  const response = await clerkClient.users.getUserList({
    limit: 500,
  });
  return clerkUserSchema.array().parse(response.data);
}

async function getOrCreateClerkUser(
  email: string,
  username: string,
  allClerkUsers: z.infer<typeof clerkUserSchema>[],
) {
  try {
    // Find the user in the list of Clerk users
    let clerkUser = (allClerkUsers as User[]).find(
      (user) => user.username === username.toLowerCase(),
    );
    // If user doesn't exist in Clerk, create them
    if (!clerkUser) {
      console.log(`Creating Clerk user for ${email} ${username}`);
      await setTimeout(2000);
      clerkUser = await clerkClient.users.createUser({
        emailAddress: [email],
        username: username,
      });
      console.log(`Created Clerk user for ${email}`);
    } else {
      console.log(`Found existing Clerk user for ${email}`);
    }

    return clerkUser.id;
  } catch (error) {
    console.error(`Error processing Clerk user ${email}:`, error);
    throw error;
  }
}

const filterOutUserIds = [24, 153, 121, 62];

async function getMigratableUserIds() {
  const sqliteUsers = await sqlite.user.findMany({
    select: { id: true },
  });

  // Filter for IDs that are numeric (from old postgres db)
  const numericUserIds = sqliteUsers
    .map((u) => parseInt(u.id))
    .filter((id) => !isNaN(id));

  console.log(
    `Found ${numericUserIds.length} users to migrate (filtered out ${sqliteUsers.length - numericUserIds.length} UUID users)`,
  );

  return numericUserIds;
}

async function upsertUsers() {
  console.log("Starting user migration...");
  const users = await postgres.users.findMany({
    ...(env.NODE_ENV === "development" ? { take: 10 } : {}),
    where: {
      id: {
        notIn: filterOutUserIds,
      },
      user_emails: {
        some: {}, // This ensures we only get users with at least one email
      },
    },
    include: {
      user_emails: true,
      stripe_customers: true,
      lilies: true,
    },
    orderBy: [
      {
        stripe_customers: {
          id: "asc",
        },
      },
      {
        lilies: {
          _count: "desc",
        },
      },
    ],
  });
  console.log(`Found ${users.length} users with emails to migrate.`);

  // Fetch all Clerk users once
  const allClerkUsers = await fetchAllClerkUsers();
  console.log(`Fetched ${allClerkUsers.length} users from Clerk`);

  const sortedUsers = users.sort((a, b) => {
    const aVerified = a.user_emails.some((email) => email.is_verified);
    const bVerified = b.user_emails.some((email) => email.is_verified);
    if (aVerified && !bVerified) return -1;
    if (!aVerified && bVerified) return 1;
    return a.created_at.getTime() - b.created_at.getTime();
  });

  let successCount = 0;
  let errorCount = 0;

  for (const user of sortedUsers) {
    const userId = user.id.toString();

    const verifiedPrimaryEmail = user.user_emails.find(
      (email) => email.is_primary && email.is_verified,
    );
    const verifiedEmail = user.user_emails.find((email) => email.is_verified);
    const primaryEmail = user.user_emails.find((email) => email.is_primary);
    const firstEmail = user.user_emails[0];

    const selectedEmail =
      verifiedPrimaryEmail ?? verifiedEmail ?? primaryEmail ?? firstEmail;

    if (!selectedEmail) {
      errorCount++;
      continue;
    }

    try {
      // Get or create Clerk user
      const clerkUserId: string = await getOrCreateClerkUser(
        selectedEmail.email,
        user.username,
        allClerkUsers,
      );

      const userData = {
        clerkUserId: clerkUserId,
        username: user.username,
        email: selectedEmail.email,
        role: user.is_admin ? "ADMIN" : "USER",
        stripeCustomerId: user.stripe_customers?.id ?? null,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      };

      // Upsert user in SQLite
      await sqlite.user.upsert({
        where: { email: selectedEmail.email },
        update: userData,
        create: { id: userId, ...userData },
      });

      successCount++;
    } catch (error) {
      console.error(
        `Error processing userId:${userId} email:${selectedEmail.email} with ${user.lilies.length} lilies`,
        error,
      );
      errorCount++;
    }
  }

  console.log(`User migration completed.`);
  console.log(`Successfully migrated: ${successCount} users`);
  console.log(`Failed to migrate: ${errorCount} users`);
}

async function upsertAhsListings() {
  console.log("Starting AHS listings migration...");
  const ahsData = await postgres.ahs_data.findMany();
  console.log(`Found ${ahsData.length} AHS listings to migrate.`);

  let successCount = 0;
  let errorCount = 0;

  for (const listing of ahsData) {
    const listingId = listing.ahs_id.toString();

    const listingData = {
      name: listing.name,
      hybridizer: listing.hybridizer,
      year: listing.year,
      scapeHeight: listing.scape_height,
      bloomSize: listing.bloom_size,
      bloomSeason: listing.bloom_season,
      ploidy: listing.ploidy,
      foliageType: listing.foliage_type,
      bloomHabit: listing.bloom_habit,
      seedlingNum: listing.seedling_num,
      color: listing.color,
      form: listing.form,
      parentage: listing.parentage,
      ahsImageUrl: listing.image,
      fragrance: listing.fragrance,
      budcount: listing.budcount,
      branches: listing.branches,
      sculpting: listing.sculpting,
      foliage: listing.foliage,
      flower: listing.flower,
      createdAt: listing.created_at,
      updatedAt: listing.updated_at,
    };

    try {
      await sqlite.ahsListing.upsert({
        where: { id: listingId },
        update: listingData,
        create: { id: listingId, ...listingData },
      });
      successCount++;
    } catch (error) {
      console.error(`Error migrating AHS listing ${listingId}:`, error);
      errorCount++;
    }
  }

  console.log(`AHS listings migration completed.`);
  console.log(`Successfully migrated: ${successCount} listings`);
  console.log(`Failed to migrate: ${errorCount} listings`);
}

async function upsertLists() {
  console.log("Starting lists migration...");

  const validUserIds = await getMigratableUserIds();

  const lists = await postgres.lists.findMany({
    where: {
      user_id: {
        in: validUserIds,
      },
    },
  });
  console.log(`Found ${lists.length} lists to migrate.`);

  let successCount = 0;
  let errorCount = 0;

  for (const list of lists) {
    const listId = list.id.toString();

    const listData = {
      userId: list.user_id.toString(),
      name: list.name,
      intro: list.intro,
      bio: list.bio,
      createdAt: list.created_at,
      updatedAt: list.updated_at,
    };

    try {
      await sqlite.list.upsert({
        where: { id: listId },
        update: listData,
        create: { id: listId, ...listData },
      });
      successCount++;
    } catch (error) {
      console.error(`Error migrating list ${listId}:`, error);
      errorCount++;
    }
  }

  console.log(`Lists migration completed.`);
  console.log(`Successfully migrated: ${successCount} lists`);
  console.log(`Failed to migrate: ${errorCount} lists`);
}

async function upsertListings() {
  console.log("Starting listings migration...");

  const validUserIds = await getMigratableUserIds();

  const lilies = await postgres.lilies.findMany({
    where: {
      user_id: {
        in: validUserIds,
      },
    },
  });
  console.log(`Found ${lilies.length} listings to migrate.`);

  let successCount = 0;
  let errorCount = 0;
  let imageSuccessCount = 0;
  let imageErrorCount = 0;

  for (const lily of lilies) {
    const listingId = lily.id.toString();

    const listingData = {
      userId: lily.user_id.toString(),
      name: lily.name,
      price: lily.price ? parseFloat(lily.price.toString()) : null,
      publicNote: lily.public_note,
      privateNote: lily.private_note,
      listId: lily.list_id ? lily.list_id.toString() : null,
      ahsId: lily.ahs_ref ? lily.ahs_ref.toString() : null,
      createdAt: lily.created_at,
      updatedAt: lily.updated_at,
    };

    try {
      const createdListing = await sqlite.listing.upsert({
        where: { id: listingId },
        update: listingData,
        create: { id: listingId, ...listingData },
      });

      // Create or update images for this listing
      if (lily.img_url && Array.isArray(lily.img_url)) {
        for (let i = 0; i < lily.img_url.length; i++) {
          const imageUrl = lily.img_url[i];
          if (typeof imageUrl === "string" && imageUrl.trim() !== "") {
            try {
              // Check if an image already exists for this listing and order
              const existingImage = await sqlite.image.findFirst({
                where: {
                  listingId: createdListing.id,
                  order: i,
                },
                select: { id: true },
              });

              const imageData = {
                url: imageUrl.trim(),
                listingId: createdListing.id,
                order: i,
              };

              if (existingImage) {
                await sqlite.image.update({
                  where: { id: existingImage.id },
                  data: imageData,
                });
              } else {
                await sqlite.image.create({
                  data: imageData,
                });
              }
              imageSuccessCount++;
            } catch (imageError) {
              console.error(
                `Error upserting image for listing ${listingId}:`,
                imageError,
              );
              imageErrorCount++;
            }
          } else {
            console.warn(
              `Invalid image URL for listing ${listingId} at index ${i}, skipping.`,
            );
            imageErrorCount++;
          }
        }
      }

      successCount++;
    } catch (error) {
      console.error(`Error migrating listing ${listingId}:`, error);
      errorCount++;
    }
  }

  console.log(`Listings migration completed.`);
  console.log(`Successfully migrated: ${successCount} listings`);
  console.log(`Failed to migrate: ${errorCount} listings`);
  console.log(`Successfully created: ${imageSuccessCount} images`);
  console.log(`Failed to create: ${imageErrorCount} images`);
}

async function upsertUserProfiles() {
  console.log("Starting user profiles migration...");

  const validUserIds = await getMigratableUserIds();

  const users = await postgres.users.findMany({
    where: {
      id: {
        in: validUserIds,
      },
    },
  });
  console.log(`Found ${users.length} users to create profiles for.`);

  let successCount = 0;
  let errorCount = 0;
  let imageSuccessCount = 0;
  let imageErrorCount = 0;

  for (const user of users) {
    const userId = user.id.toString();

    const profileData = {
      userId: userId,
      logoUrl: user.avatar_url,
      intro: user.intro,
      bio: user.bio,
      userLocation: user.user_location,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };

    try {
      const createdProfile = await sqlite.userProfile.upsert({
        where: { userId: userId },
        update: profileData,
        create: profileData,
      });

      // Handle image migration
      if (user.img_urls && Array.isArray(user.img_urls)) {
        for (let i = 0; i < user.img_urls.length; i++) {
          const imageUrl = user.img_urls[i];
          if (typeof imageUrl === "string" && imageUrl.trim() !== "") {
            try {
              // Check if an image already exists for this user profile and order
              const existingImage = await sqlite.image.findFirst({
                where: {
                  userProfileId: createdProfile.id,
                  order: i,
                },
                select: { id: true },
              });

              const imageData = {
                url: imageUrl.trim(),
                userProfileId: createdProfile.id,
                order: i,
              };

              if (existingImage) {
                await sqlite.image.update({
                  where: { id: existingImage.id },
                  data: imageData,
                });
              } else {
                await sqlite.image.create({
                  data: imageData,
                });
              }
              imageSuccessCount++;
            } catch (imageError) {
              console.error(
                `Error upserting image for user profile ${userId}:`,
                imageError,
              );
              imageErrorCount++;
            }
          } else {
            console.warn(
              `Invalid image URL for user profile ${userId} at index ${i}, skipping.`,
            );
            imageErrorCount++;
          }
        }
      }

      successCount++;
    } catch (error) {
      console.error(`Error migrating user profile for user ${userId}:`, error);
      errorCount++;
    }
  }

  console.log(`User profiles migration completed.`);
  console.log(`Successfully migrated: ${successCount} user profiles`);
  console.log(`Failed to migrate: ${errorCount} user profiles`);
  console.log(`Successfully created/updated: ${imageSuccessCount} images`);
  console.log(`Failed to create/update: ${imageErrorCount} images`);
}

async function upsertStripeSubscriptions() {
  console.log("Upserting stripe subscriptions...");

  const validUserIds = await getMigratableUserIds();

  const usersWithStripeCustomers = await sqlite.user.findMany({
    where: {
      id: { in: validUserIds.map((id) => id.toString()) },
      stripeCustomerId: { not: null },
    },
  });

  console.log(
    `Found ${usersWithStripeCustomers.length} users with stripe customers`,
  );

  for (const user of usersWithStripeCustomers) {
    if (!user.stripeCustomerId) continue;

    try {
      await syncStripeSubscriptionToKVBase(
        user.stripeCustomerId,
        stripe,
        kvStore,
      );
      console.log(
        `Synced subscription data for customer ${user.stripeCustomerId}`,
      );
    } catch (error) {
      console.error(
        `Error syncing subscription data for customer ${user.stripeCustomerId}:`,
        error,
      );
    }
  }

  console.log("Done upserting stripe subscriptions");
}

async function main() {
  console.log(`Running migration in ${env.NODE_ENV} mode`);
  console.log("Starting migration process...");
  const startTime = Date.now();

  await upsertUsers();
  // await upsertAhsListings(); // doesnt get updated by users
  await upsertLists();
  await upsertListings();
  await upsertUserProfiles();
  await upsertStripeSubscriptions();

  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;
  console.log(`Migration completed in ${duration.toFixed(2)} seconds.`);
}

main()
  .then(() => console.log("Migration script finished successfully."))
  .catch((error) => console.error("Migration script failed:", error))
  .finally(() => {
    postgres.$disconnect().catch(() => {
      console.error("Failed to disconnect from Postgres");
    });
    sqlite.$disconnect().catch(() => {
      console.error("Failed to disconnect from SQLite");
    });
  });
