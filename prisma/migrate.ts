import { PrismaClient as PostgresClient } from "./generated/postgres-client";
import { PrismaClient as SQLiteClient } from "./generated/sqlite-client";
import { clerkClient, type User } from "@clerk/clerk-sdk-node";
import { z } from "zod";
import { setTimeout } from "timers/promises";
import Stripe from "stripe";
import { env } from "../src/env.js";
import { syncStripeSubscriptionToKVBase } from "../src/server/stripe/sync-subscription";
import { syncClerkUserToKVBase } from "../src/server/clerk/sync-user";
import { kvStore } from "../src/server/db/kvStore";
import {
  convertMarkdownToEditorJS,
  type EditorJSData,
} from "../src/lib/mdToBlocks";
import { transformToSlug } from "../src/lib/utils/slugify";
import { createClient } from "@libsql/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { generateUniqueSlug } from "../src/lib/utils/slugify-server";

const stripeKey =
  env.NODE_ENV === "production"
    ? env.STRIPE_SECRET_KEY
    : process.env.PROD_STRIPE_SECRET_KEY!;

const stripe = new Stripe(stripeKey);

// Use Turso if explicitly set or if in production (unless explicitly disabled)
const USE_TURSO_DB =
  process.env.USE_TURSO_DB === "true" ||
  (env.NODE_ENV === "production" && process.env.USE_TURSO_DB !== "false");

const databaseUrl = USE_TURSO_DB
  ? env.TURSO_DATABASE_URL
  : env.LOCAL_DATABASE_URL;

const createDatabaseClient = () => {
  if (USE_TURSO_DB) {
    console.log("Using Turso database for migration...");
    const libsql = createClient({
      url: env.TURSO_DATABASE_URL,
      authToken: env.TURSO_DATABASE_AUTH_TOKEN,
    });

    const adapter = new PrismaLibSQL(libsql);
    return new SQLiteClient({
      adapter,
    });
  }

  console.log("Using local SQLite database for migration...");
  return new SQLiteClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });
};

const postgres = new PostgresClient({
  datasources: {
    db: {
      url: process.env.POSTGRES_DATABASE_URL!,
    },
  },
});

const sqlite = createDatabaseClient();

const clerkUserSchema = z.object({
  id: z.string(),
  primaryEmailAddressId: z.string(),
  emailAddresses: z.array(
    z.object({
      id: z.string(),
      emailAddress: z.string(),
    }),
  ),
});

async function fetchAllClerkUsers() {
  const response = await clerkClient.users.getUserList({
    limit: 500,
  });
  return clerkUserSchema.array().parse(response.data);
}

async function getOrCreateClerkUser(
  email: string,
  allClerkUsers: z.infer<typeof clerkUserSchema>[],
) {
  try {
    // Convert email to lowercase for comparison
    const normalizedEmail = email.toLowerCase();

    // Find the user in the list of Clerk users by email (case-insensitive)
    let clerkUser = (allClerkUsers as User[]).find((user) =>
      user.emailAddresses.some(
        (e) => e.emailAddress.toLowerCase() === normalizedEmail,
      ),
    );

    // If user doesn't exist in Clerk, create them with lowercase email
    if (!clerkUser) {
      console.log(`Creating Clerk user for ${normalizedEmail}`);
      await setTimeout(2000);
      clerkUser = await clerkClient.users.createUser({
        emailAddress: [normalizedEmail],
      });
      console.log(`Created Clerk user for ${normalizedEmail}`);
    } else {
      console.log(`Found existing Clerk user for ${normalizedEmail}`);
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
      const clerkUserId = await getOrCreateClerkUser(
        selectedEmail.email,
        allClerkUsers,
      );

      // Create base user data
      const userData = {
        clerkUserId,
        role: user.is_admin ? "ADMIN" : "USER",
        stripeCustomerId: user.stripe_customers?.id ?? null,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      };

      // Upsert user in SQLite
      await sqlite.user.upsert({
        where: { clerkUserId },
        update: userData,
        create: { id: userId, ...userData },
      });

      // Sync Clerk data to KV store
      await setTimeout(1000);
      await syncClerkUserToKVBase(clerkUserId, clerkClient, kvStore);

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

async function shouldMigrateAhsListings() {
  const existingCount = await sqlite.ahsListing.count();
  return existingCount === 0;
}

async function upsertAhsListings() {
  console.log("Checking if AHS listings need migration...");

  if (!(await shouldMigrateAhsListings())) {
    console.log("AHS listings already exist, skipping migration.");
    return;
  }

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
      await sqlite.ahsListing.create({
        data: { id: listingId, ...listingData },
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
  let skippedCount = 0;

  for (const list of lists) {
    const listId = list.id.toString();

    try {
      // Check if list exists and if it has been updated
      const existingList = await sqlite.list.findUnique({
        where: { id: listId },
        select: { updatedAt: true },
      });

      // Skip if list exists and hasn't been updated
      if (existingList && existingList.updatedAt >= list.updated_at) {
        skippedCount++;
        continue;
      }

      const listData = {
        userId: list.user_id.toString(),
        title: list.name,
        description: list.intro || null,
        createdAt: list.created_at,
        updatedAt: list.updated_at,
      };

      if (existingList) {
        await sqlite.list.update({
          where: { id: listId },
          data: listData,
        });
      } else {
        await sqlite.list.create({
          data: { id: listId, ...listData },
        });
      }
      successCount++;
    } catch (error) {
      console.error(`Error migrating list ${listId}:`, error);
      errorCount++;
    }
  }

  console.log(`Lists migration completed.`);
  console.log(`Successfully migrated: ${successCount} lists`);
  console.log(`Skipped unchanged: ${skippedCount} lists`);
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
  let skippedCount = 0;
  let imageSuccessCount = 0;
  let imageErrorCount = 0;
  let imageSkippedCount = 0;

  for (const lily of lilies) {
    const listingId = lily.id.toString();
    const userId = lily.user_id.toString();

    try {
      // Check if listing exists and if it has been updated
      const existingListing = await sqlite.listing.findUnique({
        where: { id: listingId },
        select: { updatedAt: true, slug: true },
      });

      // Skip if listing exists and hasn't been updated
      if (existingListing && existingListing.updatedAt >= lily.updated_at) {
        skippedCount++;
        continue;
      }

      // Generate or reuse slug
      const baseSlug = transformToSlug(lily.name, listingId);
      const initialSlug = baseSlug || listingId;
      const slug = existingListing
        ? existingListing.slug
        : await generateUniqueSlug(initialSlug, userId, undefined, sqlite);

      const listingData = {
        userId: userId,
        title: lily.name,
        slug,
        price: lily.price ? parseFloat(lily.price.toString()) : null,
        description: lily.public_note,
        privateNote: lily.private_note,
        ahsId: lily.ahs_ref ? lily.ahs_ref.toString() : null,
        createdAt: lily.created_at,
        updatedAt: lily.updated_at,
        lists: lily.list_id
          ? {
              connect: [{ id: lily.list_id.toString() }],
            }
          : undefined,
      };

      let createdListing;
      if (existingListing) {
        createdListing = await sqlite.listing.update({
          where: { id: listingId },
          data: listingData,
        });
      } else {
        createdListing = await sqlite.listing.create({
          data: { id: listingId, ...listingData },
        });
      }

      // Handle images
      if (lily.img_url && Array.isArray(lily.img_url)) {
        for (let i = 0; i < lily.img_url.length; i++) {
          const imageUrl = lily.img_url[i];
          if (typeof imageUrl === "string" && imageUrl.trim() !== "") {
            try {
              const existingImage = await sqlite.image.findFirst({
                where: {
                  listingId: createdListing.id,
                  order: i,
                },
                select: { id: true, url: true, updatedAt: true },
              });

              // Skip if image exists and URL hasn't changed
              if (existingImage && existingImage.url === imageUrl.trim()) {
                imageSkippedCount++;
                continue;
              }

              const imageData = {
                url: imageUrl.trim(),
                listingId: createdListing.id,
                order: i,
                createdAt: lily.created_at,
                updatedAt: lily.updated_at,
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
  console.log(`Skipped unchanged: ${skippedCount} listings`);
  console.log(`Failed to migrate: ${errorCount} listings`);
  console.log(`Successfully created/updated: ${imageSuccessCount} images`);
  console.log(`Skipped unchanged: ${imageSkippedCount} images`);
  console.log(`Failed to create/update: ${imageErrorCount} images`);
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
  let skippedCount = 0;
  let imageSuccessCount = 0;
  let imageErrorCount = 0;
  let imageSkippedCount = 0;

  for (const user of users) {
    const userId = user.id.toString();

    try {
      // Check if profile exists and if it has been updated
      const existingProfile = await sqlite.userProfile.findUnique({
        where: { userId },
        select: { updatedAt: true },
      });

      // Skip if profile exists and hasn't been updated
      if (existingProfile && existingProfile.updatedAt >= user.updated_at) {
        skippedCount++;
        continue;
      }

      // Convert bio to EditorJS format if it exists
      let processedContent: string | null = null;
      if (user.bio) {
        try {
          JSON.parse(user.bio);
          processedContent = user.bio;
        } catch {
          try {
            const editorJSData = convertMarkdownToEditorJS(user.bio);
            processedContent = JSON.stringify(editorJSData);
          } catch (error) {
            console.error(`Error converting bio for user ${userId}:`, error);
            const fallbackData: EditorJSData = {
              time: new Date().getTime(),
              blocks: [
                {
                  type: "paragraph",
                  data: {
                    text: user.bio,
                  },
                },
              ],
              version: "2.27.2",
            };
            processedContent = JSON.stringify(fallbackData);
          }
        }
      }

      const slug = transformToSlug(user.username, userId);

      const profileData = {
        userId: userId,
        title: user.username,
        slug,
        logoUrl: user.avatar_url,
        description: user.intro,
        content: processedContent,
        location: user.user_location,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      };

      let createdProfile;
      if (existingProfile) {
        createdProfile = await sqlite.userProfile.update({
          where: { userId },
          data: profileData,
        });
      } else {
        createdProfile = await sqlite.userProfile.create({
          data: profileData,
        });
      }

      // Handle images
      if (user.img_urls && Array.isArray(user.img_urls)) {
        for (let i = 0; i < user.img_urls.length; i++) {
          const imageUrl = user.img_urls[i];
          if (typeof imageUrl === "string" && imageUrl.trim() !== "") {
            try {
              const existingImage = await sqlite.image.findFirst({
                where: {
                  userProfileId: createdProfile.id,
                  order: i,
                },
                select: { id: true, url: true },
              });

              // Skip if image exists and URL hasn't changed
              if (existingImage && existingImage.url === imageUrl.trim()) {
                imageSkippedCount++;
                continue;
              }

              const imageData = {
                url: imageUrl.trim(),
                userProfileId: createdProfile.id,
                order: i,
                createdAt: user.created_at,
                updatedAt: user.updated_at,
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
  console.log(`Skipped unchanged: ${skippedCount} user profiles`);
  console.log(`Failed to migrate: ${errorCount} user profiles`);
  console.log(`Successfully created/updated: ${imageSuccessCount} images`);
  console.log(`Skipped unchanged: ${imageSkippedCount} images`);
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
  await upsertAhsListings();
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
