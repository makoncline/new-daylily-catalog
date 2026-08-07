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

async function mockSignedInNonProViewer(page: Page) {
  await page.route("**/api/catalog-importer/viewer-state", async (route) => {
    await route.fulfill({
      body: JSON.stringify({ viewerState: "signed_in_nonpro" }),
      contentType: "application/json",
      status: 200,
    });
  });
}

test("Membership offer", async ({ page }) => {
  await page.goto("/start-membership");
  await expect(
    page.getByRole("heading", {
      name: "Your whole daylily catalog. One link buyers can browse.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      exact: true,
      name: "Publish when you are ready",
    }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Build and preview your catalog first. Choose a membership when you are ready to publish.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Create your catalog" }).first(),
  ).toHaveAttribute("href", "/catalog-importer");
  await expect(page.locator("body")).not.toContainText(/\btrial\b/i);
  await expect(page.locator("body")).not.toContainText(/\$\s*\d/);
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
  await expect(
    page.getByRole("button", {
      name: SUBSCRIPTION_CONFIG.COPY.CTA.CONTINUE_TO_CHECKOUT,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Choose monthly or yearly securely in Stripe."),
  ).toBeVisible();
  await captureAtlasState(page, "onboarding-importer-choice");
});

test("Signed-in importer handoff", async ({ page }) => {
  await mockSignedInNonProViewer(page);
  await openImporterResults(page);
  await page.getByRole("button", { name: "Finish" }).click();
  await expect(
    page.getByRole("heading", { name: "Publish your catalog" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Continue to dashboard importer" }),
  ).toHaveAttribute("href", "/dashboard/imports");
  await expect(
    page.getByRole("button", {
      name: SUBSCRIPTION_CONFIG.COPY.CTA.CONTINUE_TO_CHECKOUT,
    }),
  ).not.toBeVisible();
  await expect(
    page.getByText("Choose monthly or yearly securely in Stripe."),
  ).not.toBeVisible();
  await captureAtlasState(page, "onboarding-importer-signed-in-finish");
});
