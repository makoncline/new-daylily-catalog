import { PrismaClient } from "./generated/sqlite-client";

const db = new PrismaClient();

// Test user constants
const TEST_USER = {
  email: "test_playwright+clerk_test@gmail.com",
  clerkId: "user_2tNBvfz00pi17Kavs9M6wurk1VP",
  stripeCustomerId: "cus_test_daylily_catalog",
} as const;

async function main() {
  console.log("🧪 Seeding test database...");

  // Create test user
  const user = await db.user.create({
    data: {
      clerkUserId: TEST_USER.clerkId,
      stripeCustomerId: TEST_USER.stripeCustomerId,
      role: "USER",
    },
  });

  // Create user profile
  await db.userProfile.create({
    data: {
      userId: user.id,
      title: "Test Daylily Garden",
      slug: "test-daylily-garden",
      description: "A test garden for E2E testing with beautiful daylilies",
      location: "Test City, TS",
      content: "Welcome to our test daylily garden! We specialize in testing beautiful daylilies.",
    },
  });

  // Add Stripe customer data to key-value store
  await db.keyValue.create({
    data: {
      key: `stripe_customer_${TEST_USER.stripeCustomerId}`,
      value: JSON.stringify({
        id: TEST_USER.stripeCustomerId,
        email: TEST_USER.email,
        name: "Test User",
        created: Math.floor(Date.now() / 1000),
        subscriptions: {
          data: [
            {
              id: "sub_test_pro",
              status: "active",
              current_period_end: Math.floor(Date.now() / 1000) + 86400 * 30, // 30 days from now
              items: {
                data: [
                  {
                    price: {
                      id: "price_test_pro_monthly",
                      nickname: "Pro Monthly",
                    },
                  },
                ],
              },
            },
          ],
        },
      }),
    },
  });

  // Create test lists
  const gardenList = await db.list.create({
    data: {
      userId: user.id,
      title: "My Garden",
      description: "All the daylilies in my test garden",
      status: "ACTIVE",
    },
  });

  const salesList = await db.list.create({
    data: {
      userId: user.id,
      title: "For Sale",
      description: "Daylilies available for purchase",
      status: "ACTIVE",
    },
  });

  const favoriteslist = await db.list.create({
    data: {
      userId: user.id,
      title: "Favorites",
      description: "My favorite daylily cultivars",
      status: "ACTIVE",
    },
  });

  // Create some AHS listings for testing database integration
  const ahsListings = await Promise.all([
    db.ahsListing.create({
      data: {
        name: "Alabama Jubilee",
        hybridizer: "Oakes",
        year: "1976",
        scapeHeight: "36 inches",
        bloomSize: "6 inches",
        bloomSeason: "M",
        ploidy: "Dip",
        foliageType: "SEv",
        bloomHabit: "Noc",
        color: "Red with yellow throat",
        form: "Single",
        parentage: "Unknown",
      },
    }),
    db.ahsListing.create({
      data: {
        name: "Stella de Oro",
        hybridizer: "Jablonski",
        year: "1975",
        scapeHeight: "11 inches",
        bloomSize: "2.75 inches",
        bloomSeason: "Re",
        ploidy: "Dip",
        foliageType: "Dor",
        bloomHabit: "Diu",
        color: "Yellow",
        form: "Single",
        parentage: "Unknown",
      },
    }),
  ]);

  // Create test listings
  const listings = [];
  const testListings = [
    {
      title: "Alabama Jubilee",
      price: 25,
      description: "Beautiful red daylily with yellow throat, midseason bloomer",
      privateNote: "From Jane's collection",
      ahsId: ahsListings[0].id,
      lists: [gardenList.id, salesList.id],
    },
    {
      title: "Stella de Oro",
      price: 15,
      description: "Popular repeat blooming yellow daylily, perfect for beginners",
      privateNote: "Great for mass plantings",
      ahsId: ahsListings[1].id,
      lists: [gardenList.id, salesList.id, favoriteslist.id],
    },
    {
      title: "Custom Purple Beauty",
      price: 45,
      description: "Custom hybridized purple daylily with ruffled edges",
      privateNote: "My own creation",
      lists: [gardenList.id, favoriteslist.id],
    },
    {
      title: "Test Daylily 1",
      price: 20,
      description: "First test daylily for automated testing",
      lists: [gardenList.id],
    },
    {
      title: "Test Daylily 2",
      price: 30,
      description: "Second test daylily for automated testing",
      lists: [gardenList.id],
    },
  ];

  for (let i = 0; i < testListings.length; i++) {
    const listingData = testListings[i];
    const listing = await db.listing.create({
      data: {
        userId: user.id,
        title: listingData.title,
        slug: listingData.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        price: listingData.price,
        description: listingData.description,
        privateNote: listingData.privateNote,
        ahsId: listingData.ahsId,
        status: "ACTIVE",
        lists: {
          connect: listingData.lists.map(listId => ({ id: listId })),
        },
      },
    });
    listings.push(listing);
  }

  console.log(`✅ Test database seeded successfully:
    - User: ${TEST_USER.email} (${user.id})
    - Profile: test-daylily-garden
    - Lists: ${gardenList.title}, ${salesList.title}, ${favoriteslist.title}
    - Listings: ${listings.length}
    - AHS Listings: ${ahsListings.length}
    - Stripe Customer: ${TEST_USER.stripeCustomerId}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });