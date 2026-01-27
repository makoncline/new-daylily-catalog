import {
  resolveTempDbUrl,
  ensureLocalTempDbSafety,
  withTempE2EDb,
} from "../src/lib/test-utils/e2e-db";
import { createAuthedUser } from "../src/lib/test-utils/e2e-users";

function readDbArg() {
  const args = process.argv.slice(2);
  const flagIndex = args.indexOf("--db");
  if (flagIndex !== -1) {
    return args[flagIndex + 1];
  }
  return args[0];
}

const PROFILE_SLUG = "seeded-daylily";

async function seed() {
  const url = resolveTempDbUrl(readDbArg());
  process.env.LOCAL_DATABASE_URL = url;
  ensureLocalTempDbSafety();
  await withTempE2EDb(async (db) => {
    const user = await createAuthedUser(db);
    const profileData = {
      userId: user.id,
      title: "Seeded Daylily Farm",
      slug: PROFILE_SLUG,
      description: "Seeded profile for listings UI",
      location: "Snohomish, WA",
    };
    const profile = await db.userProfile.upsert({
      where: { userId: user.id },
      update: profileData,
      create: profileData,
    });

    await db.image.create({
      data: {
        url: "/assets/hero-garden.webp",
        userProfileId: profile.id,
        order: 0,
      },
    });

    if (user.stripeCustomerId) {
      await db.keyValue.upsert({
        where: { key: `stripe:customer:${user.stripeCustomerId}` },
        update: { value: JSON.stringify({ status: "active" }) },
        create: {
          key: `stripe:customer:${user.stripeCustomerId}`,
          value: JSON.stringify({ status: "active" }),
        },
      });
    }

    const list = await db.list.create({
      data: {
        userId: user.id,
        title: "Seeded Favorites",
        description: "Example list for local dev",
      },
    });

    const ahs = await db.ahsListing.create({
      data: {
        id: "ahs-coffee-frenzy",
        name: "Coffee Frenzy",
        hybridizer: "Reed",
        year: "2012",
        bloomSeason: "M",
        ploidy: "Tet",
        foliageType: "Dormant",
        color: "Coffee brown",
        flower: "Cocoa blooms with gold throat.",
        ahsImageUrl: "/assets/catalog-blooms.webp",
      },
    });

    await db.listing.create({
      data: {
        userId: user.id,
        title: "Custom Sunrise",
        slug: "custom-sunrise",
        price: 18,
        description: "Custom listing example.",
        privateNote: "Example private note.",
        status: "PUBLISHED",
        lists: { connect: [{ id: list.id }] },
        images: {
          create: [{ url: "/assets/catalog-blooms.webp", order: 0 }],
        },
      },
    });

    await db.listing.create({
      data: {
        userId: user.id,
        title: ahs.name ?? "Coffee Frenzy",
        slug: "coffee-frenzy",
        price: 30,
        description: "Linked to AHS example.",
        status: "PUBLISHED",
        ahsId: ahs.id,
      },
    });
  }, { clearFirst: true });
}

seed()
  .then(() => {
    console.log("[seed-temp-db] Seeded temp DB example data.");
    console.log(`[seed-temp-db] Seeded profile slug: ${PROFILE_SLUG}`);
  })
  .catch((error) => {
    console.error("[seed-temp-db] Failed to seed temp DB example data:", error);
    process.exitCode = 1;
  });
