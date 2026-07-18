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
    page.getByRole("heading", { name: "Choose a template" }),
  ).toBeVisible({ timeout: 30_000 });

  const filter = page.getByPlaceholder("Filter listings to tag...");
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
  await openTagsWithMixedListings(page);

  const gardenId = page.getByRole("button", { name: /Garden ID/i });
  await expect(gardenId).toHaveAttribute("aria-pressed", "true");
  await captureAtlasState(page, "tag-printing-garden-id");

  await page.getByRole("button", { name: /Simple name/i }).click();
  await captureAtlasState(page, "tag-printing-simple-name");

  await page.getByRole("button", { name: /Sale tag/i }).click();
  await captureAtlasState(page, "tag-printing-sale-tag");

  await page.getByRole("button", { name: /Grower details/i }).click();
  await expect(page.getByLabel("Tag Size")).toHaveValue("card-2x4");
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
});
