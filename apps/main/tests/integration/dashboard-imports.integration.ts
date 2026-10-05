import path from "node:path";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { promisify } from "node:util";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";
import type { Page } from "@playwright/test";
import readXlsxFile from "read-excel-file/node";
import { expect, test as base } from "./fixtures";

const db = new PrismaClient({
  adapter: new PrismaLibSql(
    { url: process.env.DATABASE_URL! },
    { timestampFormat: "unixepoch-ms" },
  ),
});
const test = base.extend<{ importDiagnostics: void }>({
  importDiagnostics: [
    async ({ page }, use, info) => {
      const errors: string[] = [];
      const consoleErrors: string[] = [];
      const failedRequests: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });
      page.on("requestfailed", (request) =>
        failedRequests.push(
          `${new URL(request.url()).pathname}: ${request.failure()?.errorText}`,
        ),
      );
      await use();
      const directory = process.env.IMPORTS_EVIDENCE_DIR;
      if (directory) {
        await mkdir(directory, { recursive: true });
        await writeFile(
          path.join(
            directory,
            `${info.title.replaceAll(/[^a-zA-Z0-9]+/g, "-")}-diagnostics.json`,
          ),
          JSON.stringify(
            {
              browser: page.context().browser()?.version(),
              errors,
              consoleErrors,
              failedRequests,
            },
            null,
            2,
          ),
        );
      }
      expect(errors, "uncaught browser errors").toEqual([]);
    },
    { auto: true },
  ],
});

async function subscription(active: boolean) {
  await db.keyValue.update({
    where: { key: "stripe:customer:cus_integration_seller" },
    data: {
      value: JSON.stringify({
        status: active ? "active" : "canceled",
        subscriptionId: "sub_integration_seller",
        priceId: "price_integration",
        cancelAtPeriodEnd: false,
      }),
    },
  });
}
test.beforeEach(async ({ page }) => {
  page.setDefaultTimeout(15_000);
  await page.route("**/api/catalog-importer/viewer-state", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ viewerState: "pro" }),
    }),
  );
  await subscription(true);
  await db.listing.deleteMany({ where: { importKey: { not: null } } });
  await db.cultivarReference.deleteMany({
    where: { id: { startsWith: "imports-ref-" } },
  });
  await db.cultivarReference.createMany({
    data: Array.from({ length: 105 }, (_, i) => ({
      id: `imports-ref-${i + 1}`,
      normalizedName: `reference bloom ${i + 1}`,
    })),
  });
});
test.afterAll(async () => db.$disconnect());

async function capture(page: Page, name: string) {
  const directory = process.env.IMPORTS_EVIDENCE_DIR;
  if (!directory) return;
  await mkdir(directory, { recursive: true });
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await page.mouse.move(10, 10);
  await page.screenshot({
    path: path.join(directory, `${name}.png`),
    animations: "disabled",
    fullPage: (await page.getByRole("alertdialog").count()) === 0,
  });
}
async function prepare(page: Page, count = 3, extra: string[] = []) {
  await page.route("**/api/v1/cultivars/match", async (route) => {
    const { names } = route.request().postDataJSON() as { names: string[] };
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        results: names.map((name) => {
          const needsReview = name === "Unreviewed Bloom";
          const candidate = {
            cultivarReferenceId:
              name === "Existing Bloom"
                ? "integration-cultivar-reference"
                : `imports-ref-${name.match(/\d+/)?.[0] ?? "1"}`,
            displayName: name,
            normalizedName: name.toLowerCase(),
            confidence: needsReview ? 85 : 100,
            hybridizer: "Reference Garden",
            year: 2026,
            color: "Rose",
            bloomSizeIn: 5,
            scapeHeightIn: 24,
            bloomSeason: "Midseason",
            form: "Single",
            ploidy: "Diploid",
            rebloom: false,
            listingCount: 0,
            imageUrl: null,
            imageAsset: null,
          };
          return {
            inputName: name,
            normalizedInput: name.toLowerCase(),
            exactMatch: needsReview ? null : candidate,
            candidates: [candidate],
          };
        }),
      }),
    });
  });
  await page.goto("/dashboard/imports");
  await expect(
    page.getByRole("link", { name: "Build import", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Build import", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "Turn the catalog you already have into one buyers can browse",
    }),
  ).toBeVisible();
  const csv = [
    "name,price,description,private note",
    ...Array.from(
      { length: count },
      (_, i) =>
        `Reference Bloom ${i + 1},${15 + i}.00,Reference description ${i + 1},Reference note ${i + 1}`,
    ),
    ...extra,
  ].join("\n");
  await page.locator('input[type="file"]').setInputFiles({
    name: "reference-import.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csv),
  });
  await page
    .getByRole("button", { name: "Build catalog preview", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your catalog preview", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Finish", exact: true }).click();
  await page
    .getByRole("link", { name: "Continue to import", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Import catalog", exact: true }),
  ).toBeVisible();
}
async function pinned(
  page: Page,
  region = page.locator('[data-slot="dashboard-import-scroll-area"]'),
) {
  const middle = region.locator('[data-slot="data-table-scrollable"] > div');
  const left = region.locator('[data-slot="data-table-pinned-left"]');
  await page
    .locator("[data-collapsible][data-side]")
    .evaluateAll(async (sidebars) => {
      await document.fonts.ready;
      for (const sidebar of sidebars) {
        sidebar.getBoundingClientRect();
        await Promise.all(
          sidebar
            .getAnimations({ subtree: true })
            .map((animation) => animation.finished),
        );
      }
    });
  // Measure one scroll after the sidebar has reached its final width.
  const position = await region.evaluate((element) => {
    const pinned = element.querySelector<HTMLElement>(
      '[data-slot="data-table-pinned-left"]',
    );
    const scrollable = element.querySelector<HTMLElement>(
      '[data-slot="data-table-scrollable"] > div',
    );
    if (!pinned || !scrollable) throw new Error("Pinned table was not found");

    const before = pinned.getBoundingClientRect().x;
    scrollable.scrollLeft = scrollable.scrollWidth;
    return { before, after: pinned.getBoundingClientRect().x };
  });
  expect(position.after).toBe(position.before);
  await expect(left.locator("th").filter({ hasText: /^Name$/ })).toBeVisible();
  expect(
    await middle.evaluate((element) => element.scrollLeft),
  ).toBeGreaterThan(0);
  const width = await page.evaluate(() => [
    document.documentElement.scrollWidth,
    document.documentElement.clientWidth,
  ]);
  expect(width[0]).toBeLessThanOrEqual(width[1]!);
}

for (const [device, viewport] of [
  ["desktop", { width: 1024, height: 1000 }],
  ["mobile", { width: 402, height: 874 }],
] as const) {
  test(`prepared import writes, batches and persists on ${device}`, async ({
    page,
  }) => {
    test.setTimeout(150_000);
    await page.setViewportSize(viewport);
    await page.goto("/dashboard/imports");
    await expect(
      page.getByRole("link", { name: "Build import", exact: true }),
    ).toBeVisible();
    await capture(page, `${device}-empty`);
    await prepare(page, 105);
    await expect(
      page.getByRole("heading", { name: "105 listings are ready to import" }),
    ).toBeVisible();
    if (device === "desktop")
      await page
        .getByRole("button", { name: "Toggle Sidebar", exact: true })
        .click();
    await capture(page, `${device}-ready`);
    await pinned(page);
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "105 listings are ready to import" }),
    ).toBeVisible();
    await expect(
      page.getByRole("checkbox", {
        name: "Include Reference Bloom 1",
        exact: true,
      }),
    ).toBeChecked();
    const scroll = page.locator('[data-slot="dashboard-import-scroll-area"]');
    await scroll.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    await page.getByRole("button", { name: "Show 5 more" }).click();
    await expect(
      page.getByRole("checkbox", {
        name: "Include Reference Bloom 105",
        exact: true,
      }),
    ).toBeDisabled();
    await page.getByRole("button", { name: "Return to top" }).click();
    expect(await scroll.evaluate((element) => element.scrollTop)).toBe(0);
    await page
      .getByRole("checkbox", { name: "Include Reference Bloom 1", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Import 99 listings" }),
    ).toBeEnabled();
    await page
      .getByRole("checkbox", { name: "Include Reference Bloom 1", exact: true })
      .click();
    const button = page.getByRole("button", {
      name: "Import 100 listings",
      exact: true,
    });
    await button.click();
    await expect(
      page.getByRole("button", { name: "Cancel", exact: true }),
    ).toBeFocused();
    await capture(page, `${device}-confirm`);
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    // Final source must return focus to the confirmation trigger.
    await expect(button).toBeFocused();
    let fail = true;
    let requests = 0;
    let releaseWrite!: () => void;
    const heldWrite = new Promise<void>((resolve) => {
      releaseWrite = resolve;
    });
    let writeStarted!: () => void;
    const writeReady = new Promise<void>((resolve) => {
      writeStarted = resolve;
    });
    let rejectRefresh = false;
    const successfulWrite: { request?: { url: string; body: string } } = {};
    await page.route(
      "**/api/trpc/dashboardDb.bootstrap.roots**",
      async (route) => {
        if (!rejectRefresh) {
          await route.continue();
          return;
        }
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify([
            {
              error: {
                json: {
                  message: "Injected refresh failure",
                  code: -32603,
                  data: { code: "INTERNAL_SERVER_ERROR", httpStatus: 500 },
                },
              },
            },
          ]),
        });
      },
    );
    await page.route(
      "**/api/trpc/dashboardDb.listing.importRows**",
      async (route) => {
        requests++;
        if (fail) {
          fail = false;
          await route.fulfill({
            status: 500,
            contentType: "application/json",
            body: JSON.stringify({
              error: {
                json: {
                  message: "Injected rejected write",
                  code: -32603,
                  data: { code: "INTERNAL_SERVER_ERROR", httpStatus: 500 },
                },
              },
            }),
          });
        } else {
          successfulWrite.request = {
            url: route.request().url(),
            body: route.request().postData()!,
          };
          writeStarted();
          await heldWrite;
          const response = await route.fetch();
          rejectRefresh = requests === 2;
          await route.fulfill({ response });
        }
      },
    );
    await button.click();
    await page
      .getByRole("button", { name: "Import listings", exact: true })
      .click();
    await expect(
      page.getByText("Import did not finish", { exact: true }),
    ).toBeVisible();
    expect(
      await db.listing.count({ where: { importKey: { not: null } } }),
    ).toBe(0);
    await capture(page, `${device}-failed-write`);
    await button.click();
    await page
      .getByRole("button", { name: "Import listings", exact: true })
      .click();
    await writeReady;
    await expect(
      page.getByRole("checkbox", {
        name: "Select up to 100 visible listings",
        exact: true,
      }),
    ).toBeDisabled();
    await expect(
      page.getByRole("checkbox", {
        name: "Include Reference Bloom 1",
        exact: true,
      }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Start over", exact: true }),
    ).toBeDisabled();
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
    expect(requests).toBe(2);
    expect(
      await db.listing.count({ where: { importKey: { not: null } } }),
    ).toBe(0);
    releaseWrite();
    await expect(
      page.getByRole("heading", { name: "5 listings remain", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Listings were saved. Dashboard refresh did not finish.", {
        exact: true,
      }),
    ).toBeVisible();
    await capture(page, `${device}-refresh-failed-after-write`);
    await expect(
      page.getByText("Import did not finish", { exact: true }),
    ).toHaveCount(0);
    rejectRefresh = false;
    await page
      .getByRole("button", { name: "Retry refresh", exact: true })
      .click();
    await expect(
      page.getByText("Listings were saved. Dashboard refresh did not finish.", {
        exact: true,
      }),
    ).toHaveCount(0);
    expect(requests).toBe(2);
    expect(
      await db.listing.count({ where: { importKey: { not: null } } }),
    ).toBe(100);
    await capture(page, `${device}-next-batch`);
    if (!successfulWrite.request)
      throw Error("Successful write request was not captured");
    const replay = await page.request.post(successfulWrite.request.url, {
      headers: { "content-type": "application/json" },
      data: successfulWrite.request.body,
    });
    expect(replay.ok()).toBe(true);
    expect(JSON.stringify(await replay.json())).toContain('"createdCount":0');
    expect(
      await db.listing.count({ where: { importKey: { not: null } } }),
    ).toBe(100);
    await page
      .getByRole("button", { name: "Import 5 listings", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Import listings", exact: true })
      .click();
    await expect(
      page.getByRole("heading", {
        name: "All ready listings are in your catalog",
        exact: true,
      }),
    ).toBeVisible();
    await capture(page, `${device}-complete`);
    const saved = await db.listing.findMany({
      where: { importKey: { not: null } },
      orderBy: { title: "asc" },
    });
    expect(saved).toHaveLength(105);
    expect(new Set(saved.map((row) => row.importKey)).size).toBe(105);
    expect(
      saved.find((row) => row.title === "Reference Bloom 1"),
    ).toMatchObject({
      price: 15,
      description: "Reference description 1",
      privateNote: "Reference note 1",
      cultivarReferenceId: "imports-ref-1",
    });
    await page.reload();
    await expect(
      page.getByText("105 listings are in your catalog", { exact: true }),
    ).toBeVisible();
    const [reopened] = await Promise.all([
      page.waitForEvent("popup"),
      page
        .getByRole("link", { name: "Reference Bloom 1", exact: true })
        .click(),
    ]);
    const editor = reopened.getByRole("region", {
      name: "Edit listing",
      exact: true,
    });
    await expect(editor.getByLabel("Name", { exact: true })).toHaveValue(
      "Reference Bloom 1",
    );
    await expect(editor.getByLabel("Description", { exact: true })).toHaveValue(
      "Reference description 1",
    );
    await expect(editor.getByLabel("Price", { exact: true })).toHaveValue("15");
    await expect(
      editor.getByLabel("Private Notes", { exact: true }),
    ).toHaveValue("Reference note 1");
    await reopened.reload();
    await expect(editor.getByLabel("Name", { exact: true })).toHaveValue(
      "Reference Bloom 1",
    );
    await reopened.close();
    await page.getByRole("button", { name: "Start over", exact: true }).click();
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(
      page.getByText("105 listings are in your catalog", { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Start over", exact: true }).click();
    await capture(page, `${device}-start-over`);
    await page
      .getByRole("button", { name: "Discard import", exact: true })
      .click();
    await expect(
      page.getByRole("link", { name: "Build import", exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("link", { name: "Build import", exact: true }),
    ).toBeVisible();
    expect(
      await db.listing.count({ where: { importKey: { not: null } } }),
    ).toBe(105);
  });
}

test("excluded source context, builder return and non-Pro downloads", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await prepare(page, 3, [
    "Unreviewed Bloom,22,Review description,Review note",
    "Reference Bloom 4,trade,Invalid price,Source note",
    "Existing Bloom,20,Incoming description,Incoming note",
  ]);
  await expect(
    page.getByText("1 listing has not been reviewed", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("1 listing has an unresolved issue", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("1 listing is in your catalog", { exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 1024, height: 1000 });
  await page
    .getByRole("button", { name: "Toggle Sidebar", exact: true })
    .click();
  await capture(page, "desktop-excluded");
  const issue = page.getByRole("region", {
    name: "1 listing has an unresolved issue",
    exact: true,
  });
  await expect(issue.getByText("trade", { exact: true })).toHaveAttribute(
    "data-issue-highlight",
    "true",
  );
  await pinned(page, issue);
  await page.setViewportSize({ width: 402, height: 874 });
  await capture(page, "mobile-excluded");
  await pinned(page, issue);
  await page
    .getByRole("link", { name: "Return to import builder", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your catalog preview", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Finish", exact: true }).click();
  await page
    .getByRole("link", { name: "Continue to import", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "3 listings are ready to import",
      exact: true,
    }),
  ).toBeVisible();
  await subscription(false);
  await page.evaluate(() =>
    localStorage.removeItem("stripe-subscription:1:user_integration_seller"),
  );
  await page.reload();
  await expect(page.getByText("Pro required", { exact: true })).toBeVisible();
  await capture(page, "mobile-non-pro");
  await page.setViewportSize({ width: 1024, height: 1000 });
  await capture(page, "desktop-non-pro");
  await page.evaluate(() => {
    const createObjectURL = URL.createObjectURL;
    URL.createObjectURL = () => {
      URL.createObjectURL = createObjectURL;
      throw new Error("Injected download failure");
    };
  });
  await page
    .getByRole("button", { name: "Download prepared import file", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Download anyway", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Spreadsheet download did not finish",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByText(/Injected download failure/)).toBeVisible();
  for (const name of [
    "Download prepared import file",
    "Download enhanced original",
  ]) {
    await page.getByRole("button", { name, exact: true }).click();
    await expect(
      page.getByRole("heading", {
        name: "Download before review is complete?",
        exact: true,
      }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await page.getByRole("button", { name, exact: true }).click();
    const download = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Download anyway", exact: true })
      .click();
    const file = await download;
    expect(await file.failure()).toBeNull();
    const filePath = (await file.path())!;
    const content = await readFile(filePath);
    if (file.suggestedFilename().endsWith(".xlsx")) {
      const rows = await readXlsxFile(filePath);
      expect(JSON.stringify(rows)).toContain("Reference Bloom 1");
      expect(JSON.stringify(rows)).toContain("Reference description 1");
    } else {
      expect(content.toString()).toContain("Reference Bloom 1");
      expect(content.toString()).toContain("Reference description 1");
    }
  }
  await expect(
    page.getByRole("heading", {
      name: "Spreadsheet download did not finish",
      exact: true,
    }),
  ).toHaveCount(0);
  expect(await db.listing.count({ where: { importKey: { not: null } } })).toBe(
    0,
  );
});

test("existing catalog retry and builder exclusions keep the source rows", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1024, height: 1000 });
  await prepare(page, 3, [
    "Unreviewed Bloom,22,Review description,Review note",
  ]);
  let releaseCheck!: () => void;
  const heldCheck = new Promise<void>((resolve) => {
    releaseCheck = resolve;
  });
  let failCheck = true;
  await page.route("**/api/trpc/dashboardDb.listing.list**", async (route) => {
    await heldCheck;
    if (!failCheck) {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({
        error: {
          json: {
            message: "Injected catalog check failure",
            code: -32603,
            data: { code: "INTERNAL_SERVER_ERROR", httpStatus: 500 },
          },
        },
      }),
    });
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(
    page.getByText("Checking your existing catalog…", { exact: true }),
  ).toBeVisible();
  await capture(page, "desktop-catalog-check-loading-after-only");
  releaseCheck();
  await expect(
    page.getByText("Your existing catalog could not be checked", {
      exact: true,
    }),
  ).toBeVisible({ timeout: 20_000 });
  await capture(page, "desktop-catalog-check-failed-after-only");
  await expect(
    page.getByRole("button", { name: "Import 3 listings", exact: true }),
  ).toHaveCount(0);
  failCheck = false;
  await page.getByRole("button", { name: "Retry check", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "3 listings are ready to import",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Return to import builder", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your catalog preview", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Review 0/1", exact: true }).click();
  await page
    .getByRole("button", { name: "Exclude from catalog", exact: true })
    .click();
  await page.getByRole("button", { name: "Finish", exact: true }).click();
  await page
    .getByRole("link", { name: "Continue to import", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "3 listings are ready to import",
      exact: true,
    }),
  ).toBeVisible();
  await page.reload();
  const excluded = page.getByRole("region", {
    name: "1 listing was excluded in the builder",
    exact: true,
  });
  await expect(
    excluded.getByText("Unreviewed Bloom", { exact: true }),
  ).toBeVisible();
  await expect(
    excluded.getByText("Review description", { exact: true }),
  ).toBeVisible();
  await expect(
    excluded.getByText("Review note", { exact: true }),
  ).toBeVisible();
  await expect(
    excluded.getByText("Excluded in the import builder", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Toggle Sidebar", exact: true })
    .click();
  await capture(page, "desktop-builder-excluded-after-only");
  await pinned(page, excluded);
  await page.setViewportSize({ width: 402, height: 874 });
  await capture(page, "mobile-builder-excluded-after-only");
  await pinned(page, excluded);
  expect(await db.listing.count({ where: { importKey: { not: null } } })).toBe(
    0,
  );
});

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}

test("public preparation restores an interrupted match and clear rejects its late result", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const candidateDirectory = path.resolve(".tmp/search");
  const preservedDirectory = path.resolve(
    `tests/.tmp/imports-search-${process.pid}`,
  );
  const hadCandidate = existsSync(candidateDirectory);
  if (hadCandidate) await rename(candidateDirectory, preservedDirectory);
  const attempts = [0, 1, 2].map(() => ({
    started: deferred(),
    held: deferred(),
    finished: deferred(),
  }));
  try {
    await promisify(execFile)(process.execPath, [
      "scripts/build-public-search-index.mjs",
      "--source",
      process.env.DATABASE_URL!,
      "--target",
      path.join(candidateDirectory, "public-search-candidate.sqlite"),
    ]);
    await page.goto("/catalog-importer");
    await page.locator('input[type="file"]').setInputFiles({
      name: "interrupted.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(
        "name,price,description,private note\nIntegration Bloom,15,Rose flower,West bed",
      ),
    });
    await capture(page, "public-mapping");
    let requestIndex = 0;
    await page.route("**/api/v1/cultivars/match", async (route) => {
      const attempt = attempts[requestIndex++]!;
      try {
        const response = await route.fetch();
        expect(response.ok()).toBe(true);
        const payload = (await response.json()) as {
          results: Array<{
            exactMatch: { cultivarReferenceId: string } | null;
          }>;
        };
        expect(payload.results[0]?.exactMatch?.cultivarReferenceId).toBe(
          "integration-cultivar-reference",
        );
        attempt.started.resolve();
        await attempt.held.promise;
        await route.fulfill({ response });
      } finally {
        attempt.finished.resolve();
      }
    });
    await page
      .getByRole("button", { name: "Build catalog preview", exact: true })
      .click();
    await attempts[0]!.started.promise;
    await page.reload();
    attempts[0]!.held.resolve();
    await attempts[0]!.finished.promise;
    await expect(
      page.getByRole("heading", { name: "Map your columns", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("interrupted.csv", { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Build catalog preview", exact: true })
      .click();
    await attempts[1]!.started.promise;
    const oldDocument = await page.locator("html").elementHandle();
    const oldMapping = await page
      .getByRole("heading", { name: "Map your columns", exact: true })
      .elementHandle();
    await page
      .getByRole("contentinfo")
      .getByRole("link", { name: "Privacy", exact: true })
      .click();
    await expect(page).toHaveURL("/privacy");
    expect(await oldMapping!.evaluate((element) => element.isConnected)).toBe(
      false,
    );
    await page.goBack();
    await expect(
      page.getByRole("heading", { name: "Map your columns", exact: true }),
    ).toBeVisible();
    expect(
      await oldDocument!.evaluate(
        (element) => element === document.documentElement,
      ),
    ).toBe(true);
    const returnedMapping = await page
      .getByRole("heading", { name: "Map your columns", exact: true })
      .elementHandle();
    expect(
      await oldMapping!.evaluate(
        (element, returned) => element === returned,
        returnedMapping,
      ),
    ).toBe(false);
    await page.getByRole("button", { name: "Start", exact: true }).click();
    await page
      .getByRole("button", { name: "Clear local progress", exact: true })
      .click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Clear local progress", exact: true })
      .click();
    await page.locator('input[type="file"]').setInputFiles({
      name: "replacement.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("name,price\nIntegration Bloom,27"),
    });
    await expect(
      page.getByText("replacement.csv", { exact: true }),
    ).toBeVisible();
    attempts[1]!.held.resolve();
    await attempts[1]!.finished.promise;
    await page.reload();
    await expect(
      page.getByText("replacement.csv", { exact: true }),
    ).toBeVisible();
    await capture(page, "public-remount-replacement");
    await page
      .getByRole("button", { name: "Build catalog preview", exact: true })
      .click();
    await attempts[2]!.started.promise;
    await page.getByRole("button", { name: "Start", exact: true }).click();
    await page
      .getByRole("button", { name: "Clear local progress", exact: true })
      .click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Clear local progress", exact: true })
      .click();
    attempts[2]!.held.resolve();
    await attempts[2]!.finished.promise;
    await expect(
      page.getByText("Drop a spreadsheet here, or choose a file", {
        exact: true,
      }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByText("Drop a spreadsheet here, or choose a file", {
        exact: true,
      }),
    ).toBeVisible();
    await page.goto("/dashboard/imports");
    await expect(
      page.getByRole("link", { name: "Build import", exact: true }),
    ).toBeVisible();
    expect(
      await db.listing.count({ where: { importKey: { not: null } } }),
    ).toBe(0);
  } finally {
    for (const attempt of attempts) attempt.held.resolve();
    await page.unrouteAll({ behavior: "wait" });
    await rm(candidateDirectory, { recursive: true, force: true });
    if (hadCandidate) await rename(preservedDirectory, candidateDirectory);
  }
});
