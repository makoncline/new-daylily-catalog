import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
// @ts-ignore Node's native type stripping requires the explicit .ts extension.
import { resetHermeticData } from "../src/lib/hermetic/seed.ts";
import { validateHermeticRuntime } from "../src/lib/hermetic/runtime.js";

const databaseUrl = process.env.DATABASE_URL;
validateHermeticRuntime({
  nodeEnv: process.env.NODE_ENV,
  databaseUrl,
  appBaseUrl: process.env.APP_BASE_URL,
  clerkSecretKey: process.env.CLERK_SECRET_KEY,
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  appRoot: process.cwd(),
});

if (!databaseUrl) throw new Error("DATABASE_URL is required.");

const db = new PrismaClient({
  adapter: new PrismaLibSql(
    { url: databaseUrl },
    { timestampFormat: "unixepoch-ms" },
  ),
});

async function seed() {
  await resetHermeticData(db);
  console.log("[hermetic] Reset deterministic local personas and catalogs.");
}

seed()
  .finally(() => db.$disconnect())
  .catch((error) => {
    console.error("[hermetic] Failed to seed local data:", error);
    process.exitCode = 1;
  });
