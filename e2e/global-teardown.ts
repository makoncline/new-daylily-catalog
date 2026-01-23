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
    dbPath = fs.readFileSync(metaFile, "utf8").trim();
  } catch {
    return; // Nothing to clean - meta file doesn't exist
  }

  if (process.env.KEEP_E2E_DB === "1") return;

  // Clean up temp DB file
  if (dbPath && fs.existsSync(dbPath)) {
    try {
      fs.unlinkSync(dbPath);
    } catch (err) {
      console.warn(`[e2e teardown] Could not delete temp DB: ${dbPath}`, err);
    }
  }

  // Clean up meta file
  try {
    fs.unlinkSync(metaFile);
  } catch (err) {
    console.warn(`[e2e teardown] Could not delete meta file: ${metaFile}`, err);
  }
}
