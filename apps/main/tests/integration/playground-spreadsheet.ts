import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import type { Page } from "@playwright/test";

export async function installPlaygroundSearchFixture() {
  const flagsPath = process.env.RUNTIME_FEATURE_FLAGS_PATH!;
  const flags = await fs.readFile(flagsPath).catch(() => undefined);
  const searchDirectory = path.resolve(".tmp/search");
  const savedSearchDirectory = `${searchDirectory}-input-test-${process.pid}`;
  const hadSearch = await fs.stat(searchDirectory).then(
    () => true,
    () => false,
  );
  if (hadSearch) await fs.rename(searchDirectory, savedSearchDirectory);

  async function restore() {
    await fs.rm(searchDirectory, { recursive: true, force: true });
    if (hadSearch) await fs.rename(savedSearchDirectory, searchDirectory);
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
      path.join(searchDirectory, "public-search-candidate.sqlite"),
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
