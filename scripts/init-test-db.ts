import {
  PrismaClient,
  type User,
  type UserProfile,
  type Listing,
  type List,
} from "@prisma/client";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";

// Log environment for debugging
console.log("🔍 Current environment:");
console.log("- NODE_ENV:", process.env.NODE_ENV);
console.log("- DATABASE_URL:", process.env.LOCAL_DATABASE_URL);
console.log("- USE_TURSO_DB:", process.env.USE_TURSO_DB);

// Initialize Prisma Client with test database URL
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "file:./db-test.sqlite",
    },
  },
});

// Helper functions for creating test data
interface CreateUserOptions {
  id?: string;
  clerkUserId?: string;
  role?: string;
  profile?: Partial<
    Omit<UserProfile, "id" | "userId" | "createdAt" | "updatedAt">
  >;
}

interface CreateListingOptions {
  title?: string;
  slug?: string;
  price?: number;
  description?: string;
  privateNote?: string;
  status?: string;
}

interface CreateListOptions {
  title?: string;
  description?: string;
  status?: string;
}

async function createTestUser(options: CreateUserOptions = {}): Promise<User> {
  const {
    id = `test-user-${uuidv4()}`,
    clerkUserId = `user_${uuidv4()}`,
    role = "USER",
    profile,
  } = options;

  const user = await prisma.user.create({
    data: {
      id,
      clerkUserId,
      role,
      profile: profile
        ? {
            create: {
              title: profile.title ?? "Test Garden",
              slug: profile.slug ?? `test-garden-${uuidv4()}`,
              description:
                profile.description ?? "A test garden for E2E testing",
              content: profile.content,
              location: profile.location,
              logoUrl: profile.logoUrl,
            },
          }
        : undefined,
    },
    include: {
      profile: true,
    },
  });

  return user;
}

async function createTestListing(
  userId: string,
  options: CreateListingOptions = {},
): Promise<Listing> {
  const {
    title = `Test Listing ${Date.now()}`,
    slug = `test-listing-${Date.now()}`,
    price = 19.99,
    description = "A test listing for E2E testing",
    privateNote = "Private test note",
    status = "PUBLISHED",
  } = options;

  return prisma.listing.create({
    data: {
      userId,
      title,
      slug,
      price,
      description,
      privateNote,
      status,
    },
  });
}

async function createTestList(
  userId: string,
  options: CreateListOptions = {},
): Promise<List> {
  const {
    title = `Test List ${Date.now()}`,
    description = "A test list for E2E testing",
    status = "PUBLISHED",
  } = options;

  return prisma.list.create({
    data: {
      userId,
      title,
      description,
      status,
    },
  });
}

async function main() {
  console.log("🚀 Starting test database initialization...");

  // Delete existing test database and its directory if they exist
  const dbPath = path.join(process.cwd(), "prisma", "db-test.sqlite");
  const dbDirPath = path.join(process.cwd(), "prisma");

  // Ensure prisma directory exists with proper permissions
  if (!fs.existsSync(dbDirPath)) {
    fs.mkdirSync(dbDirPath, { recursive: true, mode: 0o777 });
  }
  fs.chmodSync(dbDirPath, 0o777);

  // Remove existing database files
  if (fs.existsSync(dbPath)) {
    console.log("🗑️  Removing existing test database...");
    fs.unlinkSync(dbPath);
  }

  const journalPath = dbPath + "-journal";
  if (fs.existsSync(journalPath)) {
    console.log("🗑️  Removing database journal file...");
    fs.unlinkSync(journalPath);
  }

  // Create an empty database file with write permissions
  console.log("📝 Creating new test database file...");
  fs.writeFileSync(dbPath, "", { mode: 0o666 });
  fs.chmodSync(dbPath, 0o666);

  try {
    // Generate Prisma Client first
    console.log("🔄 Generating Prisma Client...");
    execSync("npx prisma generate", {
      stdio: "inherit",
      env: {
        ...process.env,
        DATABASE_URL: "file:./db-test.sqlite",
      },
    });

    // Create database schema
    console.log("📊 Creating database schema...");
    execSync(
      "npx prisma db push --accept-data-loss --force-reset --skip-generate",
      {
        stdio: "inherit",
        env: {
          ...process.env,
          DATABASE_URL: "file:./db-test.sqlite",
        },
      },
    );

    // Double check write permissions after schema creation
    console.log("🔒 Setting database file permissions...");
    fs.chmodSync(dbPath, 0o666);
    if (fs.existsSync(journalPath)) {
      fs.chmodSync(journalPath, 0o666);
    }

    // Verify write permissions
    try {
      fs.accessSync(dbPath, fs.constants.W_OK);
      console.log("✅ Database file is writable");

      // Also verify journal file is writable if it exists
      if (fs.existsSync(journalPath)) {
        fs.accessSync(journalPath, fs.constants.W_OK);
        console.log("✅ Database journal file is writable");
      }
    } catch (error) {
      console.error("❌ Database file is not writable:", error);
      process.exit(1);
    }

    // Test write operation
    console.log("🔍 Testing database write operation...");
    try {
      // Test write by creating and deleting a temporary record
      const testUser = await prisma.user.create({
        data: {
          id: "test-write-user",
          clerkUserId: "test-write-clerk-id",
          role: "USER",
        },
      });
      await prisma.user.delete({
        where: { id: testUser.id },
      });
      console.log("✅ Database write test successful");
    } catch (error) {
      console.error("❌ Database write test failed:", error);
      process.exit(1);
    }

    // Create our main test user (the one we'll log in as)
    console.log("👤 Creating main test user...");
    const mainUser = await createTestUser({
      id: "test-user-id",
      clerkUserId: "user_2tNBvfz00pi17Kavs9M6wurk1VP",
      profile: {
        title: "Test Garden",
        slug: "test-garden",
        description: "A test garden for E2E testing",
      },
    });

    // Create 13 listings for the main user
    console.log("📝 Creating listings for main user...");
    const mainUserListings = await Promise.all(
      Array.from({ length: 13 }, (_, i) =>
        createTestListing(mainUser.id, {
          title: `Test Daylily ${i + 1}`,
          slug: `test-daylily-${i + 1}`,
          price: 19.99 + i,
          description: `Test daylily number ${i + 1}`,
          status: "PUBLISHED",
        }),
      ),
    );

    // Create 2 lists for the main user and add the first listing to both
    console.log("📋 Creating lists for main user...");
    const [list1, list2] = await Promise.all([
      createTestList(mainUser.id, {
        title: "My Favorites",
        description: "My favorite daylilies",
        status: "PUBLISHED",
      }),
      createTestList(mainUser.id, {
        title: "Watch List",
        description: "Daylilies I'm watching",
        status: "PUBLISHED",
      }),
    ]);

    // Add the first listing to both lists
    await prisma.list.update({
      where: { id: list1.id },
      data: {
        listings: {
          connect: { id: mainUserListings[0]!.id },
        },
      },
    });

    await prisma.list.update({
      where: { id: list2.id },
      data: {
        listings: {
          connect: { id: mainUserListings[0]!.id },
        },
      },
    });

    // Create 12 additional users with one listing each
    console.log("👥 Creating additional test users...");
    await Promise.all(
      Array.from({ length: 12 }, (_, i) =>
        createTestUser({
          profile: {
            title: `Garden ${i + 1}`,
            slug: `garden-${i + 1}`,
            description: `Test garden number ${i + 1}`,
          },
        }).then((user) =>
          createTestListing(user.id, {
            title: `Daylily from Garden ${i + 1}`,
            slug: `daylily-garden-${i + 1}`,
            price: 15.99 + i,
            description: `A beautiful daylily from garden ${i + 1}`,
            status: "PUBLISHED",
          }),
        ),
      ),
    );

    console.log("✅ Test database initialized successfully!");
  } catch (error) {
    console.error("❌ Error initializing test database:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Handle promise rejection
main().catch((error) => {
  console.error(error);
  process.exit(1);
});
