import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import type { Page } from "@playwright/test";

export async function installPlaygroundSearchFixture() {
  const searchDirectory = process.env.INTEGRATION_SEARCH_DIRECTORY;
  if (!searchDirectory)
    throw new Error(
      "Use run-integration-local.mjs to install the search fixture.",
    );
  const candidatePath = path.join(
    searchDirectory,
    "public-search-candidate.sqlite",
  );
  const flagsPath = process.env.RUNTIME_FEATURE_FLAGS_PATH!;
  const flags = await fs.readFile(flagsPath).catch(() => undefined);

  async function restore() {
    await fs.rm(path.dirname(candidatePath), { recursive: true, force: true });
    if (flags) await fs.writeFile(flagsPath, flags);
    else await fs.rm(flagsPath, { force: true });
  }

  try {
    await fs.writeFile(
      flagsPath,
      JSON.stringify({ publicCultivarSearch: true }),
    );
    await promisify(execFile)(process.execPath, [
      "scripts/build-public-search-index.mjs",
      "--source",
      process.env.DATABASE_URL!,
      "--target",
      candidatePath,
    ]);
  } catch (error) {
    await restore();
    throw error;
  }
  return restore;
}

export async function checkPlaygroundCsv(page: Page, csv: string) {
  const input = page.getByRole("region", { name: "Add flowers", exact: true });
  await input.getByRole("tab", { name: "Spreadsheet", exact: true }).click();
  await input.locator('input[type="file"]').setInputFiles({
    name: "source.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csv),
  });
  await input.getByRole("button", { name: "Check names", exact: true }).click();
}

export async function downloadPlaygroundWorkbook(page: Page) {
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download spreadsheet", exact: true })
    .click();
  const file = await download;
  return {
    name: file.suggestedFilename(),
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: await fs.readFile(await file.path()),
  };
}
