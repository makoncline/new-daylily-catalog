import {
  resolveTempDbUrl,
  ensureLocalTempDbSafety,
  withTempE2EDb,
} from "../src/lib/test-utils/e2e-db";
import { normalizeCultivarName } from "../src/lib/utils/cultivar-utils";

type SeedDb = Parameters<Parameters<typeof withTempE2EDb>[0]>[0];

function readDbArg() {
  const args = process.argv.slice(2);
  const flagIndex = args.indexOf("--db");
  if (flagIndex !== -1) {
    return args[flagIndex + 1];
  }
  return args[0];
}

const PRIMARY_PROFILE_SLUG = "seeded-daylily";

async function seedSubscription(
  db: SeedDb,
  stripeCustomerId: string | null,
  status: "active" | "none",
) {
  if (!stripeCustomerId) {
    return;
  }

  await db.keyValue.upsert({
    where: { key: `stripe:customer:${stripeCustomerId}` },
    update: { value: JSON.stringify({ status }) },
    create: {
      key: `stripe:customer:${stripeCustomerId}`,
      value: JSON.stringify({ status }),
    },
  });
}

async function createCatalogUser({
  db,
  clerkUserId,
  stripeCustomerId,
  slug,
  title,
  description,
  location,
  isPro,
}: {
  db: SeedDb;
  clerkUserId: string;
  stripeCustomerId: string;
  slug: string;
  title: string;
  description: string;
  location: string;
  isPro: boolean;
}) {
  const user = await db.user.create({
    data: {
      clerkUserId,
      stripeCustomerId,
    },
  });

  const profile = await db.userProfile.create({
    data: {
      userId: user.id,
      slug,
      title,
      description,
      location,
    },
  });

  await seedSubscription(db, stripeCustomerId, isPro ? "active" : "none");

  return {
    user,
    profile,
  };
}

async function seedCultivarReference(
  db: SeedDb,
  ahsId: string,
  name: string,
) {
  return db.cultivarReference.upsert({
    where: { ahsId },
    create: {
      id: `cr-ahs-${ahsId}`,
      ahsId,
      normalizedName: normalizeCultivarName(name),
    },
    update: {
      normalizedName: normalizeCultivarName(name),
    },
  });
}

async function createCultivarListing({
  db,
  userId,
  cultivarReferenceId,
  title,
  slug,
  price,
  description,
  imageUrls,
  listIds,
}: {
  db: SeedDb;
  userId: string;
  cultivarReferenceId: string;
  title: string;
  slug: string;
  price: number | null;
  description: string;
  imageUrls: string[];
  listIds?: string[];
}) {
  const listing = await db.listing.create({
    data: {
      userId,
      cultivarReferenceId,
      title,
      slug,
      price,
      description,
      status: "PUBLISHED",
      lists:
        listIds && listIds.length > 0
          ? {
              connect: listIds.map((id) => ({ id })),
            }
          : undefined,
    },
  });

  await Promise.all(
    imageUrls.map((url, index) =>
      db.image.create({
        data: {
          listingId: listing.id,
          url,
          order: index,
        },
      }),
    ),
  );

  return listing;
}

async function seed() {
  const url = resolveTempDbUrl(readDbArg());
  process.env.LOCAL_DATABASE_URL = url;
  ensureLocalTempDbSafety();

  await withTempE2EDb(
    async (db) => {
      const primaryCatalog = await createCatalogUser({
        db,
        clerkUserId: "clerk-seeded-daylily",
        stripeCustomerId: "cus-seeded-daylily",
        slug: PRIMARY_PROFILE_SLUG,
        title: "Seeded Daylily Farm",
        description:
          "Large field-grown daylily collection with shipping and local pickup options.",
        location: "Snohomish, WA",
        isPro: true,
      });

      const oakCatalog = await createCatalogUser({
        db,
        clerkUserId: "clerk-oak-pro",
        stripeCustomerId: "cus-oak-pro",
        slug: "rolling-oaks-daylilies",
        title: "Rolling Oaks Daylilies",
        description:
          "Rolling Oaks Daylilies - curated seedlings and fan divisions from a mature garden.",
        location: "Picayune, MS",
        isPro: true,
      });

      const pineCatalog = await createCatalogUser({
        db,
        clerkUserId: "clerk-pine-pro",
        stripeCustomerId: "cus-pine-pro",
        slug: "pine-ridge-daylilies",
        title: "Pine Ridge Daylilies",
        description: "Specializing in bold color patterns and late-season bloomers.",
        location: "Athens, GA",
        isPro: true,
      });

      const hobbyCatalog = await createCatalogUser({
        db,
        clerkUserId: "clerk-hobby-grower",
        stripeCustomerId: "cus-hobby-grower",
        slug: "hobby-grower",
        title: "Hobby Grower",
        description: "Weekend hobby catalog",
        location: "Knoxville, TN",
        isPro: false,
      });

      await Promise.all([
        db.image.create({
          data: {
            userProfileId: primaryCatalog.profile.id,
            url: "/assets/hero-garden.webp",
            order: 0,
          },
        }),
        db.image.create({
          data: {
            userProfileId: primaryCatalog.profile.id,
            url: "/assets/catalog-blooms.webp",
            order: 1,
          },
        }),
        db.image.create({
          data: {
            userProfileId: oakCatalog.profile.id,
            url: "/assets/bouquet.png",
            order: 0,
          },
        }),
      ]);

      const featuredList = await db.list.create({
        data: {
          userId: primaryCatalog.user.id,
          title: "Featured Introductions",
          description: "Top seeded offerings",
        },
      });

      const showList = await db.list.create({
        data: {
          userId: primaryCatalog.user.id,
          title: "Show Winners",
          description: "Award-season highlights",
        },
      });

      const coffeeFrenzyAhs = await db.ahsListing.create({
        data: {
          id: "ahs-coffee-frenzy",
          name: "Coffee Frenzy",
          hybridizer: "Reed",
          year: "2012",
          scapeHeight: "36 inches",
          bloomSize: "6 inches",
          bloomSeason: "Midseason",
          form: "Single",
          ploidy: "Tet",
          foliageType: "Dormant",
          bloomHabit: "Diurnal",
          budcount: "24",
          branches: "5",
          sculpting: "Ruffled",
          foliage: "Green",
          flower: "Cocoa brown with gold throat",
          fragrance: "Light",
          parentage: "(Seedling x Seedling)",
          color: "Coffee brown / gold throat",
          ahsImageUrl: "/assets/catalog-blooms.webp",
        },
      });

      const coffeeFrenzyReference = await seedCultivarReference(
        db,
        coffeeFrenzyAhs.id,
        coffeeFrenzyAhs.name ?? "Coffee Frenzy",
      );

      await createCultivarListing({
        db,
        userId: primaryCatalog.user.id,
        cultivarReferenceId: coffeeFrenzyReference.id,
        title: "Coffee Frenzy Prime Fan",
        slug: "coffee-frenzy-prime-fan",
        price: 30,
        description: "Strong increase fan from mature clump.",
        imageUrls: ["/assets/bouquet.png", "/assets/catalog-blooms.webp"],
        listIds: [featuredList.id, showList.id],
      });

      await createCultivarListing({
        db,
        userId: primaryCatalog.user.id,
        cultivarReferenceId: coffeeFrenzyReference.id,
        title: "Coffee Frenzy Starter Fan",
        slug: "coffee-frenzy-starter-fan",
        price: 20,
        description: "Starter fan, healthy root system.",
        imageUrls: ["/assets/catalog-blooms.webp"],
        listIds: [featuredList.id],
      });

      await createCultivarListing({
        db,
        userId: oakCatalog.user.id,
        cultivarReferenceId: coffeeFrenzyReference.id,
        title: "Coffee Frenzy Display Clump",
        slug: "coffee-frenzy-display-clump",
        price: null,
        description: "Display clump linked for showcase and references.",
        imageUrls: [
          "/assets/bouquet.png",
          "/assets/catalog-blooms.webp",
          "/assets/hero-garden.webp",
        ],
      });

      await createCultivarListing({
        db,
        userId: pineCatalog.user.id,
        cultivarReferenceId: coffeeFrenzyReference.id,
        title: "Coffee Frenzy Garden Pickup",
        slug: "coffee-frenzy-garden-pickup",
        price: 25,
        description: "Local pickup from Pine Ridge fields.",
        imageUrls: ["/assets/bouquet.png", "/assets/hero-garden.webp"],
      });

      await createCultivarListing({
        db,
        userId: hobbyCatalog.user.id,
        cultivarReferenceId: coffeeFrenzyReference.id,
        title: "Coffee Frenzy Hobby Fan",
        slug: "coffee-frenzy-hobby-fan",
        price: 12,
        description: "Should be excluded from cultivar offers due to non-pro account.",
        imageUrls: ["/assets/hero-garden.webp"],
      });

      const relatedCultivars = [
        {
          id: "ahs-isle-of-wight",
          name: "Isle of Wight",
          year: "2007",
          color: "Peach pink",
          bloomSeason: "Early-Mid",
          image: "/assets/hero-garden.webp",
        },
        {
          id: "ahs-goldenzelle",
          name: "Goldenzelle",
          year: "2002",
          color: "Apricot",
          bloomSeason: "Mid",
          image: "/assets/catalog-blooms.webp",
        },
        {
          id: "ahs-mexican-fiesta",
          name: "Mexican Fiesta",
          year: "2008",
          color: "Red-orange",
          bloomSeason: "Mid-Late",
          image: "/assets/bouquet.png",
        },
      ] as const;

      for (const related of relatedCultivars) {
        const ahs = await db.ahsListing.create({
          data: {
            id: related.id,
            name: related.name,
            hybridizer: "Reed",
            year: related.year,
            color: related.color,
            bloomSeason: related.bloomSeason,
            ahsImageUrl: related.image,
          },
        });

        const cultivarReference = await seedCultivarReference(
          db,
          ahs.id,
          ahs.name ?? related.name,
        );

        await createCultivarListing({
          db,
          userId: primaryCatalog.user.id,
          cultivarReferenceId: cultivarReference.id,
          title: `${related.name} Seed Listing`,
          slug: normalizeCultivarName(`${related.name}-seed-listing`) ?? related.id,
          price: 18,
          description: `${related.name} listing for related-cultivar module coverage.`,
          imageUrls: [related.image],
        });
      }
    },
    { clearFirst: true },
  );
}

seed()
  .then(() => {
    console.log("[seed-temp-db] Seeded temp DB example data.");
    console.log(`[seed-temp-db] Seeded profile slug: ${PRIMARY_PROFILE_SLUG}`);
    console.log("[seed-temp-db] Try /cultivar/coffee-frenzy for full cultivar page preview.");
  })
  .catch((error) => {
    console.error("[seed-temp-db] Failed to seed temp DB example data:", error);
    process.exitCode = 1;
  });
