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

async function expectSquareSheetSteppers(
  page: Parameters<typeof captureAtlasState>[0],
) {
  const steppers = page
    .getByRole("dialog")
    .getByRole("button", { name: /^(Decrease|Increase) / });
  const count = await steppers.count();
  expect(count).toBeGreaterThan(0);
  for (let index = 0; index < count; index += 1) {
    const bounds = await steppers.nth(index).boundingBox();
    expect(bounds).not.toBeNull();
    expect(Math.abs(bounds!.width - bounds!.height)).toBeLessThanOrEqual(1);
  }
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
  await expectSquareSheetSteppers(page);
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
  const resetSheet = page.getByRole("button", { name: "Reset to 1 Tag" });
  await resetSheet.click();

  const rows = page.getByRole("spinbutton", { name: "Rows", exact: true });
  await rows.fill("3");
  const increaseRows = page.getByRole("button", { name: "Increase Rows" });
  await increaseRows.click();
  await expect(rows).toHaveValue("4");
  await expect(increaseRows).toBeFocused();
  await expect(page.getByText(/4 tags per sheet/)).toBeVisible();
  await rows.fill("");
  await rows.press("Escape");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(rows).toHaveValue("4");
  await expect(rows).toHaveAttribute("aria-invalid", "false");
  await expect(rows).not.toBeFocused();
  await rows.fill("");
  await rows.blur();
  await expect(rows).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByText(/4 tags per sheet/)).toBeVisible();
  await resetSheet.click();
  await expect(rows).toHaveValue("1");
  await expect(rows).toHaveAttribute("aria-invalid", "false");
  await expect(resetSheet).toBeFocused();
  await expect(page.getByText(/1 tag per sheet/)).toBeVisible();
  const pageHeight = page.getByRole("spinbutton", { name: "Page height (in)" });
  await pageHeight.fill("12");
  await pageHeight.press("Enter");
  await rows.fill("2");
  await increaseRows.click();
  await expect(rows).toHaveValue("3");
  await expect(page.getByText(/3 tags per sheet/)).toBeVisible();
  await expect(page.getByText(/Page too small for this layout/)).toBeHidden();
  await increaseRows.press("Space");
  await expect(rows).toHaveValue("4");
  await rows.fill("20");
  await rows.press("Enter");
  await increaseRows.click();
  await expect(rows).toHaveValue("20");
  await expect(page.getByText(/20 tags per sheet/)).toBeVisible();
  const decreaseRows = page.getByRole("button", { name: "Decrease Rows" });
  await decreaseRows.focus();
  await decreaseRows.press("Enter");
  await expect(rows).toHaveValue("19");
  await rows.fill("1");
  await rows.press("Enter");
  await decreaseRows.click();
  await expect(rows).toHaveValue("1");
  await resetSheet.click();
  await resetSheet.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();

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
  await expectSquareSheetSteppers(page);
  await captureAtlasState(page, "tag-printing-mobile-sheet");
  await page.getByRole("button", { name: "Close" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  await captureAtlasState(page, "tag-printing-dark-garden-id");

  await page.evaluate(() => document.documentElement.classList.remove("dark"));
  await page.getByRole("button", { name: "Customize this template" }).click();
  await page.getByLabel("Custom template").fill("# {{title}}\n- {{price}}");
  await page.getByLabel("Template name").fill("Atlas saved template");
  await page.getByRole("button", { name: "Save as template" }).click();
  const savedTemplate = page.getByRole("radio", {
    name: /Atlas saved template/i,
  });
  await savedTemplate.click();
  await expect(savedTemplate).toBeChecked();
  await captureAtlasState(page, "tag-printing-saved-template");

  const deleteTrigger = page.getByRole("button", {
    name: "Delete template Atlas saved template",
  });
  await deleteTrigger.click();
  const deleteAction = page.getByRole("button", {
    name: /^Delete template$/,
  });
  await expect(deleteAction).toBeVisible();
  const deleteColors = await deleteAction.evaluate((button) => {
    const reference = document.createElement("div");
    reference.className = "bg-destructive text-destructive-foreground";
    document.body.append(reference);
    const actual = getComputedStyle(button);
    const expected = getComputedStyle(reference);
    const colors = {
      actualBackground: actual.backgroundColor,
      expectedBackground: expected.backgroundColor,
      actualText: actual.color,
      expectedText: expected.color,
    };
    reference.remove();
    return colors;
  });
  expect(deleteColors.actualBackground).toBe(deleteColors.expectedBackground);
  expect(deleteColors.actualText).toBe(deleteColors.expectedText);
  await captureAtlasState(page, "tag-printing-delete-confirmation");
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(deleteTrigger).toBeFocused();
  await expect(savedTemplate).toBeChecked();

  await page.setViewportSize({ width: 390, height: 844 });
  await previews.evaluate((element) => {
    element.scrollLeft = 0;
  });
  const firstSavedTag = previews.getByRole("article").first();
  await firstSavedTag.scrollIntoViewIfNeeded();
  await expect(firstSavedTag).toBeInViewport({
    ratio: 0.25,
  });
  await expect(previews.getByText("Bee-ba-tized")).toBeInViewport();
  await expect(page.getByText("Template saved.", { exact: true })).toBeHidden();
  await captureAtlasState(page, "tag-printing-mobile-saved-template");
  await deleteTrigger.click();
  await captureAtlasState(page, "tag-printing-mobile-delete-confirmation");
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(deleteTrigger).toBeFocused();
  await deleteTrigger.click();
  await deleteAction.click();
  await expect(savedTemplate).toBeHidden();
  await expect(page.getByLabel("Custom template")).toBeVisible();
  await expect(page.getByLabel("Custom template")).toBeFocused();

  await page.setViewportSize({ width: 1440, height: 1000 });
  const editor = page.getByLabel("Custom template");
  await editor.fill("{{unknown}} | {{year}} | {{price}}");
  await expect(editor).toHaveAccessibleDescription(/not an available field/);
  await expect(editor).toHaveAccessibleDescription(
    /Use no more than two columns per row/,
  );
  await expect(page.getByRole("radio", { checked: true })).toHaveCount(0);
  await captureAtlasState(page, "tag-printing-template-errors");
  await editor.fill("# replace me");
  await editor.evaluate((element: HTMLTextAreaElement) => {
    element.focus();
    element.setSelectionRange(2, element.value.length);
  });
  await page.getByRole("button", { name: "Insert field" }).click();
  await page.getByRole("menuitem", { name: /^Title/ }).click();
  await expect(editor).toHaveValue("# {{title}}");
  await expect(editor).toBeFocused();

  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: () => Promise.reject(new Error("Clipboard denied")) },
    }),
  );
  const aiTrigger = page.getByRole("button", { name: "Get AI instructions" });
  await aiTrigger.click();
  const aiInstructions = page.getByLabel("AI template instructions");
  await page.getByRole("button", { name: "Copy instructions" }).click();
  await expect(aiInstructions).toBeFocused();
  await expect(aiInstructions).toHaveAccessibleDescription(
    /Press Ctrl\+C or Command\+C/,
  );
  expect(
    await aiInstructions.evaluate(
      (element: HTMLTextAreaElement) =>
        element.selectionStart === 0 &&
        element.selectionEnd === element.value.length,
    ),
  ).toBe(true);
  await captureAtlasState(page, "tag-printing-ai-manual-copy");
  await page.getByRole("button", { name: "Close" }).click();
  await expect(aiTrigger).toBeFocused();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: undefined,
    }),
  );
  await aiTrigger.click();
  await expect(page.getByRole("status")).toHaveCount(0);
  await page.getByRole("button", { name: "Copy instructions" }).click();
  await expect(aiInstructions).toBeFocused();
  await expect(page.getByRole("status")).toContainText(
    "Automatic copy is not available",
  );
  expect(
    await aiInstructions.evaluate(
      (element: HTMLTextAreaElement) =>
        element.selectionStart === 0 &&
        element.selectionEnd === element.value.length,
    ),
  ).toBe(true);
  await captureAtlasState(page, "tag-printing-mobile-ai-manual-copy");
  await page.getByRole("button", { name: "Close" }).click();
  await expect(aiTrigger).toBeFocused();
});
