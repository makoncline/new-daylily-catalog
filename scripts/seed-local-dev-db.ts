import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { createAuthedUser } from "../src/lib/test-utils/e2e-users";
import { seedAhsListing } from "../src/lib/test-utils/seed-cultivar-sources";

const DEFAULT_DB_PATH = path.join("prisma", "local-dev-seeded.sqlite");
const MAIN_USER_LISTINGS_COUNT = 80;
const MAIN_USER_LISTS_COUNT = 2;
const SECONDARY_USER_COUNT = 2;
const SECONDARY_USER_LISTINGS_COUNT = 10;
const SYNTHETIC_AHS_COUNT = 50;
const DUAL_SOURCE_2026_COUNT = 10;
const LISTINGS_WITH_IMAGES_PERCENT = 0.75;
const PROFILE_SLUG = "seeded-daylily";
const TOGGLE_DEMO_SLUG = "toggle-source-demo";
const TOGGLE_DEMO_LEGACY_NAME = "Legacy Toggle Bloom";
const TOGGLE_DEMO_CULTIVAR_NAME = "Cultivar Toggle Bloom";
const SHARED_IMAGE_URL = "/assets/catalog-blooms.webp";
const BLOOM_SEASONS = ["E", "M", "ML", "L"] as const;
const FOLIAGE_TYPES = ["Dormant", "Evergreen"] as const;
const FLOWER_COLORS = [
  "Rose coral",
  "Golden yellow",
  "Lavender violet",
  "Cream white",
  "Plum red",
] as const;

interface AhsCultivarPair {
  ahsId: string;
  cultivarReferenceId: string;
}

function selectListingIdsForImages(listingIds: string[]) {
  const targetCount = Math.floor(listingIds.length * LISTINGS_WITH_IMAGES_PERCENT);
  const selected = listingIds.filter((_, index) => index % 4 !== 3);

  if (selected.length > targetCount) {
    return selected.slice(0, targetCount);
  }

  if (selected.length < targetCount) {
    const selectedSet = new Set(selected);
    for (const id of listingIds) {
      if (selectedSet.has(id)) {
        continue;
      }
      selected.push(id);
      if (selected.length === targetCount) {
        break;
      }
    }
  }

  return selected;
}

function readDbArg() {
  const args = process.argv.slice(2);
  const flagIndex = args.indexOf("--db");
  if (flagIndex !== -1) {
    return args[flagIndex + 1];
  }
  return args[0];
}

function resolveDbPath(pathOrUrl?: string) {
  const value = pathOrUrl ?? DEFAULT_DB_PATH;
  if (value.startsWith("file:")) {
    return value.replace(/^file:/, "");
  }
  return path.isAbsolute(value) ? value : path.resolve(process.cwd(), value);
}

function resolveDbUrl(pathOrUrl?: string) {
  return `file:${resolveDbPath(pathOrUrl)}`;
}

function getNpxCommand() {
  return process.platform === "win32" ? "npx.cmd" : "npx";
}

function resetSqliteFiles(dbPath: string) {
  for (const target of [dbPath, `${dbPath}-wal`, `${dbPath}-shm`]) {
    if (fs.existsSync(target)) {
      fs.rmSync(target);
    }
  }
}

function runPrismaDbPush(dbUrl: string) {
  const rustLog = process.env.RUST_LOG;
  const effectiveRustLog =
    rustLog === "warn" || rustLog === "error" || rustLog === "off"
      ? "info"
      : (rustLog ?? "info");

  execFileSync(getNpxCommand(), ["prisma", "db", "push"], {
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: dbUrl,
      NODE_OPTIONS: "",
      RUST_LOG: effectiveRustLog,
    },
  });
}

function pad(value: number, length = 3) {
  return String(value).padStart(length, "0");
}

async function createSyntheticAhsRows(db: PrismaClient) {
  const pairs: AhsCultivarPair[] = [];

  for (let i = 1; i <= SYNTHETIC_AHS_COUNT; i++) {
    const n = pad(i);
    const year = String(1980 + (i % 45));
    const bloomSeason = BLOOM_SEASONS[i % BLOOM_SEASONS.length] ?? "M";
    const foliageType = FOLIAGE_TYPES[i % FOLIAGE_TYPES.length] ?? "Dormant";
    const color = FLOWER_COLORS[i % FLOWER_COLORS.length] ?? "Rose coral";
    const name = `Seed Cultivar ${n}`;

    const { ahsListing, cultivarReferenceId } = await seedAhsListing({
      db,
      id: `ahs-seed-${n}`,
      name,
      hybridizer: `Seed Hybridizer ${n}`,
      year,
      bloomSeason,
      ploidy: i % 2 === 0 ? "Tet" : "Dip",
      foliageType,
      color,
      flower: `${name} with ${color.toLowerCase()} petals.`,
    });

    pairs.push({ ahsId: ahsListing.id, cultivarReferenceId });
  }

  return pairs;
}

async function createDualSource2026Rows(db: PrismaClient) {
  const pairs: AhsCultivarPair[] = [];

  for (let i = 1; i <= DUAL_SOURCE_2026_COUNT; i++) {
    const n = pad(i, 2);
    const bloomSeason = BLOOM_SEASONS[(i - 1) % BLOOM_SEASONS.length] ?? "M";
    const foliageType = FOLIAGE_TYPES[(i - 1) % FOLIAGE_TYPES.length] ?? "Dormant";
    const color = FLOWER_COLORS[(i - 1) % FLOWER_COLORS.length] ?? "Rose coral";
    const name = `2026 Preview Bloom ${n}`;

    const { ahsListing, cultivarReferenceId } = await seedAhsListing({
      db,
      id: `ahs-2026-preview-${n}`,
      name,
      hybridizer: `Preview Hybridizer ${n}`,
      year: "2026",
      scapeHeight: `${32 + i} inches`,
      bloomSize: `${5 + (i % 3)} inches`,
      bloomSeason,
      ploidy: i % 2 === 0 ? "Tet" : "Dip",
      foliageType,
      bloomHabit: i % 2 === 0 ? "Diurnal" : "Extended",
      budcount: String(18 + i),
      branches: String(3 + (i % 4)),
      color,
      parentage: `(Preview ${n} x Seedling ${n})`,
      ahsImageUrl: SHARED_IMAGE_URL,
    });

    pairs.push({ ahsId: ahsListing.id, cultivarReferenceId });
  }

  return pairs;
}

async function seedSecondaryUser(
  db: PrismaClient,
  index: number,
  ahsCultivarPairs: AhsCultivarPair[],
) {
  const userLabel = pad(index + 1, 2);
  const user = await db.user.create({
    data: {
      clerkUserId: `user_seed_secondary_${userLabel}`,
      stripeCustomerId: `cus_seed_secondary_${userLabel}`,
    },
  });

  const secondaryProfile = await db.userProfile.create({
    data: {
      userId: user.id,
      title: `Secondary Seed Farm ${userLabel}`,
      slug: `secondary-seeded-daylily-${userLabel}`,
      logoUrl: SHARED_IMAGE_URL,
      description: `Secondary seeded user ${userLabel} with a compact catalog.`,
      location: "Monroe, WA",
    },
  });
  await db.image.create({
    data: {
      url: SHARED_IMAGE_URL,
      userProfileId: secondaryProfile.id,
      order: 0,
    },
  });

  const list = await db.list.create({
    data: {
      userId: user.id,
      title: `Secondary ${userLabel} Featured List`,
      description: `One curated list for secondary user ${userLabel}.`,
    },
  });

  const listingIds: string[] = [];
  for (let i = 1; i <= SECONDARY_USER_LISTINGS_COUNT; i++) {
    const n = pad(i, 2);
    const pairIndex = (index * SECONDARY_USER_LISTINGS_COUNT + i - 1) % ahsCultivarPairs.length;
    const pair = ahsCultivarPairs[pairIndex];
    if (!pair) {
      throw new Error("Missing seeded AHS/cultivar pair for secondary listing");
    }
    const listing = await db.listing.create({
      data: {
        userId: user.id,
        title: `Secondary ${userLabel} Listing ${n}`,
        slug: `secondary-${userLabel}-listing-${n}`,
        description: `Secondary user ${userLabel} sample listing ${n}.`,
        price: 18 + ((index + i) % 9),
        status: i % 2 === 0 ? "PUBLISHED" : null,
        ahsId: pair.ahsId,
        cultivarReferenceId: pair.cultivarReferenceId,
      },
    });
    listingIds.push(listing.id);
  }

  await db.list.update({
    where: { id: list.id },
    data: {
      listings: {
        connect: listingIds.map((id) => ({ id })),
      },
    },
  });

  return listingIds;
}

async function seed(dbUrl: string) {
  const db = new PrismaClient({
    adapter: new PrismaLibSql(
      { url: dbUrl },
      { timestampFormat: "unixepoch-ms" },
    ),
    log: ["error"],
  });

  await db.$connect();
  try {
    const user = await createAuthedUser(db);

    const profile = await db.userProfile.upsert({
      where: { userId: user.id },
      update: {
        title: "Seeded Daylily Farm",
        slug: PROFILE_SLUG,
        logoUrl: SHARED_IMAGE_URL,
        description: "Local dev profile for pagination testing",
        location: "Snohomish, WA",
      },
      create: {
        userId: user.id,
        title: "Seeded Daylily Farm",
        slug: PROFILE_SLUG,
        logoUrl: SHARED_IMAGE_URL,
        description: "Local dev profile for pagination testing",
        location: "Snohomish, WA",
      },
    });

    await db.image.create({
      data: {
        url: SHARED_IMAGE_URL,
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

    const { ahsListing: ahs, cultivarReferenceId } = await seedAhsListing({
      db,
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
    });

    const { ahsListing: legacyToggleAhs, cultivarReferenceId: legacyToggleCultivarReferenceId } =
      await seedAhsListing({
        db,
        id: "ahs-toggle-legacy",
        name: TOGGLE_DEMO_LEGACY_NAME,
        hybridizer: "LegacyHybridizer",
        year: "2001",
        bloomSeason: "E",
        color: "Golden apricot",
      });

    const { cultivarReferenceId: cultivarToggleCultivarReferenceId } =
      await seedAhsListing({
      db,
      id: "ahs-toggle-cultivar",
      name: TOGGLE_DEMO_CULTIVAR_NAME,
      hybridizer: "CultivarHybridizer",
      year: "2019",
      bloomSeason: "L",
      color: "Lavender rose",
    });

    const syntheticAhsPairs = (await createSyntheticAhsRows(db)).concat(
      await createDualSource2026Rows(db),
    );

    const listingIds: string[] = [];
    for (let i = 1; i <= MAIN_USER_LISTINGS_COUNT; i++) {
      const n = pad(i);
      const pair = syntheticAhsPairs[(i - 1) % syntheticAhsPairs.length];
      if (!pair) {
        throw new Error("Missing seeded AHS/cultivar pair for primary listing");
      }
      const shouldLinkToAhs = i % 3 === 0;
      const listing = await db.listing.create({
        data: {
          userId: user.id,
          title: `Main Dev Listing ${n}`,
          slug: `main-dev-listing-${n}`,
          description: `Primary seeded listing ${n} for local dev`,
          price: i % 2 === 0 ? 15 + (i % 10) : null,
          status: i % 4 === 0 ? "PUBLISHED" : null,
          ahsId: shouldLinkToAhs ? pair.ahsId : null,
          cultivarReferenceId: shouldLinkToAhs ? pair.cultivarReferenceId : null,
        },
      });
      listingIds.push(listing.id);
    }

    const coffeeFrenzyListing = await db.listing.create({
      data: {
        userId: user.id,
        title: ahs.name ?? "Coffee Frenzy",
        slug: "coffee-frenzy",
        price: 30,
        description: "Linked to AHS example.",
        status: "PUBLISHED",
        ahsId: ahs.id,
        cultivarReferenceId,
      },
    });

    // Demo listing intentionally points legacy and cultivar-reference sources at different AHS rows.
    const toggleSourceListing = await db.listing.create({
      data: {
        userId: user.id,
        title: "Toggle Source Demo",
        slug: TOGGLE_DEMO_SLUG,
        description:
          "Use Cmd+Option+X feature toggle menu to switch visible AHS source.",
        ahsId: legacyToggleAhs.id,
        cultivarReferenceId: cultivarToggleCultivarReferenceId,
        status: "PUBLISHED",
      },
    });

    // Keep one fully aligned listing for comparison.
    const alignedCultivarListing = await db.listing.create({
      data: {
        userId: user.id,
        title: "Aligned Cultivar Demo",
        slug: "aligned-cultivar-demo",
        description: "Control listing where ahsId and cultivar reference agree.",
        ahsId: legacyToggleAhs.id,
        cultivarReferenceId: legacyToggleCultivarReferenceId,
        status: "PUBLISHED",
      },
    });

    const featuredList = await db.list.create({
      data: {
        userId: user.id,
        title: "Main Featured List",
        description: "Primary curated list for local dev testing.",
      },
    });

    const seasonalList = await db.list.create({
      data: {
        userId: user.id,
        title: "Main Seasonal Highlights",
        description: "Secondary curated list for filtering and sharing flows.",
      },
    });

    const primaryListConnectIds = listingIds
      .slice(0, 12)
      .concat([coffeeFrenzyListing.id, toggleSourceListing.id]);
    const secondaryListConnectIds = listingIds
      .slice(12, 24)
      .concat([alignedCultivarListing.id]);

    await db.list.update({
      where: { id: featuredList.id },
      data: {
        listings: {
          connect: primaryListConnectIds.map((id) => ({ id })),
        },
      },
    });

    await db.list.update({
      where: { id: seasonalList.id },
      data: {
        listings: {
          connect: secondaryListConnectIds.map((id) => ({ id })),
        },
      },
    });

    let secondaryUserListingsTotal = 0;
    const secondaryUserListingIds: string[] = [];
    for (let i = 0; i < SECONDARY_USER_COUNT; i++) {
      const seededSecondaryListingIds = await seedSecondaryUser(
        db,
        i,
        syntheticAhsPairs,
      );
      secondaryUserListingsTotal += seededSecondaryListingIds.length;
      secondaryUserListingIds.push(...seededSecondaryListingIds);
    }

    const allListingIds = listingIds
      .concat([
        coffeeFrenzyListing.id,
        toggleSourceListing.id,
        alignedCultivarListing.id,
      ])
      .concat(secondaryUserListingIds);
    const listingIdsForImages = selectListingIdsForImages(allListingIds);

    for (const listingId of listingIdsForImages) {
      await db.image.create({
        data: {
          url: SHARED_IMAGE_URL,
          listingId,
          order: 0,
        },
      });
    }

    const totalListings = listingIds.length + 3 + secondaryUserListingsTotal;
    const totalUsers = 1 + SECONDARY_USER_COUNT;
    const totalLists = MAIN_USER_LISTS_COUNT + SECONDARY_USER_COUNT;
    const totalAhsRows = SYNTHETIC_AHS_COUNT + DUAL_SOURCE_2026_COUNT + 3;

    return {
      totalListings,
      totalUsers,
      totalLists,
      totalAhsRows,
      totalV2Rows: totalAhsRows,
      totalCultivarReferenceRows: totalAhsRows,
      listingImagesSeeded: listingIdsForImages.length,
      totalImages: listingIdsForImages.length + 1,
    };
  } finally {
    await db.$disconnect();
  }
}

async function main() {
  const dbPath = resolveDbPath(readDbArg());
  const dbUrl = resolveDbUrl(dbPath);

  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  resetSqliteFiles(dbPath);
  runPrismaDbPush(dbUrl);
  const stats = await seed(dbUrl);

  console.log("[seed-local-dev-db] Done.");
  console.log("[seed-local-dev-db] Database: " + dbPath);
  console.log("[seed-local-dev-db] Log in with: makon+clerk_test@hey.com");
  console.log("[seed-local-dev-db] Profile slug: " + PROFILE_SLUG);
  console.log("[seed-local-dev-db] Users: " + stats.totalUsers);
  console.log("[seed-local-dev-db] Listings: " + stats.totalListings);
  console.log("[seed-local-dev-db] Lists: " + stats.totalLists);
  console.log("[seed-local-dev-db] AHS rows: " + stats.totalAhsRows);
  console.log("[seed-local-dev-db] V2 rows: " + stats.totalV2Rows);
  console.log(
    "[seed-local-dev-db] Cultivar references: " + stats.totalCultivarReferenceRows,
  );
  console.log("[seed-local-dev-db] Listing images: " + stats.listingImagesSeeded);
  console.log("[seed-local-dev-db] Total images: " + stats.totalImages);
  console.log(
    `[seed-local-dev-db] Toggle demo listing slug: ${TOGGLE_DEMO_SLUG}`,
  );
  console.log(
    `[seed-local-dev-db] Toggle OFF shows: ${TOGGLE_DEMO_LEGACY_NAME} | Toggle ON shows: ${TOGGLE_DEMO_CULTIVAR_NAME}`,
  );
}

main().catch((error) => {
  console.error("[seed-local-dev-db] Failed:", error);
  process.exitCode = 1;
});
