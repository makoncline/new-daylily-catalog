import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

const candidateDirectory = path.resolve(".tmp/search");
const preservedDirectory = path.resolve(
  `tests/.tmp/cultivar-url-search-${process.pid}`,
);
const candidatePath = path.join(
  candidateDirectory,
  "public-search-candidate.sqlite",
);
const db = new PrismaClient({
  adapter: new PrismaLibSql({ url: process.env.DATABASE_URL! }),
});
const queryPlaceholder =
  "Search names, hybridizers, colors, awards, or parentage…";
let savedFlags: Buffer | undefined;
let hadCandidate = false;
let candidatePrepared = false;
let errors: string[];
let failures: string[];

test.beforeEach(async ({ page }) => {
  errors = [];
  failures = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("response", (response) => {
    if (response.status() >= 400)
      failures.push(`${response.status()} ${new URL(response.url()).pathname}`);
  });
});

test.afterEach(async () => {
  expect(errors).toEqual([]);
  expect(failures).toEqual([]);
});

test.beforeAll(async () => {
  try {
    savedFlags = await fs.readFile(process.env.RUNTIME_FEATURE_FLAGS_PATH!);
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !("code" in error) ||
      error.code !== "ENOENT"
    )
      throw error;
  }
  await fs.writeFile(
    process.env.RUNTIME_FEATURE_FLAGS_PATH!,
    JSON.stringify({ publicCultivarSearch: true }),
  );
  hadCandidate = existsSync(candidateDirectory);
  if (hadCandidate) await fs.rename(candidateDirectory, preservedDirectory);
  candidatePrepared = true;
  for (let index = 0; index < 55; index++) {
    const id = `url-bloom-${String(index).padStart(2, "0")}`;
    await db.v2AhsCultivar.create({
      data: {
        id,
        post_title: `URL Bloom ${String(index).padStart(2, "0")}`,
        link_normalized_name: `url bloom ${String(index).padStart(2, "0")}`,
        primary_hybridizer_name: "Synthetic Garden",
        introduction_date: String(2000 + index),
        color: "Rose and gold",
        flower_form_names: index % 2 ? "Double" : "Single",
        ploidy_names: "Diploid",
        bloom_season_names: "Early",
        rebloom: 1,
      },
    });
    await db.cultivarReference.create({
      data: {
        id,
        v2AhsCultivarId: id,
        normalizedName: `url bloom ${String(index).padStart(2, "0")}`,
      },
    });
    await db.listing.create({
      data: {
        id,
        userId: "integration-user",
        cultivarReferenceId: id,
        title: `URL Bloom ${index}`,
        slug: id,
        status: "PUBLISHED",
        price: 10,
      },
    });
  }
  await promisify(execFile)(process.execPath, [
    "scripts/build-public-search-index.mjs",
    "--source",
    process.env.DATABASE_URL!,
    "--target",
    candidatePath,
  ]);
});

test.afterAll(async () => {
  try {
    await db.listing.deleteMany({
      where: { id: { startsWith: "url-bloom-" } },
    });
    await db.cultivarReference.deleteMany({
      where: { id: { startsWith: "url-bloom-" } },
    });
    await db.v2AhsCultivar.deleteMany({
      where: { id: { startsWith: "url-bloom-" } },
    });
  } finally {
    await db.$disconnect();
    if (candidatePrepared) {
      await fs.rm(candidateDirectory, { recursive: true, force: true });
      if (hadCandidate) await fs.rename(preservedDirectory, candidateDirectory);
    }
    if (savedFlags)
      await fs.writeFile(process.env.RUNTIME_FEATURE_FLAGS_PATH!, savedFlags);
    else await fs.rm(process.env.RUNTIME_FEATURE_FLAGS_PATH!, { force: true });
  }
});

async function capture(page: Page, name: string) {
  const directory = process.env.CULTIVAR_URL_EVIDENCE_DIR;
  if (!directory) return;
  await fs.mkdir(directory, { recursive: true });
  await page.mouse.move(0, 0);
  await page.screenshot({
    path: path.join(directory, `${name}.png`),
    fullPage: true,
    animations: "disabled",
  });
}

test("shared controls keep first values and canonicalize after mount and reload", async ({
  page,
  browser,
  baseURL,
}) => {
  const url =
    "/cultivars?advanced=false&form=Single%7CDouble%7CSingle&form=Spider&hasListings=0&hasCultivarPhoto=1&q=%20URL%20Bloom%20&q=ignored&sort=oldest&photosFirst=true&offset=48&unknown=x";
  const serverContext = await browser.newContext({
    baseURL,
    javaScriptEnabled: false,
  });
  const serverPage = await serverContext.newPage();
  await serverPage.goto(url);
  await expect(serverPage.getByPlaceholder(queryPlaceholder)).toHaveValue(
    " URL Bloom ",
  );
  await expect(
    serverPage.getByRole("switch", { name: "Advanced" }),
  ).toBeChecked();
  await expect(
    serverPage.getByRole("button", { name: "Name A–Z" }),
  ).toHaveAttribute("aria-pressed", "true");
  await serverContext.close();
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes("/api/v1/cultivars/search?") &&
        response.status() === 200,
    ),
    page.goto(url),
  ]);
  await expect(page.getByRole("status")).toContainText("24 shown");
  await expect(page.getByPlaceholder(queryPlaceholder)).toHaveValue(
    " URL Bloom ",
  );
  await expect(page.getByRole("switch", { name: "Advanced" })).toBeChecked();
  await expect(page.getByTestId("cultivar-filter-has-photo")).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await expect(page.getByRole("button", { name: "Name A–Z" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page).toHaveURL(
    /\/cultivars\?advanced=true&form=Double%7CSingle&q=URL\+Bloom$/,
  );
  await expect(
    page.getByRole("heading", { name: "URL Bloom 00", exact: true }),
  ).toBeVisible();
  await capture(page, "desktop-shared-advanced");
  await page.reload();
  await expect(page.getByPlaceholder(queryPlaceholder)).toHaveValue(
    "URL Bloom",
  );
  await expect(page.getByRole("status")).toContainText("24 shown");
  await page.getByRole("switch", { name: "Advanced" }).click();
  await expect(page).toHaveURL(/\?form=Double%7CSingle&q=URL\+Bloom$/);
  await expect(page.getByTestId("advanced-filter-cultivar-name")).toBeHidden();
  await page.getByRole("button", { name: "Newest introductions" }).click();
  await expect(page).toHaveURL(/sort=newest/);
  await page.getByTestId("cultivar-filter-has-photo").click();
  await expect(
    page.getByRole("heading", { name: "No cultivars found" }),
  ).toBeVisible();
  await page.getByTestId("cultivar-filter-has-photo").click();
  await expect(page.getByRole("status")).toContainText("24 shown");
});

test("Back restores result depth and anchor once; a shared URL starts at page one", async ({
  page,
  context,
}) => {
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes("/api/v1/cultivars/search?") &&
        response.status() === 200,
    ),
    page.goto("/cultivars?q=URL+Bloom"),
  ]);
  const entryId = await page.evaluate(
    () => window.history.state.cultivarSearchEntryId,
  );
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes("sort=newest") && response.status() === 200,
    ),
    page.getByRole("button", { name: "Newest introductions" }).click(),
  ]);
  expect(
    await page.evaluate(() => window.history.state.cultivarSearchEntryId),
  ).toBe(entryId);
  await expect(
    page.getByRole("heading", { name: "URL Bloom 54", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("status")).toContainText("24 shown");
  await page.getByRole("button", { name: "Load more cultivars" }).click();
  await expect(page.getByRole("status")).toContainText("48 shown");
  const card = page.locator("[data-cultivar-result-id]").nth(30);
  await card.scrollIntoViewIfNeeded();
  const anchorId = await card.getAttribute("data-cultivar-result-id");
  const top = await card.evaluate(
    (element) => element.getBoundingClientRect().top,
  );
  const sharedUrl = page.url();
  await capture(page, "desktop-loaded-results");
  await card.getByRole("link").click();
  await expect(page).toHaveURL(/\/cultivar\/url-bloom-/);
  await page.goBack();
  await expect(page.getByRole("status")).toContainText("48 shown");
  await expect(page.getByPlaceholder(queryPlaceholder)).toHaveValue(
    "URL Bloom",
  );
  expect(
    await page.evaluate(() => window.history.state.cultivarSearchEntryId),
  ).toBe(entryId);
  await expect
    .poll(async () =>
      page
        .locator(`[data-cultivar-result-id="${anchorId}"]`)
        .evaluate((element) => element.getBoundingClientRect().top),
    )
    .toBeCloseTo(top, 0);
  expect(
    await page.evaluate(() =>
      sessionStorage.getItem("cultivar-search:return-snapshot:v1"),
    ),
  ).toBeNull();
  const fresh = await context.newPage();
  await fresh.goto(sharedUrl);
  await expect(fresh.getByRole("status")).toContainText("24 shown");
  expect(new URL(fresh.url()).searchParams.has("offset")).toBe(false);
  await fresh.close();
  await page.goForward();
  await expect(page).toHaveURL(/\/cultivar\/url-bloom-/);
  await page.goBack();
  await expect(page.getByRole("status")).toContainText("24 shown");
});

test("mobile missing and empty controls preserve defaults", async ({
  page,
}) => {
  await page.setViewportSize({ width: 402, height: 874 });
  await page.goto("/cultivars");
  await expect(page.getByRole("status")).toContainText("24 shown");
  await expect(
    page.getByRole("switch", { name: "Advanced" }),
  ).not.toBeChecked();
  await capture(page, "mobile-default");
  await page.goto(
    "/cultivars?color=&hasListings=false&hasForSaleListings=true&rebloom=true&q=URL+Bloom",
  );
  await expect(page.getByRole("switch", { name: "Advanced" })).toBeChecked();
  await expect(page.getByRole("status")).toContainText("24 shown");
  await expect(page).toHaveURL(
    /advanced=true&hasForSaleListings=true&hasListings=false&q=URL\+Bloom&rebloom=true$/,
  );
  await expect(
    page.getByRole("heading", { name: "URL Bloom 00", exact: true }),
  ).toBeVisible();
  await capture(page, "mobile-shared-advanced");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(page).toHaveURL(/\/cultivars$/);
  await expect(page.getByRole("status")).toContainText("24 shown");
});
