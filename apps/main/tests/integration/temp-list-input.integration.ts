import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import readExcelFile from "read-excel-file/node";
import writeExcelFile from "write-excel-file/node";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

const searchDirectory = path.resolve(".tmp/search");
const savedSearchDirectory = `${searchDirectory}-input-test-${process.pid}`;
let hadSearch = false;
let flags: Buffer | undefined;

test.beforeAll(async () => {
  flags = await fs
    .readFile(process.env.RUNTIME_FEATURE_FLAGS_PATH!)
    .catch(() => undefined);
  await fs.writeFile(
    process.env.RUNTIME_FEATURE_FLAGS_PATH!,
    JSON.stringify({ publicCultivarSearch: true }),
  );
  hadSearch = await fs.stat(searchDirectory).then(
    () => true,
    () => false,
  );
  if (hadSearch) await fs.rename(searchDirectory, savedSearchDirectory);
  await promisify(execFile)(process.execPath, [
    "scripts/build-public-search-index.mjs",
    "--source",
    process.env.DATABASE_URL!,
    "--target",
    path.join(searchDirectory, "public-search-candidate.sqlite"),
  ]);
});

test.afterAll(async () => {
  await fs.rm(searchDirectory, { recursive: true, force: true });
  if (hadSearch) await fs.rename(savedSearchDirectory, searchDirectory);
  if (flags) await fs.writeFile(process.env.RUNTIME_FEATURE_FLAGS_PATH!, flags);
  else await fs.rm(process.env.RUNTIME_FEATURE_FLAGS_PATH!, { force: true });
});

test.beforeEach(async ({ context, baseURL, page }) => {
  await context.addCookies([
    { name: "integration-auth", value: "anonymous", url: baseURL! },
  ]);
  await page.goto("/playground");
  await expect(page.getByLabel("Search cultivars")).toBeVisible();
});

async function capture(page: Page, name: string) {
  const directory = process.env.TEMP_LIST_INPUT_EVIDENCE_DIR;
  if (!directory) return;
  await fs.mkdir(directory, { recursive: true });
  await page
    .getByRole("heading", { name: "Daylily Catalog Playground", exact: true })
    .scrollIntoViewIfNeeded();
  await page
    .getByRole("region", { name: "Add flowers", exact: true })
    .screenshot({
      path: path.join(directory, `${name}-input.png`),
      animations: "disabled",
    });
  await page.screenshot({
    path: path.join(directory, `${name}.png`),
    fullPage: true,
    animations: "disabled",
  });
}

async function savedListings(page: Page) {
  return page.evaluate((): unknown =>
    JSON.parse(localStorage.getItem("daylily-catalog:temp-list") ?? "[]"),
  );
}

test("review accepts suggestions, skips duplicates and keeps unresolved names", async ({
  page,
}) => {
  await page.getByLabel("Search cultivars").fill("Integration Blo");
  await page.getByRole("button", { name: "Add Integration Bloom" }).click();
  await expect.poll(() => savedListings(page)).toHaveLength(1);
  await expect(page.getByRole("region", { name: "Verify names" })).toHaveCount(
    0,
  );
  await page.getByRole("tab", { name: "Paste names", exact: true }).click();
  await page
    .getByLabel("Cultivar names", { exact: true })
    .fill("Integration Bloom\nIntegration Blom\nUnknown Garden Seedling");
  await page.getByRole("button", { name: "Check names", exact: true }).click();
  await expect(page.getByLabel("Cultivar names", { exact: true })).toHaveValue(
    /Integration Blom/,
  );
  const review = page.getByRole("region", { name: "Verify names" });
  await expect(
    review.getByRole("columnheader", { name: "Your name", exact: true }),
  ).toHaveCount(0);
  await expect(
    review.getByRole("button", { name: /Change match|Find a match/ }),
  ).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: /Integration Bloom.*%/ }).click();
  await expect(
    review.getByText("Integration Blom", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "2 duplicates · skipped", exact: true }),
  ).toBeVisible();
  await review
    .getByRole("button", { name: "Keep unlinked", exact: true })
    .click();
  await page.getByRole("button", { name: "Add ready", exact: true }).click();
  await expect.poll(() => savedListings(page)).toHaveLength(2);
  expect(await savedListings(page)).toMatchObject([
    {
      name: "Integration Bloom",
      cultivarReferenceId: "integration-cultivar-reference",
    },
    { name: "Unknown Garden Seedling", cultivarReferenceId: null },
  ]);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Your catalog (2)" }),
  ).toBeAttached();
  await page.getByRole("tab", { name: "Paste names", exact: true }).click();
  await expect(page.getByLabel("Cultivar names", { exact: true })).toHaveValue(
    "",
  );
});

test("spreadsheet preserves donor rows, quantities and multiline notes through reload and download", async ({
  page,
}) => {
  await page.getByRole("tab", { name: "Spreadsheet", exact: true }).click();
  await capture(page, "desktop-spreadsheet");
  const buffer = await writeExcelFile([
    { sheet: "Instructions", data: [["Use the Sale sheet"]] },
    {
      sheet: "Sale",
      data: [
        ["Name", "Price", "Quantity", "Donor", "Private note"],
        ["Integration Bloom", 12.5, 3, "Garden A", "Keep separate\nBed 2"],
        ["Integration Bloom", 8, 2, "Garden B", "Other donor"],
      ],
    },
  ]).toBuffer();
  await page.locator('input[type="file"]').setInputFiles({
    name: "sale.xlsx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer,
  });
  await page.getByRole("combobox", { name: "Sheet", exact: true }).click();
  await page.getByRole("option", { name: "Sale", exact: true }).click();
  await page.getByRole("tab", { name: "Paste names", exact: true }).click();
  await page.getByRole("tab", { name: "Spreadsheet", exact: true }).click();
  await expect(page.getByText("sale.xlsx", { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await capture(page, "mobile-spreadsheet-columns");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Check names" }).click();
  await page.getByRole("button", { name: "Add ready", exact: true }).click();
  await expect.poll(() => savedListings(page)).toHaveLength(2);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Your catalog (2)" }),
  ).toBeVisible();
  expect(await savedListings(page)).toMatchObject([
    {
      name: "Integration Bloom",
      price: 12.5,
      privateNote: "Keep separate\nBed 2",
      extraFields: [
        { label: "Quantity", value: "3" },
        { label: "Donor", value: "Garden A" },
      ],
    },
    {
      name: "Integration Bloom",
      price: 8,
      privateNote: "Other donor",
      extraFields: [
        { label: "Quantity", value: "2" },
        { label: "Donor", value: "Garden B" },
      ],
    },
  ]);
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download spreadsheet" }).click();
  const output = await readExcelFile(await (await downloaded).path());
  const headers = output[0]!.data[0]!;
  expect(output[0]!.data[1]![headers.indexOf("Imported: Donor")]).toBe(
    "Garden A",
  );
  expect(output[0]!.data[2]![headers.indexOf("Imported: Donor")]).toBe(
    "Garden B",
  );
  expect(output[0]!.data[1]![headers.indexOf("Private note")]).toBe(
    "Keep separate\nBed 2",
  );
  await page
    .getByRole("button", { name: "Reset catalog", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Reset to empty", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("tab", { name: "Spreadsheet", exact: true }).click();
  await expect(
    page.getByRole("tab", { name: "Spreadsheet", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.locator('input[type="file"]').setInputFiles({
    name: "round-trip.xlsx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: await fs.readFile(await (await downloaded).path()),
  });
  await page.getByRole("button", { name: "Check names", exact: true }).click();
  await page.getByRole("button", { name: "Add ready", exact: true }).click();
  await expect.poll(() => savedListings(page)).toHaveLength(2);
  expect(await savedListings(page)).toMatchObject([
    {
      name: "Integration Bloom",
      price: 12.5,
      privateNote: "Keep separate\nBed 2",
      extraFields: [
        { label: "Quantity", value: "3" },
        { label: "Donor", value: "Garden A" },
      ],
    },
    { name: "Integration Bloom", price: 8, privateNote: "Other donor" },
  ]);
});

test("invalid input is kept for correction without adding partial rows", async ({
  page,
}) => {
  await page.getByRole("tab", { name: "Paste names", exact: true }).click();
  await page
    .getByLabel("Cultivar names", { exact: true })
    .fill("Flower\tPrice\nIntegration Bloom\t12");
  await expect(
    page.getByRole("button", { name: "Check names", exact: true }),
  ).toBeDisabled();
  await page.getByRole("tab", { name: "Spreadsheet", exact: true }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: "prices.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      "Name,Price\nIntegration Bloom,12\nAnother Flower,two for $30",
    ),
  });
  await page.getByRole("button", { name: "Check names" }).click();
  await expect(
    page.getByRole("region", { name: "Invalid data", exact: true }),
  ).toBeVisible();
  expect(await savedListings(page)).toEqual([]);
  await page.getByRole("combobox", { name: "Map Price", exact: true }).click();
  await page
    .getByRole("option", { name: "Download only", exact: true })
    .click();
  await page.getByRole("button", { name: "Check names" }).click();
  await page
    .getByRole("button", { name: "Keep unlinked", exact: true })
    .click();
  await page.getByRole("button", { name: "Add ready", exact: true }).click();
  await expect.poll(() => savedListings(page)).toHaveLength(2);
  expect(await savedListings(page)).toMatchObject([
    { price: null, extraFields: [{ label: "Price", value: "12" }] },
    { price: null, extraFields: [{ label: "Price", value: "two for $30" }] },
  ]);
});

test("spreadsheet match choices keep sale names, notes and extra fields before account save", async ({
  page,
}) => {
  await page.getByRole("tab", { name: "Spreadsheet", exact: true }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: "sizes.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      "Name,Price,Notes,Donor\nIntegration Bloom double fan,20,North bed,Garden A\nIntegration Bloom single fan,10,South bed,Garden B",
    ),
  });
  await expect(
    page.getByRole("combobox", { name: "Map Notes", exact: true }),
  ).toHaveText(/Private note/);
  await page.getByRole("button", { name: "Check names", exact: true }).click();
  const potential = page.getByRole("region", {
    name: "Potential matches",
    exact: true,
  });
  await expect(
    potential.getByText("North bed", { exact: false }),
  ).toBeVisible();
  await potential
    .getByRole("button", { name: /Integration Bloom .*%/ })
    .first()
    .click();
  await potential
    .getByRole("button", { name: /Integration Bloom .*%/ })
    .first()
    .click();
  await page.getByRole("button", { name: "Add ready", exact: true }).click();
  expect(await savedListings(page)).toMatchObject([
    {
      name: "Integration Bloom double fan",
      price: 20,
      privateNote: "North bed",
      cultivarReferenceId: "integration-cultivar-reference",
      extraFields: [{ label: "Donor", value: "Garden A" }],
    },
    {
      name: "Integration Bloom single fan",
      price: 10,
      privateNote: "South bed",
      cultivarReferenceId: "integration-cultivar-reference",
    },
  ]);
  await page
    .getByRole("button", {
      name: "Price for Integration Bloom double fan",
      exact: true,
    })
    .click();
  await page
    .getByRole("spinbutton", {
      name: "Price for Integration Bloom double fan",
      exact: true,
    })
    .fill("22");
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", {
      name: "Price for Integration Bloom double fan",
      exact: true,
    }),
  ).toBeFocused();
  await expect(
    page.getByText(/Download-only fields stay in Playground/),
  ).toContainText("Donor");
  await page.getByRole("tab", { name: "Paste names", exact: true }).click();
  await page
    .getByLabel("Cultivar names", { exact: true })
    .fill("Integration Bloom");
  await page.getByRole("button", { name: "Check names", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "1 duplicate · skipped", exact: true }),
  ).toBeVisible();
  expect(await savedListings(page)).toMatchObject([
    { price: 22 },
    { price: 10 },
  ]);
});

test("capacity Undo and corrupt-storage recovery preserve the local source", async ({
  page,
}) => {
  test.setTimeout(60_000);
  page.setDefaultTimeout(15_000);
  await page.evaluate(() =>
    localStorage.setItem(
      "daylily-catalog:temp-list",
      JSON.stringify(
        Array.from({ length: 5000 }, (_, index) => ({
          id: `boundary-${index}`,
          name: `Boundary ${index}`,
          price: null,
          description: "",
          privateNote: "",
          cultivarReferenceId: null,
        })),
      ),
    ),
  );
  await page.reload();
  await expect(page.getByLabel("Search cultivars")).toBeDisabled();
  await expect(
    page.getByText(
      "There is room for 0 more flowers. Each catalog can contain 5,000.",
      { exact: true },
    ),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Delete Boundary 0", exact: true })
    .click();
  await page.getByRole("tab", { name: "Paste names", exact: true }).click();
  await page
    .getByLabel("Cultivar names", { exact: true })
    .fill("First missing name\nSecond missing name");
  await expect(
    page.getByText(
      "There is room for 1 more flowers. Each catalog can contain 5000.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Check names", exact: true }),
  ).toBeDisabled();
  await page.getByRole("tab", { name: "Single search", exact: true }).click();
  await page.getByLabel("Search cultivars").fill("Integration Blo");
  await page
    .getByRole("button", { name: "Add Integration Bloom", exact: true })
    .click();
  await page.locator('[data-sonner-toast][data-front="true"]').hover();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect.poll(() => savedListings(page)).toHaveLength(5001);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Your catalog (5001)", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Download spreadsheet", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Price for Boundary 1", exact: true })
    .click();
  await page
    .getByRole("spinbutton", { name: "Price for Boundary 1", exact: true })
    .fill("15");
  await page.keyboard.press("Enter");
  await expect
    .poll(
      async () =>
        (
          (await savedListings(page)) as {
            name: string;
            price: number | null;
          }[]
        ).find((row) => row.name === "Boundary 1")?.price,
    )
    .toBe(15);
  const raw = '[{"name":"Preserve this raw source"},';
  await page.evaluate(
    (value) => localStorage.setItem("daylily-catalog:temp-list", value),
    raw,
  );
  await page.reload();
  await expect(page.getByLabel("Search cultivars")).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Download saved data", exact: true }),
  ).toBeEnabled();
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download saved data", exact: true })
    .click();
  expect(await fs.readFile(await (await download).path(), "utf8")).toBe(raw);
  expect(
    await page.evaluate(() =>
      localStorage.getItem("daylily-catalog:temp-list"),
    ),
  ).toBe(raw);
  await page
    .getByRole("button", { name: "Reset saved data", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Cancel", exact: true }),
  ).toBeFocused();
  await page
    .getByRole("button", { name: "Reset to empty", exact: true })
    .click();
  await page.evaluate(() => {
    const write = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key: string, value: string) {
      if (key === "daylily-catalog:temp-list") {
        Storage.prototype.setItem = write;
        throw new DOMException("Quota exceeded", "QuotaExceededError");
      }
      return write.call(this, key, value);
    };
  });
  await page.getByLabel("Search cultivars").fill("Integration Blo");
  await page
    .getByRole("button", { name: "Add Integration Bloom", exact: true })
    .click();
  await expect(
    page.getByText(/This browser could not save the list/),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Your catalog (1)", exact: true }),
  ).toBeVisible();
  const workingDownload = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download spreadsheet", exact: true })
    .click();
  const output = await readExcelFile(await (await workingDownload).path());
  expect(JSON.stringify(output)).toContain("Integration Bloom");
  await page
    .getByRole("button", { name: "Price for Integration Bloom", exact: true })
    .click();
  await page
    .getByRole("spinbutton", {
      name: "Price for Integration Bloom",
      exact: true,
    })
    .fill("10");
  await page.keyboard.press("Enter");
  await expect
    .poll(() => savedListings(page))
    .toMatchObject([{ name: "Integration Bloom", price: 10 }]);
});

test("350 spreadsheet sale rows use the real matcher and import through four account batches", async ({
  page,
  context,
  baseURL,
}) => {
  test.setTimeout(120_000);
  await context.addCookies([
    { name: "integration-auth", value: "seller", url: baseURL! },
  ]);
  await page.route("**/api/catalog-importer/viewer-state", (route) =>
    route.fulfill({ json: { viewerState: "pro" } }),
  );
  const matchSizes: number[] = [];
  const writeSizes: number[] = [];
  page.on("request", (request) => {
    const pathname = new URL(request.url()).pathname;
    if (pathname === "/api/v1/cultivars/match") {
      const body = request.postDataJSON() as { names: string[] };
      matchSizes.push(body.names.length);
    }
    if (pathname === "/api/trpc/dashboardV2.listing.importRows") {
      const body = request.postDataJSON() as {
        "0": { json: { rows: unknown[] } };
      };
      writeSizes.push(body["0"].json.rows.length);
    }
  });
  await page.getByRole("tab", { name: "Spreadsheet", exact: true }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: "real-matcher-350.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      [
        "Name,Price,Private note",
        ...Array.from(
          { length: 350 },
          (_, index) => `Integration Bloom,${1000 + index},Source row ${index}`,
        ),
      ].join("\n"),
    ),
  });
  await page.getByRole("button", { name: "Check names", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Ready (350)", exact: true }),
  ).toBeVisible();
  expect(matchSizes).toEqual([250, 100]);
  await page.getByRole("button", { name: "Add ready", exact: true }).click();
  await expect.poll(() => savedListings(page)).toHaveLength(350);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Your catalog (350)", exact: true }),
  ).toBeVisible();
  const stored = (await savedListings(page)) as {
    name: string;
    price: number;
    privateNote: string;
    cultivarReferenceId: string;
  }[];
  expect(stored.map(({ price }) => price)).toEqual(
    Array.from({ length: 350 }, (_, index) => 1000 + index),
  );
  expect(
    stored.every(
      ({ cultivarReferenceId }) =>
        cultivarReferenceId === "integration-cultivar-reference",
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Save to my catalog", exact: true })
    .click();
  for (const count of [350, 250, 150, 50]) {
    await expect(
      page.getByRole("heading", {
        name: `${count} ready to import`,
        exact: true,
      }),
    ).toBeVisible();
    await page
      .getByRole("button", {
        name: `Import ${Math.min(count, 100)} listings`,
        exact: true,
      })
      .click();
  }
  await expect(
    page.getByRole("heading", { name: "Selected rows saved", exact: true }),
  ).toBeVisible();
  expect(writeSizes).toEqual([100, 100, 100, 50]);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Selected rows saved", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Import \d+ listings/ }),
  ).toHaveCount(0);
  expect(await savedListings(page)).toEqual(stored);
});
