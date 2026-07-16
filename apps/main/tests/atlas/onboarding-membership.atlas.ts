import path from "node:path";
import type { Page } from "@playwright/test";
import {
  ANONYMOUS_ONBOARDING_DRAFT_KEY,
  createAnonymousOnboardingDraft,
  type AnonymousOnboardingDraft,
  type AnonymousOnboardingStepId,
} from "../../src/app/onboarding/anonymous-onboarding-draft";
import { captureAtlasState, expect, test } from "./atlas-test";

const email = "atlas-grower@example.test";
const uploadPath = path.resolve(
  import.meta.dirname,
  "../../public/assets/catalog-blooms.webp",
);

function draftAt(step: AnonymousOnboardingStepId): AnonymousOnboardingDraft {
  const draft = createAnonymousOnboardingDraft({
    email,
    step,
    furthestStep: step,
  });

  return {
    ...draft,
    profile: {
      ...draft.profile,
      gardenName: "Atlas Daylilies",
      location: "Olympia, WA",
      description:
        "Small grower catalog focused on clear photos and seasonal availability.",
    },
    listingPreview: {
      ...draft.listingPreview,
      title: "Coffee Frenzy Spring Double Fan",
      price: 32,
      description: "Healthy double fan ready for local pickup or shipping.",
    },
  };
}

async function openDraft(
  page: Page,
  step: AnonymousOnboardingStepId,
  draft = draftAt(step),
) {
  await page.addInitScript(
    ({ key, value }) => window.localStorage.setItem(key, value),
    { key: ANONYMOUS_ONBOARDING_DRAFT_KEY, value: JSON.stringify(draft) },
  );
  await page.goto(`/onboarding?step=${step}`);
  await expect(page.getByTestId("anonymous-onboarding-page")).toBeVisible();
  await expect(
    page.getByTestId("anonymous-onboarding-step-content"),
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

test("Email empty", async ({ page }) => {
  await page.goto("/onboarding?step=email");
  await expect(page.getByTestId("anonymous-onboarding-page")).toBeVisible();
  await expect(
    page.getByTestId("anonymous-onboarding-email-submit"),
  ).toBeDisabled();
  await captureAtlasState(page, "onboarding-email-empty");
});

test("Email invalid", async ({ page }) => {
  await page.goto("/onboarding?step=email");
  await page.getByTestId("anonymous-onboarding-email").fill("not-an-email");
  await expect(
    page.getByTestId("anonymous-onboarding-email-submit"),
  ).toBeDisabled();
  await captureAtlasState(page, "onboarding-email-invalid");
});

test("Email valid", async ({ page }) => {
  await page.goto("/onboarding?step=email");
  await page.getByTestId("anonymous-onboarding-email").fill(email);
  await expect(
    page.getByTestId("anonymous-onboarding-email-submit"),
  ).toBeEnabled();
  await captureAtlasState(page, "onboarding-email-valid");
});

test("Profile defaults", async ({ page }) => {
  const draft = createAnonymousOnboardingDraft({
    email,
    step: "profile",
    furthestStep: "profile",
  });
  await openDraft(page, "profile", draft);
  await expect(
    page.getByRole("heading", { name: "Edit your profile" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Dew-Kissed Leaf" }),
  ).toHaveAttribute("aria-pressed", "true");
  await captureAtlasState(page, "onboarding-profile-default");
});

test("Profile customized", async ({ page }) => {
  await openDraft(page, "profile");
  const gardenPath = page.getByRole("button", { name: "Garden Path" });
  await expect(gardenPath).toBeEnabled();
  await gardenPath.click();
  await expect(gardenPath).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("anonymous-profile-name")).toHaveValue(
    "Atlas Daylilies",
  );
  await captureAtlasState(page, "onboarding-profile-custom");
});

test("Profile upload", async ({ page }) => {
  await openDraft(page, "profile");
  await page.getByTestId("anonymous-profile-image-mode-upload").click();
  await expect(
    page.getByTestId("anonymous-profile-image-dropzone"),
  ).toBeVisible();
  await captureAtlasState(page, "onboarding-profile-upload");
});

test("Profile crop", async ({ page }) => {
  await openDraft(page, "profile");
  await page.getByTestId("anonymous-profile-image-mode-upload").click();
  await page.getByTestId("anonymous-profile-image").setInputFiles(uploadPath);
  await expect(page.getByRole("img", { name: "Crop preview" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Use cropped image" }),
  ).toBeVisible();
  await captureAtlasState(page, "onboarding-profile-crop");
});

test("Listing defaults", async ({ page }) => {
  const draft = createAnonymousOnboardingDraft({
    email,
    step: "listing",
    furthestStep: "listing",
  });
  await openDraft(page, "listing", draft);
  await expect(
    page.getByRole("heading", { name: "Edit your first listing" }),
  ).toBeVisible();
  await expect(page.getByText("Example only", { exact: true })).toBeVisible();
  await captureAtlasState(page, "onboarding-listing-default");
});

test("Listing customized", async ({ page }) => {
  await openDraft(page, "listing");
  await page.getByRole("button", { name: "Lemon Chiffon Cupcake" }).click();
  await page
    .getByTestId("anonymous-listing-title")
    .fill("Lemon Chiffon Cupcake Double Fan");
  await expect(page.getByTestId("anonymous-listing-title")).toHaveValue(
    "Lemon Chiffon Cupcake Double Fan",
  );
  await captureAtlasState(page, "onboarding-listing-custom");
});

test("Listing upload", async ({ page }) => {
  await openDraft(page, "listing");
  await expect(
    page.getByTestId("anonymous-listing-image-dropzone"),
  ).toBeVisible();
  await captureAtlasState(page, "onboarding-listing-upload");
});

test("Listing crop", async ({ page }) => {
  await openDraft(page, "listing");
  await page.getByTestId("anonymous-listing-image").setInputFiles(uploadPath);
  await expect(page.getByRole("img", { name: "Crop preview" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Use cropped image" }),
  ).toBeVisible();
  await captureAtlasState(page, "onboarding-listing-crop");
});

test("Catalog preview", async ({ page }) => {
  await openDraft(page, "preview");
  await expect(
    page.getByText(
      "Path 1: Buyer opens your catalog and sends an email immediately.",
    ),
  ).toBeVisible();
  await expect(
    page.getByText("Atlas Daylilies", { exact: true }),
  ).toBeVisible();
  await captureAtlasState(page, "onboarding-catalog-preview");
});

test("Checkout review", async ({ page }) => {
  await openDraft(page, "checkout");
  await expect(
    page.getByRole("heading", { name: "Confirm your account email" }),
  ).toBeVisible();
  await expect(page.getByTestId("anonymous-checkout-email-value")).toHaveText(
    email,
  );
  await expect(page.getByTestId("anonymous-onboarding-checkout")).toBeEnabled();
  await captureAtlasState(page, "onboarding-checkout-review");
});
