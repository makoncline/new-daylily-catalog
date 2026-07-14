import { captureCheckpoint, expect, test } from "./atlas-test";

test.setTimeout(120_000);

test("public catalog browsing states", async ({ page }, testInfo) => {
  test.skip(
    process.env.HERMETIC_MODE === "1",
    "Canonical public flow uses the realistic catalog snapshot.",
  );

  await page.goto("/rollingoaksdaylilies/search");
  await expect(page.getByTestId("advanced-search-panel")).toBeVisible();
  await page.getByTestId("search-mode-switch").click();
  await expect(page.getByText("Bloom Traits", { exact: true })).toBeVisible();
  await captureCheckpoint(
    page,
    testInfo,
    "public-catalog-advanced-filters",
    "Public catalog search with its complete advanced filter surface expanded.",
    { viewportOnly: true },
  );

  await page.goto("/rollingoaksdaylilies/search?query=no-such-daylily");
  await expect(page.getByText("No listings found")).toBeVisible();
  await captureCheckpoint(
    page,
    testInfo,
    "public-catalog-no-results",
    "Public catalog search when no listings match the buyer query.",
  );

  await page.goto("/rollingoaksdaylilies/page/2");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "RollingOaksDaylilies",
  );
  await captureCheckpoint(
    page,
    testInfo,
    "public-catalog-pagination",
    "Second page of a production-sized public catalog.",
    { viewportOnly: true },
  );

  await page.goto("/plantfancygardens/woodside-debutante");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Woodside Debutante",
  );
  const thumbnails = page.getByRole("button").filter({
    has: page.getByAltText("Woodside Debutante thumbnail"),
  });
  await expect(thumbnails).toHaveCount(4);
  await thumbnails.nth(1).click();
  await captureCheckpoint(
    page,
    testInfo,
    "public-listing-alternate-image",
    "Listing detail after the buyer selects another image from the gallery.",
  );

  await page.goto("/plantfancygardens/not-a-real-listing");
  await expect(page.getByText(/not found/i).first()).toBeVisible();
  await captureCheckpoint(
    page,
    testInfo,
    "public-listing-unavailable",
    "Public result when a listing is missing, hidden, or otherwise unavailable.",
  );
});
