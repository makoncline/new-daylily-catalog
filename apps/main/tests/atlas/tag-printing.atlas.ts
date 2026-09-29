import { captureAtlasState, expect, test } from "./atlas-test";

const mixedListingTitles = [
  "Bee-ba-tized",
  "Devil Woman",
  "Penny's Love",
  "Richfield Muriel's Double",
  "Pour Me Some Double Berry Wine",
  "Shallow Fords Super Natural Beauty",
  "Acting on Impulse is Back Scratcher",
  "Lavender Blue Baby seedling with Teeth",
];

async function openTagsWithMixedListings(
  page: Parameters<typeof captureAtlasState>[0],
) {
  await page.goto("/dashboard/tags");
  await expect(
    page.getByRole("group", { name: "Choose a template" }),
  ).toBeVisible({ timeout: 30_000 });

  const filter = page.getByPlaceholder("Filter listings to tag...");
  await captureAtlasState(page, "tag-printing-unselected");
  await filter.fill("atlas-no-matching-listing");
  await expect(page.getByText("No listings found")).toBeVisible();
  await captureAtlasState(page, "tag-printing-no-results");
  await filter.clear();
  for (const title of mixedListingTitles) {
    await filter.fill(title);
    const listingRow = page
      .getByRole("row")
      .filter({ has: page.getByText(title, { exact: true }) })
      .first();
    await expect(listingRow).toBeVisible();
    const checkbox = listingRow.getByRole("checkbox", { name: "Select row" });
    await checkbox.click();
    await expect(checkbox).toBeChecked();
  }
  await expect(page.getByText("8 selected listings.")).toBeVisible();
}

test("Garden ID tags; Simple name tags; Sale tags; Grower detail tags; Custom tag template; AI template instructions; Sheet creator", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await openTagsWithMixedListings(page);

  const gardenId = page.getByRole("radio", { name: /Garden ID/i });
  await expect(gardenId).toBeChecked();
  await captureAtlasState(page, "tag-printing-garden-id");

  await page.getByRole("button", { name: "Output options" }).click();
  await expect(
    page.getByRole("menuitem", { name: "PDF (.pdf)" }),
  ).toBeVisible();
  await captureAtlasState(page, "tag-printing-output-menu");
  await page.keyboard.press("Escape");

  await page.getByRole("switch", { name: "Include QR code" }).click();
  await captureAtlasState(page, "tag-printing-qr-off");
  await page.getByRole("switch", { name: "Include QR code" }).click();

  await page.getByRole("combobox", { name: "Tag Size" }).click();
  await page.getByRole("option", { name: "Custom" }).click();
  const width = page.getByRole("spinbutton", { name: "Width (in)" });
  await width.fill("0.1");
  await width.blur();
  await expect(page.getByText(/Enter a number from/)).toBeVisible();
  await captureAtlasState(page, "tag-printing-invalid-size");
  await width.fill("4.2");
  await width.blur();
  await captureAtlasState(page, "tag-printing-custom-size");
  await page.getByRole("combobox", { name: "Tag Size" }).click();
  await page.getByRole("option", { name: /Brother TZe/i }).click();

  await page.getByRole("radio", { name: /Simple name/i }).click();
  await captureAtlasState(page, "tag-printing-simple-name");

  await page.getByRole("radio", { name: /Sale tag/i }).click();
  await captureAtlasState(page, "tag-printing-sale-tag");

  await page.getByRole("radio", { name: /Grower details/i }).click();
  await expect(page.getByRole("combobox", { name: "Tag Size" })).toContainText(
    'Card 2.00" × 4.00"',
  );
  await captureAtlasState(page, "tag-printing-grower-details");

  await page.getByRole("button", { name: "Customize this template" }).click();
  await page
    .getByLabel("Custom template")
    .fill(
      "# {{title}}\n## {{hybridizerYear}} | {{price}}\n\n- Bloom {{bloomSize}} | Scape {{scapeHeight}}",
    );
  await expect(
    page.getByText("Saved templates stay in this browser."),
  ).toBeVisible();
  await captureAtlasState(page, "tag-printing-custom");

  await page.getByRole("button", { name: "Get AI instructions" }).click();
  const instructions = page.getByLabel("AI template instructions");
  await expect(instructions).toContainText("{{hybridizerYear}}");
  await expect(instructions).toContainText("{{privateNote}}");
  await expect(instructions).toContainText("no more than two columns per row");
  await captureAtlasState(page, "tag-printing-ai-instructions");

  const promptDialog = page.getByRole("dialog");
  await promptDialog.getByRole("button", { name: "Close" }).click();
  await page.getByRole("button", { name: "Make sheet" }).click();
  await expect(
    page.getByRole("heading", { name: "Sheet Creator" }),
  ).toBeVisible();
  await captureAtlasState(page, "tag-printing-sheet");

  await page.getByRole("button", { name: "Print quantity" }).click();
  const copies = page.getByRole("spinbutton", {
    name: "Copies of each selected label",
  });
  await copies.fill("2");
  await copies.blur();
  await captureAtlasState(page, "tag-printing-sheet-quantity");
  const pageWidth = page.getByRole("spinbutton", { name: "Page width (in)" });
  await pageWidth.fill("1");
  await pageWidth.blur();
  await expect(
    page.getByRole("button", { name: "Print Sheets" }),
  ).toBeDisabled();
  await captureAtlasState(page, "tag-printing-sheet-invalid");
  await page.getByRole("button", { name: "Reset to 1 Tag" }).click();

  await page.getByRole("button", { name: "Close" }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("radio", { name: /Garden ID/i }).click();
  await captureAtlasState(page, "tag-printing-mobile-garden-id");

  const previews = page.getByRole("region", { name: "Tag previews" });
  await previews.focus();
  await page.keyboard.press("ArrowRight");
  await expect
    .poll(() => previews.evaluate((element) => element.scrollLeft))
    .toBeGreaterThan(0);
  await page.getByRole("combobox", { name: "Tag Size" }).click();
  await page.getByRole("option", { name: "Custom" }).click();
  const mobileWidth = page.getByRole("spinbutton", { name: "Width (in)" });
  await mobileWidth.fill("6");
  await mobileWidth.blur();
  await previews.evaluate((element) => {
    element.scrollLeft = element.scrollWidth;
  });
  const previewBounds = await previews.boundingBox();
  const lastTagBounds = await previews
    .getByRole("article")
    .last()
    .boundingBox();
  expect(previewBounds).not.toBeNull();
  expect(lastTagBounds).not.toBeNull();
  expect(lastTagBounds!.x + lastTagBounds!.width).toBeLessThanOrEqual(
    previewBounds!.x + previewBounds!.width + 1,
  );
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.getByRole("combobox", { name: "Tag Size" }).click();
  await page.getByRole("option", { name: 'Card 2.00" × 4.00"' }).click();

  await page.getByRole("button", { name: "Make sheet" }).click();
  await captureAtlasState(page, "tag-printing-mobile-sheet");
  await page.getByRole("button", { name: "Close" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  await captureAtlasState(page, "tag-printing-dark-garden-id");
});
