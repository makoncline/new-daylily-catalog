import type { Page } from "@playwright/test";
import { captureAtlasState, expect, test } from "./atlas-test";

const desktop = { height: 768, width: 1024 };
const mobile = { height: 874, width: 402 };

async function openSearch(
  page: Page,
  viewport: typeof desktop,
  url: string,
) {
  await page.setViewportSize(viewport);
  await page.goto(url);
  await expect(
    page.getByRole("heading", {
      name: "Search over 100,000 daylily cultivars",
    }),
  ).toBeVisible();
}

async function expectCoffeeFrenzy(page: Page) {
  await expect(
    page.getByRole("heading", { name: "Coffee Frenzy", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("status")).toContainText("1 shown");
}

test("Desktop cultivar browse", async ({ page }) => {
  await openSearch(page, desktop, "/cultivars");
  await expect(
    page.getByRole("heading", { name: "Browse cultivars" }),
  ).toBeVisible();
  await expect(page.getByRole("status")).toContainText("24 shown");
  await captureAtlasState(page, "cultivar-search-desktop-base");
});

test("Mobile cultivar browse", async ({ page }) => {
  await openSearch(page, mobile, "/cultivars");
  await expect(
    page.getByRole("heading", { name: "Browse cultivars" }),
  ).toBeVisible();
  await expect(page.getByRole("status")).toContainText("24 shown");
  await captureAtlasState(page, "cultivar-search-mobile-base");
});

test("Desktop cultivar results", async ({ page }) => {
  await openSearch(page, desktop, "/cultivars?q=Coffee%20Frenzy");
  await expectCoffeeFrenzy(page);
  await captureAtlasState(page, "cultivar-search-desktop-results");
});

test("Mobile cultivar results", async ({ page }) => {
  await openSearch(page, mobile, "/cultivars?q=Coffee%20Frenzy");
  await expectCoffeeFrenzy(page);
  await captureAtlasState(page, "cultivar-search-mobile-results");
});

test("Desktop no results", async ({ page }) => {
  await openSearch(
    page,
    desktop,
    "/cultivars?q=no-such-daylily-cultivar",
  );
  await expect(
    page.getByRole("heading", { name: "No cultivars found" }),
  ).toBeVisible();
  await captureAtlasState(page, "cultivar-search-desktop-empty");
});

test("Mobile no results", async ({ page }) => {
  await openSearch(
    page,
    mobile,
    "/cultivars?q=no-such-daylily-cultivar",
  );
  await expect(
    page.getByRole("heading", { name: "No cultivars found" }),
  ).toBeVisible();
  await captureAtlasState(page, "cultivar-search-mobile-empty");
});

test("Desktop advanced cultivar filters", async ({ page }) => {
  await openSearch(
    page,
    desktop,
    "/cultivars?advanced=true&q=Coffee%20Frenzy",
  );
  await expectCoffeeFrenzy(page);
  await expect(page.getByTestId("advanced-filter-cultivar-name")).toBeVisible();
  await captureAtlasState(page, "cultivar-search-desktop-advanced");
});

test("Mobile advanced cultivar filters", async ({ page }) => {
  await openSearch(
    page,
    mobile,
    "/cultivars?advanced=true&q=Coffee%20Frenzy",
  );
  await expectCoffeeFrenzy(page);
  await expect(page.getByTestId("advanced-filter-cultivar-name")).toBeVisible();
  await captureAtlasState(page, "cultivar-search-mobile-advanced");
});

test("Desktop photo-filtered cultivars", async ({ page }) => {
  await openSearch(
    page,
    desktop,
    "/cultivars?hasCultivarPhoto=true&q=Coffee%20Frenzy",
  );
  await expectCoffeeFrenzy(page);
  await expect(page.getByTestId("cultivar-filter-has-photo")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await captureAtlasState(page, "cultivar-search-desktop-filtered");
});

test("Mobile photo-filtered cultivars", async ({ page }) => {
  await openSearch(
    page,
    mobile,
    "/cultivars?hasCultivarPhoto=true&q=Coffee%20Frenzy",
  );
  await expectCoffeeFrenzy(page);
  await expect(page.getByTestId("cultivar-filter-has-photo")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await captureAtlasState(page, "cultivar-search-mobile-filtered");
});

async function openCoffeeFrenzyInfoCard(
  page: Page,
  viewport: typeof desktop,
) {
  await openSearch(page, viewport, "/cultivars?q=Coffee%20Frenzy");
  await expectCoffeeFrenzy(page);
  const detailsButton = page.getByRole("button", {
    name: "Show full details for Coffee Frenzy",
  });
  await detailsButton.evaluate((element) =>
    element.scrollIntoView({ block: "end" }),
  );
  await detailsButton.click();
  await expect(page.getByText("Cultivar details", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Open full cultivar page" }),
  ).toBeVisible();
}

test("Desktop cultivar info card", async ({ page }) => {
  await openCoffeeFrenzyInfoCard(page, desktop);
  await captureAtlasState(page, "cultivar-search-desktop-info-card");
});

test("Mobile cultivar info card", async ({ page }) => {
  await openCoffeeFrenzyInfoCard(page, mobile);
  await captureAtlasState(page, "cultivar-search-mobile-info-card");
});

test("Desktop cultivar detail", async ({ page }) => {
  await page.setViewportSize(desktop);
  await page.goto("/cultivar/coffee-frenzy");
  await expect(
    page.getByRole("heading", { name: "Coffee Frenzy", exact: true }),
  ).toBeVisible();
  await captureAtlasState(page, "cultivar-search-desktop-detail");
});

test("Mobile cultivar detail", async ({ page }) => {
  await page.setViewportSize(mobile);
  await page.goto("/cultivar/coffee-frenzy");
  await expect(
    page.getByRole("heading", { name: "Coffee Frenzy", exact: true }),
  ).toBeVisible();
  await captureAtlasState(page, "cultivar-search-mobile-detail");
});
