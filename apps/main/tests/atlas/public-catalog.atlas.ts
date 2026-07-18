import {
  captureAtlasState,
  expect,
  gotoExpectedDocument404,
  test,
} from "./atlas-test";
test("Catalog directory", async ({ page }) => {
  await page.goto("/catalogs");
  await expect(
    page.getByRole("heading", { name: "Daylily Catalogs" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "PlantFancyGardens, LLC" }),
  ).toBeVisible();
  await captureAtlasState(page, "catalog-directory");
});
test("Populated catalog", async ({ page }) => {
  await page.goto("/plantfancygardens");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "PlantFancyGardens",
  );
  await expect(
    page.getByRole("heading", { name: "Listings", exact: true }),
  ).toBeVisible();
  await captureAtlasState(page, "populated-catalog");
});
test("Search results", async ({ page }) => {
  await page.goto("/rollingoaksdaylilies/search?query=Absolute%20Ripper");
  await expect(page.getByPlaceholder("Search listings...")).toHaveValue(
    "Absolute Ripper",
  );
  await expect(
    page.getByRole("heading", { name: "Absolute Ripper" }),
  ).toBeVisible();
  await captureAtlasState(page, "search-results");
});
test("Advanced filters", async ({ page }) => {
  await page.goto(
    "/rollingoaksdaylilies/search?mode=advanced&price=true&hasPhoto=true",
  );
  await expect(page.getByRole("switch", { name: "Advanced" })).toBeChecked();
  await expect(
    page.getByRole("heading", { name: "Bloom Traits" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Classification & Details" }),
  ).toBeVisible();
  await captureAtlasState(page, "advanced-filters");
});
test("No results", async ({ page }) => {
  await page.goto("/rollingoaksdaylilies/search?query=no-such-daylily");
  await expect(page.getByText("No listings found")).toBeVisible();
  await captureAtlasState(page, "no-results");
});
test("Search page two", async ({ page }) => {
  await page.goto("/rollingoaksdaylilies/search");
  await expect(page.getByTestId("pager-per-page")).toContainText("12");
  await page.getByTestId("pager-next").click();
  await expect(page.getByTestId("pager-page-indicator")).toContainText(
    "Page 2 of",
  );
  await captureAtlasState(page, "search-page-two");
});
test("Listing detail", async ({ page }) => {
  await page.goto("/plantfancygardens/woodside-debutante");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Woodside Debutante",
  );
  await expect(
    page.getByRole("button", { name: "Contact Seller", exact: true }),
  ).toBeVisible();
  await captureAtlasState(page, "listing-detail");
});
test("Alternate listing image", async ({ page }) => {
  await page.goto("/plantfancygardens/woodside-debutante");
  const thumbnails = page.getByRole("button", {
    name: "Woodside Debutante thumbnail",
  });
  await expect(thumbnails).toHaveCount(4);
  await thumbnails.nth(1).click();
  await expect(thumbnails.nth(1)).toHaveClass(/ring-primary/);
  await captureAtlasState(page, "listing-alternate-image");
});
test("Unavailable listing", async ({ page }) => {
  await gotoExpectedDocument404(page, "/plantfancygardens/not-a-real-listing");
  await expect(
    page.getByRole("heading", { name: "Page Not Found" }),
  ).toBeVisible();
  await captureAtlasState(page, "listing-unavailable");
});
