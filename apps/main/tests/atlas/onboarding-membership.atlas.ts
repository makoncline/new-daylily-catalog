import type { Page } from "@playwright/test";
import { SUBSCRIPTION_CONFIG } from "@/config/subscription-config";
import { captureAtlasState, expect, test } from "./atlas-test";

async function mockCultivarMatches(page: Page) {
  await page.route("**/api/v1/cultivars/match", async (route) => {
    const payload = route.request().postDataJSON() as { names: string[] };
    const results = payload.names.map((name, index) => {
      const normalizedName = name.trim().toLowerCase();
      const candidate = {
        awardNames: null,
        bloomSizeIn: 5,
        bloomSeason: "Midseason",
        color: "Example color",
        confidence: 100,
        cultivarReferenceId: `onboarding-${index}`,
        displayName: name,
        form: "Single",
        hybridizer: "Example",
        imageAsset: null,
        imageUrl: null,
        listingCount: 0,
        normalizedName,
        ploidy: "Diploid",
        rebloom: true,
        scapeHeightIn: 24,
        year: 2020,
      };

      return {
        candidates: [candidate],
        exactMatch: candidate,
        inputName: name,
        normalizedInput: normalizedName,
      };
    });

    await route.fulfill({
      body: JSON.stringify({ results }),
      contentType: "application/json",
      status: 200,
    });
  });
}

async function openImporterResults(page: Page) {
  await mockCultivarMatches(page);
  await page.goto("/catalog-importer");
  await page.getByRole("button", { name: "Use sample catalog" }).click();
  await page.getByRole("button", { name: "Build catalog preview" }).click();
  await expect(
    page.getByRole("region", { name: "Catalog preview ready" }),
  ).toBeVisible();
}

test("Membership offer", async ({ page }) => {
  await page.goto("/start-membership");
  await expect(
    page.getByRole("heading", {
      name: "Your whole daylily catalog. One link buyers can browse.",
    }),
  ).toBeVisible();
  await captureAtlasState(page, "onboarding-membership-offer");
});

test("Importer start", async ({ page }) => {
  await page.goto("/catalog-importer");
  await expect(
    page.getByRole("heading", {
      name: "Turn the catalog you already have into one buyers can browse",
    }),
  ).toBeVisible();
  await captureAtlasState(page, "onboarding-importer-start");
});

test("Importer results", async ({ page }) => {
  await openImporterResults(page);
  await expect(
    page.getByRole("heading", { name: "Publish this catalog with Pro" }),
  ).toBeVisible();
  await captureAtlasState(page, "onboarding-importer-results");
});

test("Download or publish", async ({ page }) => {
  await openImporterResults(page);
  await page.getByRole("button", { name: "Finish" }).click();
  await expect(
    page.getByRole("heading", { name: "Publish your catalog" }),
  ).toBeVisible();
  await captureAtlasState(page, "onboarding-importer-choice");
});

test("Importer checkout", async ({ page }) => {
  await page.goto(
    "/catalog-importer/checkout?conversion_id=12a94b5f-3da4-4d28-b6df-76f8f4bc8392&entry=catalog_importer&return_to=%2Fcatalog-importer",
  );
  await expect(
    page.getByRole("heading", {
      name: SUBSCRIPTION_CONFIG.COPY.CHECKOUT.TITLE,
    }),
  ).toBeVisible();
  await expect(page.getByLabel("Email address")).toBeVisible();
  await captureAtlasState(page, "onboarding-importer-checkout");
});
