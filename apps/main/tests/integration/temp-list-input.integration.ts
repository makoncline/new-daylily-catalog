import fs from "node:fs/promises";
import path from "node:path";
import readExcelFile from "read-excel-file/node";
import writeExcelFile from "write-excel-file/node";
import type { Page } from "@playwright/test";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";
import { expect, test } from "./fixtures";

import {
  checkPlaygroundCsv,
  installPlaygroundSearchFixture,
} from "./playground-spreadsheet";

const secondCultivarId = "integration-playground-rose";
const db = new PrismaClient({
  adapter: new PrismaLibSql({ url: process.env.DATABASE_URL! }),
});
let restoreSearch:
  | Awaited<ReturnType<typeof installPlaygroundSearchFixture>>
  | undefined;
test.beforeAll(async () => {
  await db.cultivarReference.create({
    data: {
      id: secondCultivarId,
      normalizedName: "playground rose",
      v2AhsCultivar: {
        create: {
          id: "integration-playground-rose-v2",
          link_normalized_name: "playground rose",
          post_title: "Playground Rose",
        },
      },
    },
  });
  restoreSearch = await installPlaygroundSearchFixture();
});
test.afterAll(async () => {
  try {
    await restoreSearch?.();
    await db.cultivarReference.deleteMany({ where: { id: secondCultivarId } });
    await db.v2AhsCultivar.deleteMany({
      where: { id: "integration-playground-rose-v2" },
    });
  } finally {
    await db.$disconnect();
  }
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
  const downloadButton = page.getByRole("button", {
    name: "Download spreadsheet",
  });
  const search = page.getByPlaceholder("Search listings...");
  await search.fill("No matching listing");
  await expect(
    page.getByText("0 of 2 listings", { exact: true }),
  ).toBeVisible();
  const filteredDownload = page.waitForEvent("download");
  await downloadButton.click();
  const filteredOutput = await readExcelFile(
    await (await filteredDownload).path(),
  );
  expect(filteredOutput[0]?.data).toHaveLength(3);
  await search.clear();
  await page
    .getByRole("checkbox", { name: "Select Integration Bloom", exact: true })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Show selected", exact: true })
    .click();
  await expect(
    page.getByText("1 of 2 listings", { exact: true }),
  ).toBeVisible();

  const downloaded = page.waitForEvent("download");
  await downloadButton.click();
  const output = await readExcelFile(await (await downloaded).path());
  expect(output).toEqual(filteredOutput);
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

test("spreadsheet match choices keep sale names, notes and extra fields in the local catalog", async ({
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

async function rejectNextCatalogWrite(page: Page) {
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
}

test("Add ready keeps a failed batch and retries without exceeding the combined quota", async ({
  page,
}) => {
  const note = "x".repeat(4_400);
  await checkPlaygroundCsv(
    page,
    `Name,Private note,Cultivar reference ID\nGarden seedling,${note},`,
  );
  const review = page.getByRole("region", { name: "Verify names" });
  const addReady = review.getByRole("button", {
    name: "Add ready",
    exact: true,
  });
  await expect(
    review.getByText("Garden seedling", { exact: true }),
  ).toBeVisible();
  const savedDraft = () =>
    page.evaluate(() => localStorage.getItem("daylily-catalog:temp-review"));
  const original = await savedDraft();
  expect(original?.length).toBeGreaterThan(8_800);
  await page.evaluate(() => {
    const write = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key: string, value: string) {
      const draftSize =
        this.getItem("daylily-catalog:temp-review")?.length ?? 0;
      if (
        key === "daylily-catalog:temp-list" &&
        value.length + draftSize > 12_000
      )
        throw new DOMException("Quota exceeded", "QuotaExceededError");
      return write.call(this, key, value);
    };
  });
  await rejectNextCatalogWrite(page);
  await addReady.click();

  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "This browser could not save the list" }),
  ).toBeVisible();
  await expect(
    review.getByText("Garden seedling", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("1 added", { exact: true })).toHaveCount(0);
  expect(await savedListings(page)).toEqual([]);
  expect(await savedDraft()).toBe(original);

  await addReady.click();
  await expect(review).toHaveCount(0);
  await expect(page.getByText("1 added", { exact: true })).toBeVisible();
  expect(await savedDraft()).toBeNull();
  expect(await savedListings(page)).toMatchObject([
    { name: "Garden seedling", privateNote: note },
  ]);
});

test("catalog edits, bulk removal, and Undo stay available after a failed write", async ({
  page,
}) => {
  await checkPlaygroundCsv(
    page,
    "Name,Cultivar reference ID\nRetry rose,\nRetry gold,",
  );
  await page.getByRole("button", { name: "Add ready", exact: true }).click();
  await page
    .getByRole("button", { name: "Edit Retry rose", exact: true })
    .click();
  const name = page.getByRole("textbox", { name: "Name", exact: true });
  await name.fill("New rose name");
  await rejectNextCatalogWrite(page);
  const save = page.getByRole("button", { name: "Save Changes", exact: true });
  await save.click();
  await expect(
    page.getByText("This browser could not save the list. Try again."),
  ).toBeVisible();
  await expect(name).toHaveValue("New rose name");
  expect(await savedListings(page)).toMatchObject([
    { name: "Retry rose" },
    { name: "Retry gold" },
  ]);
  await save.click();
  await expect(
    page.getByRole("button", { name: "Edit New rose name", exact: true }),
  ).toBeVisible();

  await page
    .getByRole("checkbox", { name: "Select New rose name", exact: true })
    .click();
  const bulk = page.getByRole("button", {
    name: "Bulk actions (1)",
    exact: true,
  });
  await rejectNextCatalogWrite(page);
  await bulk.click();
  await page.getByRole("menuitem", { name: "Remove selected" }).click();
  await expect(
    page.getByText("This browser could not save the list. Try again."),
  ).toBeVisible();
  await expect(bulk).toBeVisible();
  await expect(
    page.getByText("Removed from Playground", { exact: true }),
  ).toHaveCount(0);
  expect(await savedListings(page)).toHaveLength(2);

  await bulk.click();
  await page.getByRole("menuitem", { name: "Remove selected" }).click();
  const undo = page.getByRole("button", { name: "Undo", exact: true });
  await expect(undo).toBeVisible();
  await rejectNextCatalogWrite(page);
  await undo.press("Enter");
  await expect(
    page.getByText("This browser could not save the list. Try again."),
  ).toBeVisible();
  await expect(undo).toBeVisible();
  expect(await savedListings(page)).toHaveLength(1);
  await undo.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Your catalog (2)", exact: true }),
  ).toBeVisible();
});

test("a listing cannot get a 101st list through the picker or bulk actions", async ({
  page,
}) => {
  const lists = Array.from({ length: 100 }, (_, index) => `List ${index + 1}`);
  await checkPlaygroundCsv(
    page,
    [
      "Name,Lists,Cultivar reference ID",
      `Limit rose,"${lists.join("\n")}",`,
      "Extra rose,List 101,",
    ].join("\n"),
  );
  await page.getByRole("button", { name: "Add ready", exact: true }).click();
  const picker = page.getByRole("combobox", { name: "Lists for Limit rose" });
  const search = page.getByRole("combobox", { name: "Find or create a list" });
  await picker.click();
  await search.fill("List 101");
  await expect(
    page.getByRole("option", { name: "List 101", exact: true }),
  ).toBeDisabled();
  await search.fill("New list");
  await expect(page.getByRole("option", { name: /Create/ })).toHaveCount(0);
  await expect(
    page.getByText("Remove a list before you add another."),
  ).toBeVisible();
  await search.fill("List 1");
  await page.getByRole("option", { name: "List 1", exact: true }).click();
  if ((await picker.getAttribute("aria-expanded")) === "false")
    await picker.click();
  await search.fill("New list");
  await page
    .getByRole("option", { name: "Create “New list”", exact: true })
    .click();
  await page.keyboard.press("Escape");

  await page.getByRole("checkbox", { name: "Select Limit rose" }).click();
  await page.getByRole("button", { name: "Bulk actions (1)" }).click();
  await page.getByRole("menuitem", { name: "Add to list" }).click();
  const dialog = page.getByRole("dialog", { name: "Add 1 to list" });
  await dialog.getByRole("combobox", { name: "Choose a list" }).click();
  await search.fill("List 101");
  await page.getByRole("option", { name: "List 101", exact: true }).click();
  await dialog.getByRole("button", { name: "Add to list" }).click();
  await expect(
    page.getByText("A listing can be on at most 100 lists."),
  ).toBeVisible();
  expect(await savedListings(page)).toMatchObject([
    { name: "Limit rose", lists: [...lists.slice(1), "New list"] },
    { name: "Extra rose", lists: ["List 101"] },
  ]);
});

test("spreadsheet skips only exact repeats and links to dashboard imports", async ({
  page,
}) => {
  await checkPlaygroundCsv(
    page,
    [
      "Name,Cultivar reference ID",
      "Garden Bloom,integration-cultivar-reference",
      `Garden Bloom,${secondCultivarId}`,
      `Rose division,${secondCultivarId}`,
      "Garden Bloom,integration-cultivar-reference",
    ].join("\n"),
  );
  await expect(
    page.getByRole("button", { name: "1 duplicate · skipped" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Ready (3)", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add ready", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your catalog (3)", exact: true }),
  ).toBeVisible();
  expect(await savedListings(page)).toMatchObject([
    {
      name: "Garden Bloom",
      cultivarReferenceId: "integration-cultivar-reference",
    },
    { name: "Garden Bloom", cultivarReferenceId: secondCultivarId },
    { name: "Rose division", cultivarReferenceId: secondCultivarId },
  ]);
  await expect(
    page.getByRole("link", { name: "import it in your dashboard" }),
  ).toHaveAttribute("href", "/dashboard/imports");
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Download spreadsheet", exact: true }),
  ).toBeEnabled();
  await capture(page, "playground-desktop");
  await page.setViewportSize({ width: 390, height: 844 });
  await capture(page, "playground-phone");
});

test("an overlong cultivar ID stays in review without blocking valid rows", async ({
  page,
}) => {
  await checkPlaygroundCsv(
    page,
    [
      "Name,Cultivar reference ID",
      "Valid Bloom,integration-cultivar-reference",
      `ID to correct,${"x".repeat(201)}`,
      "Valid seedling,",
    ].join("\n"),
  );
  const invalid = page.getByRole("region", {
    name: "Invalid data",
    exact: true,
  });
  await expect(
    invalid.getByText("Use 200 characters or fewer for the cultivar ID."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Ready (2)", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add ready", exact: true }).click();
  await expect(invalid).toBeVisible();
  expect(await savedListings(page)).toMatchObject([
    {
      name: "Valid Bloom",
      cultivarReferenceId: "integration-cultivar-reference",
    },
    { name: "Valid seedling", cultivarReferenceId: null },
  ]);
  await invalid.getByRole("textbox", { name: /ID to correct/ }).clear();
  await invalid.getByRole("button", { name: "Check again" }).click();
  await expect(invalid).toHaveCount(0);
  await page.getByRole("button", { name: "Add ready", exact: true }).click();
  expect(await savedListings(page)).toHaveLength(3);
});

test("legacy Playground URLs redirect permanently without catching checkout success", async ({
  request,
}) => {
  for (const url of ["/catalog-importer", "/temp-list"]) {
    const response = await request.get(url, { maxRedirects: 0 });
    expect(response.status()).toBe(308);
    expect(response.headers().location).toBe("/playground");
  }
  const checkout = await request.get("/catalog-importer/checkout/success", {
    maxRedirects: 0,
  });
  expect(checkout.status()).toBe(200);
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
  await rejectNextCatalogWrite(page);
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
