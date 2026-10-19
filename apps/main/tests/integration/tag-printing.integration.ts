import { expect, test } from "./fixtures";

test("seller prepares a grower-details tag sheet", async ({ page }) => {
  const listingTitle = "Existing Bloom";

  await page.goto("/dashboard/tags");
  await expect(
    page.getByRole("group", { name: "Choose a template" }),
  ).toBeVisible();

  await page.getByPlaceholder("Search listings...").fill(listingTitle);
  const listingRow = page.getByRole("row", {
    name: `Select row ${listingTitle}`,
    exact: true,
  });
  await expect(listingRow).toBeVisible();
  await listingRow.getByRole("checkbox", { name: "Select row" }).click();

  await expect(page.getByText("1 selected listing.")).toBeVisible();
  const tagPreview = page.getByRole("main").getByRole("article");
  await expect(tagPreview).toContainText(listingTitle);
  await expect(tagPreview).toContainText("Test Garden, 2026");

  await page.getByRole("radio", { name: /Grower details/i }).click();
  await expect(page.getByRole("combobox", { name: "Tag Size" })).toContainText(
    'Card 2.00" × 4.00"',
  );
  await expect(
    page.getByRole("radio", { name: /Grower details/i }),
  ).toBeChecked();

  await page.getByRole("button", { name: "Make sheet" }).click();
  const sheetCreator = page.getByRole("dialog", { name: "Sheet Creator" });
  await expect(sheetCreator).toBeVisible();
  await expect(sheetCreator).toContainText(
    'Tag size on sheet (fixed to active tag size): 4.00" × 2.00"',
  );
  await expect(sheetCreator).toContainText(
    "1 label selected, 1 copy of each, 1 total label.",
  );
  await expect(sheetCreator).toContainText("1 tag per sheet, 1 sheet needed.");
  await expect(sheetCreator.getByRole("article")).toContainText(listingTitle);
  await expect(sheetCreator.getByRole("article")).toContainText(
    "Test Garden, 2026",
  );

  await sheetCreator.getByRole("button", { name: "Close" }).click();
  await page.getByRole("button", { name: "Output options" }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: "Pages (.html)" }).click();
  expect((await download).suggestedFilename()).toMatch(/\.html$/);
});
