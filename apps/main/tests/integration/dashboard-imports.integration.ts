import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
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
    data: Array.from({ length: 350 }, (_, i) => ({
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
async function prepare(
  page: Page,
  count = 3,
  extra: string[] = [],
  failLaterChunk = false,
) {
  let failed = false;
  await page.route("**/api/v1/cultivars/match", async (route) => {
    const { names, cultivarReferenceIds } = route.request().postDataJSON() as {
      names: string[];
      cultivarReferenceIds?: (string | null)[];
    };
    expect(names.length).toBeLessThanOrEqual(250);
    if (failLaterChunk && !failed && names[0] === "Reference Bloom 251") {
      failed = true;
      await route.fulfill({
        status: 503,
        json: { error: "Injected later chunk failure" },
      });
      return;
    }
    await route.fulfill({
      json: {
        results: names.map((name, index) => {
          const candidate = {
            cultivarReferenceId:
              cultivarReferenceIds?.[index] ??
              `imports-ref-${/\d+/.exec(name)?.[0] ?? "1"}`,
            displayName: name,
            normalizedName: name.toLowerCase(),
            confidence: 100,
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
            inputCultivarReferenceId: cultivarReferenceIds?.[index],
            normalizedInput: name.toLowerCase(),
            exactMatch: candidate,
            candidates: [candidate],
          };
        }),
      },
    });
  });
  await page.goto("/dashboard/imports");
  await page
    .getByRole("link", { name: "Import a spreadsheet or list", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Daylily Catalog Playground",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Spreadsheet", exact: true }).click();
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
  await page.getByRole("button", { name: "Check names", exact: true }).click();
  if (failLaterChunk) {
    await expect(
      page.getByText("Injected later chunk failure", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("reference-import.csv", { exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(() =>
        localStorage.getItem("daylily-catalog:temp-list"),
      ),
    ).toBeNull();
    await page
      .getByRole("button", { name: "Check names", exact: true })
      .click();
  }
  await page.getByRole("button", { name: "Add ready", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: `Your catalog (${count + extra.length})`,
      exact: true,
    }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", {
      name: `Your catalog (${count + extra.length})`,
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Save to my catalog", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: `${count + extra.length} ready to import`,
      exact: true,
    }),
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
  const horizontal = await middle.evaluate((element) => ({
    left: element.scrollLeft,
    maximum: element.scrollWidth - element.clientWidth,
  }));
  expect(horizontal.left).toBe(horizontal.maximum);
  const width = await page.evaluate(() => [
    document.documentElement.scrollWidth,
    document.documentElement.clientWidth,
  ]);
  expect(width[0]).toBeLessThanOrEqual(width[1]!);
}

for (const [device, viewport, count] of [
  ["desktop", { width: 1440, height: 1000 }, 350],
  ["mobile", { width: 390, height: 844 }, 105],
] as const) {
  test(`prepared import writes, batches and persists on ${device}`, async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await page.setViewportSize(viewport);
    await prepare(page, count, [], device === "desktop");
    await capture(page, `${device}-ready`);
    await pinned(page);
    await page.reload();
    await expect(
      page.getByRole("heading", {
        name: `${count} ready to import`,
        exact: true,
      }),
    ).toBeVisible();
    const firstRow = page.getByRole("checkbox", {
      name: "Include Reference Bloom 1",
      exact: true,
    });
    await expect(firstRow).toBeChecked();
    await firstRow.click();
    await expect(
      page.getByRole("button", { name: "Import 99 listings", exact: true }),
    ).toBeEnabled();
    await firstRow.click();
    let requests = 0;
    let failWrite = true;
    let rejectRefresh = false;
    let releaseWrite!: () => void;
    const heldWrite = new Promise<void>((resolve) => {
      releaseWrite = resolve;
    });
    let writeStarted!: () => void;
    const started = new Promise<void>((resolve) => {
      writeStarted = resolve;
    });
    const successful: { url?: string; body?: string } = {};
    await page.route(
      /\/api\/trpc\/dashboardV2\.bootstrap\.catalog/,
      async (route) => {
        if (!rejectRefresh) return route.continue();
        await route.fulfill({
          status: 500,
          json: [
            {
              error: {
                json: {
                  message: "Injected refresh failure",
                  code: -32603,
                  data: { code: "INTERNAL_SERVER_ERROR", httpStatus: 500 },
                },
              },
            },
          ],
        });
      },
    );
    await page.route(
      "**/api/trpc/dashboardV2.listing.importRows**",
      async (route) => {
        requests++;
        if (failWrite) {
          failWrite = false;
          await route.fulfill({
            status: 500,
            json: {
              error: {
                json: {
                  message: "Injected rejected write",
                  code: -32603,
                  data: { code: "INTERNAL_SERVER_ERROR", httpStatus: 500 },
                },
              },
            },
          });
          return;
        }
        if (requests === 2) {
          successful.url = route.request().url();
          successful.body = route.request().postData()!;
          writeStarted();
          await heldWrite;
        }
        const response = await route.fetch();
        rejectRefresh = requests === 2;
        await route.fulfill({ response });
      },
    );
    await page
      .getByRole("button", { name: "Import 100 listings", exact: true })
      .click();
    await expect(
      page.getByText("Import did not finish", { exact: true }),
    ).toBeVisible();
    expect(
      await db.listing.count({ where: { importKey: { not: null } } }),
    ).toBe(0);
    await capture(page, `${device}-failed-write`);
    await page
      .getByRole("button", { name: "Import 100 listings", exact: true })
      .click();
    await started;
    await expect(firstRow).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Start over", exact: true }),
    ).toBeDisabled();
    await page.keyboard.press("Enter");
    expect(requests).toBe(2);
    releaseWrite();
    await expect(
      page.getByRole("heading", {
        name: `${count - 100} ready to import`,
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByText("Saved. Dashboard refresh did not finish.", {
        exact: true,
      }),
    ).toBeVisible();
    await capture(page, `${device}-refresh-failed`);
    await page.reload();
    await expect(
      page.getByText("Saved. Dashboard refresh did not finish.", {
        exact: true,
      }),
    ).toBeVisible();
    rejectRefresh = false;
    await page
      .getByRole("button", { name: "Retry refresh", exact: true })
      .click();
    await expect(
      page.getByText("Saved. Dashboard refresh did not finish.", {
        exact: true,
      }),
    ).toHaveCount(0);
    expect(requests).toBe(2);
    const replay = await page.request.post(successful.url!, {
      headers: {
        "content-type": "application/json",
        "x-dashboard-member-id": "integration-user",
      },
      data: successful.body!,
    });
    expect(replay.ok()).toBe(true);
    expect(JSON.stringify(await replay.json())).toContain('"createdCount":0');
    expect(
      await db.listing.count({ where: { importKey: { not: null } } }),
    ).toBe(100);
    for (let remaining = count - 100; remaining > 0; remaining -= 100) {
      const selected = Math.min(remaining, 100);
      await page
        .getByRole("button", {
          name: `Import ${selected} listings`,
          exact: true,
        })
        .click();
      await expect(
        page.getByRole("heading", {
          name:
            remaining > 100
              ? `${remaining - 100} ready to import`
              : "Selected rows saved",
          exact: true,
        }),
      ).toBeVisible();
    }
    await capture(page, `${device}-complete`);
    const saved = await db.listing.findMany({
      where: { importKey: { not: null } },
    });
    expect(saved).toHaveLength(count);
    expect(new Set(saved.map((row) => row.importKey)).size).toBe(count);
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
      page.getByRole("heading", { name: "Selected rows saved", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("daylily-catalog:temp-list")!).length,
      ),
    ).toBe(count);
    await page.getByRole("button", { name: "Start over", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Cancel", exact: true }),
    ).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("button", { name: "Start over", exact: true }),
    ).toBeFocused();
    await page.getByRole("button", { name: "Start over", exact: true }).click();
    await page
      .getByRole("button", { name: "Discard import", exact: true })
      .click();
    await expect(
      page.getByRole("link", {
        name: "Import a spreadsheet or list",
        exact: true,
      }),
    ).toBeVisible();
    expect(
      await db.listing.count({ where: { importKey: { not: null } } }),
    ).toBe(count);
    await page
      .getByRole("link", { name: "Import a spreadsheet or list", exact: true })
      .click();
    await expect(
      page.getByRole("heading", {
        name: `Your catalog (${count})`,
        exact: true,
      }),
    ).toBeVisible();
  });
}

test("source variants and download-only fields survive account handoff", async ({
  page,
}) => {
  await prepare(page, 0, [
    "Double fan,20,Two fans,North bed",
    "Single fan,10,One fan,South bed",
  ]);
  await page
    .getByRole("button", { name: "Import 2 listings", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Selected rows saved", exact: true }),
  ).toBeVisible();
  const saved = await db.listing.findMany({
    where: { importKey: { not: null } },
    orderBy: { price: "asc" },
  });
  expect(
    saved.map(({ title, price, privateNote }) => ({
      title,
      price,
      privateNote,
    })),
  ).toEqual([
    { title: "Single fan", price: 10, privateNote: "South bed" },
    { title: "Double fan", price: 20, privateNote: "North bed" },
  ]);
  await subscription(false);
  await page.evaluate(() =>
    localStorage.removeItem("stripe-subscription:1:user_integration_seller"),
  );
  await page.reload();
  await expect(
    page.getByRole("heading", {
      name: /Save 2 listings to your account with Pro/,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("$12.99 per month. Billing options are shown at checkout.", {
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Back to Playground", exact: true })
    .click();
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download spreadsheet", exact: true })
    .click();
  const workbook = await readXlsxFile(await (await download).path());
  expect(JSON.stringify(workbook)).toContain("North bed");
  expect(JSON.stringify(workbook)).toContain("South bed");
});

test("an existing-catalog check can fail and retry without losing source rows", async ({
  page,
}) => {
  await prepare(page, 3);
  let fail = true;
  await page.route("**/api/trpc/dashboardV2.listing.list**", async (route) => {
    if (!fail) return route.continue();
    await route.fulfill({
      status: 500,
      json: {
        error: {
          json: {
            message: "Injected catalog check failure",
            code: -32603,
            data: { code: "INTERNAL_SERVER_ERROR", httpStatus: 500 },
          },
        },
      },
    });
  });
  await page.reload();
  await expect(
    page.getByText("Could not check your catalog", { exact: true }),
  ).toBeVisible();
  expect(await db.listing.count({ where: { importKey: { not: null } } })).toBe(
    0,
  );
  fail = false;
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "3 ready to import", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Back to Playground", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your catalog (3)", exact: true }),
  ).toBeVisible();
});

test("public preparation keeps the source across an interrupted check and rejects its late result", async ({
  page,
}) => {
  await page.goto("/playground");
  await page.getByRole("tab", { name: "Spreadsheet", exact: true }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: "interrupted.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("name,price\nIntegration Bloom,15"),
  });
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  let markStarted!: () => void;
  const started = new Promise<void>((resolve) => {
    markStarted = resolve;
  });
  await page.route("**/api/v1/cultivars/match", async (route) => {
    markStarted();
    await held;
    await route.fulfill({
      json: {
        results: [
          { inputName: "Integration Bloom", exactMatch: null, candidates: [] },
        ],
      },
    });
  });
  await page.getByRole("button", { name: "Check names", exact: true }).click();
  await started;
  await page.reload();
  release();
  await expect(
    page.getByText("interrupted.csv", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Verify names", exact: true }),
  ).toHaveCount(0);
  await page.locator('input[type="file"]').setInputFiles({
    name: "replacement.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("name,price\nNew seedling,27"),
  });
  await page.reload();
  await expect(
    page.getByText("replacement.csv", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Check names", exact: true }).click();
  await page
    .getByRole("button", { name: "Keep unlinked", exact: true })
    .click();
  await page.getByRole("button", { name: "Add ready", exact: true }).click();
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("daylily-catalog:temp-list")!),
    ),
  ).toMatchObject([{ name: "New seedling", price: 27 }]);
});
