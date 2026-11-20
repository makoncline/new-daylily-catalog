import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";
import type { Page } from "@playwright/test";
import {
  CATALOG_LISTING_HEADERS,
  createSpreadsheetCsv,
} from "@/lib/catalog-importer";
import { expect, test } from "./fixtures";
import {
  checkPlaygroundCsv,
  downloadPlaygroundWorkbook,
  installPlaygroundSearchFixture,
} from "./playground-spreadsheet";

const db = new PrismaClient({
  adapter: new PrismaLibSql(
    { url: process.env.DATABASE_URL! },
    { timestampFormat: "unixepoch-ms" },
  ),
});
const cultivarReferenceId = "integration-cultivar-reference";
const headers = [
  ...CATALOG_LISTING_HEADERS,
  "Registered name",
  "Imported: Donor",
];

test.afterAll(async () => db.$disconnect());

async function sellerId() {
  return (
    await db.user.findUniqueOrThrow({
      where: { clerkUserId: "user_integration_seller" },
    })
  ).id;
}

function watchImportBatches(page: Page) {
  const batchSizes: number[] = [];
  page.on("request", (request) => {
    if (
      new URL(request.url()).pathname ===
      "/api/trpc/dashboardV2.listing.importRows"
    ) {
      const body = request.postDataJSON() as {
        "0": { json: { rows: unknown[] } };
      };
      batchSizes.push(body["0"].json.rows.length);
    }
  });
  return batchSizes;
}

function fileInput(page: Page) {
  return page.getByLabel("Playground file", { exact: true });
}

function uploadCsv(page: Page, csv: string) {
  return fileInput(page).setInputFiles({
    name: "catalog.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csv),
  });
}

function addReady(page: Page) {
  return page.getByRole("button", { name: "Add ready", exact: true }).click();
}

function expectPreview(
  page: Page,
  fresh: number,
  skipped: number,
  invalid: number,
) {
  return Promise.all([
    expect(
      page.getByRole("heading", { name: `New (${fresh})`, exact: true }),
    ).toBeVisible(),
    expect(
      page.getByRole("heading", {
        name: `Already in your catalog (will be skipped) (${skipped})`,
        exact: true,
      }),
    ).toBeVisible(),
    expect(
      page.getByRole("heading", { name: `Invalid (${invalid})`, exact: true }),
    ).toBeVisible(),
  ]);
}

function expectResult(page: Page, created: number, skipped: number) {
  return expect(
    page.getByRole("status").filter({
      hasText: created ? "Import complete" : "Nothing new to import",
    }),
  ).toContainText(
    `${created} created. ${skipped} skipped because they are already in your catalog.`,
  );
}

test.describe("Playground workbook round trip", () => {
  let restoreSearch:
    | Awaited<ReturnType<typeof installPlaygroundSearchFixture>>
    | undefined;
  test.beforeAll(async () => {
    restoreSearch = await installPlaygroundSearchFixture();
  });
  test.afterAll(async () => restoreSearch?.());

  test("imports a real Playground download, then skips unchanged and edited listings", async ({
    context,
    baseURL,
    page,
  }) => {
    test.setTimeout(90_000);
    const userId = await sellerId();
    const count = () => db.listing.count({ where: { userId } });
    const initialCount = await count();
    const batchSizes = watchImportBatches(page);
    await context.addCookies([
      { name: "integration-auth", value: "anonymous", url: baseURL! },
    ]);
    await page.goto("/playground");
    await checkPlaygroundCsv(
      page,
      createSpreadsheetCsv([
        headers,
        [
          "Import Double Fan",
          20.25,
          "Divided this spring",
          "North bed\nSecond line",
          "Import Sale\nImport Favorites",
          cultivarReferenceId,
          "Integration Bloom",
          "Garden A",
        ],
        [
          "Import Single Fan",
          10,
          null,
          null,
          null,
          cultivarReferenceId,
          "Integration Bloom",
        ],
        ["Import Garden Seedling", 0, null, null, null, null],
      ]),
    );
    await addReady(page);
    await expect(
      page.getByRole("heading", { name: "Your catalog (3)", exact: true }),
    ).toBeVisible();
    const original = await downloadPlaygroundWorkbook(page);
    expect(original.name).toMatch(/\.xlsx$/);

    await context.addCookies([
      { name: "integration-auth", value: "seller", url: baseURL! },
    ]);
    await page.goto("/dashboard/imports");
    await fileInput(page).setInputFiles(original);
    await expectPreview(page, 3, 0, 0);
    await page
      .getByRole("button", { name: "Import 3 listings", exact: true })
      .click();
    await expectResult(page, 3, 0);
    expect(await count()).toBe(initialCount + 3);
    const savedRows = () =>
      db.listing.findMany({
        where: {
          userId,
          title: {
            in: [
              "Import Double Fan",
              "Import Single Fan",
              "Import Garden Seedling",
              "Import New Seedling",
            ],
          },
        },
        orderBy: { title: "asc" },
        include: {
          lists: { orderBy: { title: "asc" }, select: { title: true } },
        },
      });
    expect(await savedRows()).toMatchObject([
      {
        title: "Import Double Fan",
        price: 20.25,
        cultivarReferenceId,
        description: "Divided this spring",
        privateNote: "North bed\nSecond line",
        lists: [{ title: "Import Favorites" }, { title: "Import Sale" }],
      },
      {
        title: "Import Garden Seedling",
        price: 0,
        cultivarReferenceId: null,
        lists: [],
      },
      { title: "Import Single Fan", price: 10, cultivarReferenceId, lists: [] },
    ]);

    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Preview", exact: true }),
    ).toHaveCount(0);
    await fileInput(page).setInputFiles(original);
    await expectPreview(page, 0, 3, 0);
    await expectResult(page, 0, 3);
    await expect(page.getByText(/^Skipped:/)).toContainText(
      "Import Double Fan, Import Single Fan, Import Garden Seedling",
    );
    expect(await count()).toBe(initialCount + 3);
    expect(batchSizes).toEqual([3]);

    await page.goto("/playground");
    await page
      .getByRole("button", { name: "Reset catalog", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Reset to empty", exact: true })
      .click();
    await checkPlaygroundCsv(
      page,
      createSpreadsheetCsv([
        headers,
        [
          "Import Double Fan",
          32,
          "Changed description",
          null,
          "Unused Import List",
          cultivarReferenceId,
        ],
        ["Import New Seedling", 15, null, null, "Import Sale", null],
      ]),
    );
    await addReady(page);
    await expect(
      page.getByRole("heading", { name: "Your catalog (2)", exact: true }),
    ).toBeVisible();
    const changed = await downloadPlaygroundWorkbook(page);
    expect(changed.buffer.equals(original.buffer)).toBe(false);
    await page.goto("/dashboard/imports");
    await fileInput(page).setInputFiles(changed);
    await expectPreview(page, 1, 1, 0);
    await page
      .getByRole("button", { name: "Import 1 listing", exact: true })
      .click();
    await expectResult(page, 1, 1);
    expect(await count()).toBe(initialCount + 4);
    const saved = await savedRows();
    expect(saved[0]).toMatchObject({
      title: "Import Double Fan",
      price: 20.25,
      description: "Divided this spring",
      privateNote: "North bed\nSecond line",
      lists: [{ title: "Import Favorites" }, { title: "Import Sale" }],
    });
    expect(saved[2]).toMatchObject({
      title: "Import New Seedling",
      price: 15,
      lists: [{ title: "Import Sale" }],
    });
    expect(batchSizes).toEqual([3, 1]);
  });

  test("imports 350 Playground rows in four requests", async ({ page }) => {
    test.setTimeout(120_000);
    const batchSizes = watchImportBatches(page);
    const matchSizes: number[] = [];
    page.on("request", (request) => {
      if (new URL(request.url()).pathname === "/api/v1/cultivars/match") {
        const body = request.postDataJSON() as { names: string[] };
        matchSizes.push(body.names.length);
      }
    });
    await page.goto("/playground");
    await checkPlaygroundCsv(
      page,
      createSpreadsheetCsv([
        headers,
        ...Array.from({ length: 350 }, (_, index) => [
          `Batch Sale Bloom ${index}`,
          index,
          null,
          `Source row ${index}`,
          "Bulk Import Sale",
          cultivarReferenceId,
        ]),
      ]),
    );
    await expect(
      page.getByRole("button", { name: "Ready (350)", exact: true }),
    ).toBeVisible();
    expect(matchSizes).toEqual([250, 100]);
    await addReady(page);
    await expect(
      page.getByRole("heading", { name: "Your catalog (350)", exact: true }),
    ).toBeVisible();
    const workbook = await downloadPlaygroundWorkbook(page);
    await page.goto("/dashboard/imports");
    await fileInput(page).setInputFiles(workbook);
    await expectPreview(page, 350, 0, 0);
    await page
      .getByRole("button", { name: "Import 350 listings", exact: true })
      .click();
    await expectResult(page, 350, 0);
    expect(batchSizes).toEqual([100, 100, 100, 50]);
    const list = await db.list.findFirstOrThrow({
      where: { userId: await sellerId(), title: "Bulk Import Sale" },
      include: {
        listings: {
          orderBy: { price: "asc" },
          select: { title: true, price: true, cultivarReferenceId: true },
        },
      },
    });
    expect(list.listings).toEqual(
      Array.from({ length: 350 }, (_, index) => ({
        title: `Batch Sale Bloom ${index}`,
        price: index,
        cultivarReferenceId,
      })),
    );
  });
});

test("rejects a non-Playground file and links to the Playground", async ({
  page,
}) => {
  const userId = await sellerId();
  const count = await db.listing.count({ where: { userId } });
  const batchSizes = watchImportBatches(page);
  await page.goto("/dashboard/imports");
  await uploadCsv(page, "Name,Price\nNot a Playground export,20");
  const error = page
    .getByRole("alert")
    .filter({ hasText: "This file is not a Playground export." });
  await expect(error).toHaveText(
    "This file is not a Playground export. Clean it in the Playground first.",
  );
  await expect(
    error.getByRole("link", { name: "Playground", exact: true }),
  ).toHaveAttribute("href", "/playground");
  await expect(page.getByRole("button", { name: /^Import \d/ })).toHaveCount(0);
  expect(await db.listing.count({ where: { userId } })).toBe(count);
  expect(batchSizes).toEqual([]);
});

test("previews invalid CSV rows and splits valid rows at the list limit", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const batchSizes = watchImportBatches(page);
  const lists = Array.from(
    { length: 100 },
    (_, index) => `CSV Import List ${index + 1}`,
  );
  await page.goto("/dashboard/imports");
  await uploadCsv(
    page,
    createSpreadsheetCsv([
      [...CATALOG_LISTING_HEADERS],
      ["CSV First Bloom", 20, null, null, lists.join("\n"), null],
      ["CSV Second Bloom", 30, null, null, "CSV Import List 101", null],
      ["csv first  bloom", 90, null, null, "Do Not Create This List", null],
      ["CSV Unknown Link", 10, null, null, null, "unknown-cultivar"],
      ["CSV Long Note", 10, null, "A".repeat(10_001), null, null],
    ]),
  );
  await expectPreview(page, 2, 1, 2);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const invalid = page.getByRole("region", { name: "Invalid", exact: true });
  await expect(invalid.getByText("Unknown cultivar link.")).toBeVisible();
  await expect(
    invalid.getByText("Private note exceeds 10,000 characters."),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Import 2 listings", exact: true })
    .click();
  await expectResult(page, 2, 1);
  expect(batchSizes).toEqual([1, 1]);
  const userId = await sellerId();
  expect(
    await db.list.count({
      where: { userId, title: { startsWith: "CSV Import List " } },
    }),
  ).toBe(101);
  expect(
    await db.list.count({
      where: { userId, title: "Do Not Create This List" },
    }),
  ).toBe(0);
  expect(
    await db.listing.count({
      where: { userId, title: { in: ["CSV Unknown Link", "CSV Long Note"] } },
    }),
  ).toBe(0);
});

test("uses the usual billing action for a lapsed membership", async ({
  page,
}) => {
  const where = { key: "stripe:customer:cus_integration_seller" };
  const existing = await db.keyValue.findUniqueOrThrow({ where });
  await db.keyValue.update({
    where,
    data: {
      value: JSON.stringify({
        ...JSON.parse(existing.value),
        status: "past_due",
      }),
    },
  });
  try {
    await page.goto("/dashboard/imports");
    const action = page.getByTestId("dashboard-update-billing");
    await expect(action).toBeVisible();
    await expect(action).toHaveAccessibleName("Update billing");
    await expect(fileInput(page)).toHaveCount(0);
  } finally {
    await db.keyValue.update({ where, data: { value: existing.value } });
  }
});
