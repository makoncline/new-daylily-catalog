import { PrismaClient } from "./generated/sqlite-client";

const db = new PrismaClient();

async function main() {
  const user = await db.user.create({
    data: {
      clerkUserId: "user_2tNBvfz00pi17Kavs9M6wurk1VP",
    },
  });

  await db.userProfile.create({
    data: {
      userId: user.id,
      title: "Test User",
      slug: "test-user",
      description: "Test profile",
    },
  });

  const list = await db.list.create({
    data: {
      userId: user.id,
      title: "Test List",
      description: "List for testing",
    },
  });

  const createListing = async (i: number) => {
    await db.listing.create({
      data: {
        userId: user.id,
        title: `Seed Listing ${i}`,
        slug: `seed-listing-${i}`,
        price: i,
        description: `Listing number ${i}`,
        lists: { connect: { id: list.id } },
      },
    });
  };

  for (let i = 1; i <= 105; i++) {
    await createListing(i);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
