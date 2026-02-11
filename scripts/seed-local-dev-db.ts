import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { PrismaClient } from "../prisma/generated/sqlite-client/index.js";
import { createAuthedUser } from "../src/lib/test-utils/e2e-users";
import { normalizeCultivarName } from "../src/lib/utils/cultivar-utils";

const DEFAULT_DB_PATH = path.join("prisma", "local-dev.sqlite");
const LISTINGS_COUNT = 120;
const LISTS_COUNT = 25;
const PROFILE_SLUG = "seeded-daylily";

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

  execFileSync(getNpxCommand(), ["prisma", "db", "push", "--skip-generate"], {
    stdio: "inherit",
    env: {
      ...process.env,
      LOCAL_DATABASE_URL: dbUrl,
      NODE_OPTIONS: "",
      RUST_LOG: effectiveRustLog,
    },
  });
}

async function upsertCultivarReference(
  db: PrismaClient,
  ahsId: string,
  name: string | null | undefined,
) {
  const cultivarReference = await db.cultivarReference.upsert({
    where: { ahsId },
    update: {
      normalizedName: normalizeCultivarName(name),
    },
    create: {
      id: `cr-ahs-${ahsId}`,
      ahsId,
      normalizedName: normalizeCultivarName(name),
    },
    select: { id: true },
  });

  return cultivarReference.id;
}

function pad(value: number, length = 3) {
  return String(value).padStart(length, "0");
}

async function seed(dbUrl: string) {
  const db = new PrismaClient({
    datasources: { db: { url: dbUrl } },
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
        description: "Local dev profile for pagination testing",
        location: "Snohomish, WA",
      },
      create: {
        userId: user.id,
        title: "Seeded Daylily Farm",
        slug: PROFILE_SLUG,
        description: "Local dev profile for pagination testing",
        location: "Snohomish, WA",
      },
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

    const cultivarReferenceId = await upsertCultivarReference(
      db,
      ahs.id,
      ahs.name,
    );

    const listingIds: string[] = [];
    for (let i = 1; i <= LISTINGS_COUNT; i++) {
      const n = pad(i);
      const listing = await db.listing.create({
        data: {
          userId: user.id,
          title: `Dev Listing ${n}`,
          slug: `dev-listing-${n}`,
          description: `Seeded listing ${n} for local dev`,
          price: i % 2 === 0 ? 15 + (i % 10) : null,
        },
      });
      listingIds.push(listing.id);
    }

    await db.listing.create({
      data: {
        userId: user.id,
        title: ahs.name ?? "Coffee Frenzy",
        slug: "coffee-frenzy",
        price: 30,
        description: "Linked to AHS example.",
        status: "PUBLISHED",
        cultivarReferenceId,
      },
    });

    const listIds: string[] = [];
    for (let i = 1; i <= LISTS_COUNT; i++) {
      const n = pad(i);
      const list = await db.list.create({
        data: {
          userId: user.id,
          title: `Dev List ${n}`,
          description: `Seeded list ${n} for pagination`,
        },
      });
      listIds.push(list.id);
    }

    for (let i = 0; i < Math.min(5, listIds.length); i++) {
      const listId = listIds[i];
      const start = i * 3;
      const toConnect = listingIds.slice(start, start + 3);
      if (toConnect.length === 0) {
        continue;
      }
      await db.list.update({
        where: { id: listId },
        data: {
          listings: {
            connect: toConnect.map((id) => ({ id })),
          },
        },
      });
    }
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
  await seed(dbUrl);

  console.log("[seed-local-dev-db] Done.");
  console.log("[seed-local-dev-db] Database: " + dbPath);
  console.log("[seed-local-dev-db] Log in with: makon+clerk_test@hey.com");
  console.log("[seed-local-dev-db] Profile slug: " + PROFILE_SLUG);
  console.log(
    "[seed-local-dev-db] Listings: " + (LISTINGS_COUNT + 1) + ", Lists: " + LISTS_COUNT,
  );
}

main().catch((error) => {
  console.error("[seed-local-dev-db] Failed:", error);
  process.exitCode = 1;
});
