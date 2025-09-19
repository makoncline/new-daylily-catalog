import path from "node:path";
import fs from "node:fs";
import dotenv from "dotenv";
import type { FullConfig } from "@playwright/test";
import { clerkSetup } from "@clerk/testing/playwright";
import {
  createTempSqliteUrl,
  prepareDbFromTemplate,
  ensureLocalTempDbSafety,
  clearDb,
} from "../src/lib/test-utils/e2e-db";

export default async function globalSetup(_config: FullConfig) {
  // If BASE_URL is provided, we're attaching to an existing server/DB. Skip temp DB.
  if (process.env.BASE_URL) return;

  // Load dev env for Clerk keys if available
  dotenv.config({ path: path.resolve(process.cwd(), ".env.development"), override: false });
  // Map publishable key name for Clerk testing helper
  if (!process.env.CLERK_PUBLISHABLE_KEY && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    process.env.CLERK_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  }
  // Prepare Clerk testing token & FAPI for Playwright helpers
  // Requires CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY
  await clerkSetup();

  // Mark this run explicitly as local e2e so helpers may enforce guards
  process.env.PLAYWRIGHT_LOCAL_E2E = "true";
  process.env.USE_TURSO_DB = "false";
  process.env.SKIP_ENV_VALIDATION = "1";

  // Use DB location provided by Playwright config; otherwise create one
  let url = process.env.LOCAL_DATABASE_URL;
  let filePath = url ? url.replace(/^file:/, "") : undefined;
  if (!url || !filePath) {
    const created = createTempSqliteUrl();
    url = created.url;
    filePath = created.filePath;
    process.env.LOCAL_DATABASE_URL = url;
  }

  // Ensure DB file exists with schema cloned from dev template (we'll clear data next)
  prepareDbFromTemplate(filePath);

  // Persist the path for teardown (globalTeardown runs in a fresh process)
  const metaDir = path.join(process.cwd(), "tests", ".tmp");
  fs.mkdirSync(metaDir, { recursive: true });
  const metaFile = path.join(metaDir, "e2e-db-path.txt");
  fs.writeFileSync(metaFile, filePath!, "utf8");

  // Final safety verification and ensure the DB is empty by default
  ensureLocalTempDbSafety();
  await clearDb();

  // Bust Next.js persistent cache to avoid stale unstable_cache results between runs
  try {
    const nextCacheDir = path.join(process.cwd(), ".next", "cache");
    fs.rmSync(nextCacheDir, { recursive: true, force: true });
  } catch {}
}
