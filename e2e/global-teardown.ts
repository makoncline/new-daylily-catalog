import fs from "node:fs";
import path from "node:path";
import type { FullConfig } from "@playwright/test";

export default async function globalTeardown(_config: FullConfig) {
  // Skip if we were running against a remote BASE_URL
  if (process.env.BASE_URL) return;

  // Read the temp DB file path written by global-setup
  const metaFile = path.join(process.cwd(), "tests", ".tmp", "e2e-db-path.txt");
  let dbPath = "";
  try {
    dbPath = fs.readFileSync(metaFile, "utf8");
  } catch {
    return; // Nothing to clean
  }

  if (process.env.KEEP_E2E_DB === "1") return;

  try {
    if (dbPath && fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
  } catch {
    // ignore
  }
  try {
    fs.unlinkSync(metaFile);
  } catch {
    // ignore
  }
}

