import path from "node:path";
import fs from "node:fs";
import dotenv from "dotenv";
import type { FullConfig } from "@playwright/test";
import { clerkSetup } from "@clerk/testing/playwright";

export default async function globalSetup(_config: FullConfig) {
  // Load env for Clerk keys
  dotenv.config({
    path: path.resolve(process.cwd(), ".env.development"),
    override: false,
  });
  if (
    !process.env.CLERK_PUBLISHABLE_KEY &&
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  ) {
    process.env.CLERK_PUBLISHABLE_KEY =
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  }

  // Always set up Clerk testing (independent of DB provisioning)
  await clerkSetup();

  // If BASE_URL is provided, we're attaching to an existing server/DB - skip local setup
  if (process.env.BASE_URL) return;

  // Write DB path for tests to read
  const url = process.env.LOCAL_DATABASE_URL;
  if (!url) {
    throw new Error("LOCAL_DATABASE_URL must be set by playwright.config.ts");
  }

  const filePath = url.replace(/^file:/, "");
  const metaDir = path.join(process.cwd(), "tests", ".tmp");
  fs.mkdirSync(metaDir, { recursive: true });
  fs.writeFileSync(path.join(metaDir, "e2e-db-path.txt"), filePath, "utf8");

  // Clear .next cache to ensure fresh build with test env
  fs.rmSync(path.join(process.cwd(), ".next", "cache"), { recursive: true, force: true });
}
