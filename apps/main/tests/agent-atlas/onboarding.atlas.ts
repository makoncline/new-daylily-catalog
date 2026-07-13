import type { Page } from "@playwright/test";
import path from "node:path";
import { captureCheckpoint, expect, test } from "./atlas-test";

const draftKey = "daylily:onboarding-draft:v1";
const now = "2026-07-10T12:00:00.000Z";
type Step = "email" | "profile" | "listing" | "preview" | "checkout";

function draft(step: Step, filled: boolean) {
  return {
    version: 1,
    draftId: `atlas-${step}-${filled ? "filled" : "empty"}`,
    email: filled ? "atlas+clerk_test@example.com" : null,
    step,
    furthestStep: "checkout",
    createdAt: now,
    updatedAt: now,
    profile: {
      gardenName: filled ? "Sunrise Valley Daylilies" : "",
      location: filled ? "Fort Collins, Colorado" : "",
      description: filled
        ? "A small family garden growing colorful northern-hardy daylilies."
        : "",
      profileImageDataUrl: null,
      profileImageSource: filled ? "starter" : null,
      starterImageUrl: filled
        ? "/assets/onboarding-starter-images/Morning serenity along the garden path.png"
        : null,
      starterImageApplyNameOverlay: true,
    },
    listingPreview: {
      cultivarKey: "cr-ahs-176320",
      title: filled ? "Lemon Chiffon Cupcake Double Fan" : "",
      price: filled ? 24 : null,
      description: filled
        ? "Healthy dormant double fan with strong roots, ready for spring shipping."
        : "",
      imageDataUrl: null,
    },
  };
}

async function openDraftState(page: Page, step: Step, filled: boolean) {
  await page.addInitScript(
    ({ key, serialized }) => localStorage.setItem(key, serialized),
    { key: draftKey, serialized: JSON.stringify(draft(step, filled)) },
  );
  await page.goto(`/onboarding?step=${step}`);
  await expect(page.getByTestId("anonymous-onboarding-page")).toBeVisible();
  await page.waitForLoadState("networkidle", { timeout: 30_000 });
}

const states = [
  [
    "email",
    false,
    "onboarding-email-empty",
    "Email entry before lead information is supplied.",
  ],
  [
    "profile",
    false,
    "onboarding-profile-empty",
    "Profile builder with placeholders and starter-image choices.",
  ],
  [
    "profile",
    true,
    "onboarding-profile-filled",
    "Completed profile draft with realistic garden information and starter media.",
  ],
  [
    "listing",
    false,
    "onboarding-listing-empty",
    "First-listing builder before customization.",
  ],
  [
    "listing",
    true,
    "onboarding-listing-filled",
    "Completed first-listing draft with title, price, and description.",
  ],
  [
    "preview",
    true,
    "onboarding-catalog-preview",
    "Buyer-facing catalog and listing preview built from the draft.",
  ],
  [
    "checkout",
    true,
    "onboarding-checkout",
    "Final email confirmation and membership checkout state.",
  ],
] as const satisfies ReadonlyArray<readonly [Step, boolean, string, string]>;

for (const [step, filled, name, description] of states) {
  test(name, async ({ page }, testInfo) => {
    await openDraftState(page, step, filled);
    await captureCheckpoint(page, testInfo, name, description);
  });
}

test("onboarding email validation", async ({ page }, testInfo) => {
  await openDraftState(page, "email", false);
  const email = page.getByTestId("anonymous-onboarding-email");
  await email.click();
  await email.fill("not-an-email");
  await page
    .getByRole("heading", {
      name: "What email should we use for your account?",
    })
    .click();
  await expect(
    page.getByTestId("anonymous-onboarding-email-submit"),
  ).toBeDisabled();
  await captureCheckpoint(
    page,
    testInfo,
    "onboarding-email-invalid",
    "Invalid email entry with the primary action disabled.",
  );

  await email.fill("atlas+clerk_test@example.com");
  await expect(
    page.getByTestId("anonymous-onboarding-email-submit"),
  ).toBeEnabled();
  await captureCheckpoint(
    page,
    testInfo,
    "onboarding-email-valid",
    "Valid account email with the primary action ready to continue.",
  );
});

test("onboarding profile upload mode", async ({ page }, testInfo) => {
  await openDraftState(page, "profile", true);
  await page.getByTestId("anonymous-profile-image-mode-upload").click();
  await expect(
    page.getByTestId("anonymous-profile-image-dropzone"),
  ).toBeVisible();
  await captureCheckpoint(
    page,
    testInfo,
    "onboarding-profile-upload-mode",
    "Profile builder switched to the custom image-upload state.",
  );
});

test("onboarding profile image choices", async ({ page }, testInfo) => {
  await openDraftState(page, "profile", true);
  await page.getByTestId("anonymous-profile-image-mode-upload").click();
  await page
    .getByTestId("anonymous-profile-image")
    .setInputFiles(
      path.join(process.cwd(), "public/assets/catalog-blooms.webp"),
    );
  await expect(
    page.getByRole("button", { name: "Use cropped image" }),
  ).toBeVisible();
  await captureCheckpoint(
    page,
    testInfo,
    "onboarding-profile-image-crop",
    "Profile image cropper after choosing a real garden image.",
  );
  await page.getByRole("button", { name: "Cancel" }).click();

  await page.getByTestId("anonymous-profile-image-mode-starter").click();
  await page
    .getByTestId(
      "onboarding-starter-image-morning-serenity-along-the-garden-path",
    )
    .click();
  await captureCheckpoint(
    page,
    testInfo,
    "onboarding-profile-starter-selected",
    "Profile builder with an alternate starter garden image selected.",
  );

  const overlay = page.getByRole("checkbox", {
    name: "Stamp seller name onto starter image",
  });
  if (await overlay.isChecked()) await overlay.click();
  await captureCheckpoint(
    page,
    testInfo,
    "onboarding-profile-overlay-disabled",
    "Starter image preview with the seller-name overlay disabled.",
  );
});

test("onboarding first listing interactions", async ({ page }, testInfo) => {
  await openDraftState(page, "listing", true);
  await page.getByRole("button", { name: "Lemon Chiffon Cupcake" }).click();
  await captureCheckpoint(
    page,
    testInfo,
    "onboarding-listing-cultivar-selected",
    "First listing after selecting a representative cultivar.",
  );
  await page
    .getByTestId("anonymous-listing-image")
    .setInputFiles(
      path.join(process.cwd(), "public/assets/catalog-blooms.webp"),
    );
  await expect(
    page.getByRole("button", { name: "Use cropped image" }),
  ).toBeVisible();
  await captureCheckpoint(
    page,
    testInfo,
    "onboarding-listing-image-crop",
    "First-listing image cropper before the photo is accepted.",
  );
});

test("onboarding preview and checkout editing", async ({ page }, testInfo) => {
  await openDraftState(page, "preview", true);
  await page.getByTestId("anonymous-onboarding-step-profile").click();
  await expect(page).toHaveURL(/step=profile/);
  await captureCheckpoint(
    page,
    testInfo,
    "onboarding-return-to-edit",
    "Profile step reopened from the completed catalog preview.",
  );

  await openDraftState(page, "checkout", true);
  await page.getByRole("button", { name: /Edit email/i }).click();
  await expect(page.getByTestId("anonymous-checkout-email")).toBeVisible();
  await captureCheckpoint(
    page,
    testInfo,
    "onboarding-checkout-email-edit",
    "Checkout confirmation with the account email in editable mode.",
  );
});

test("onboarding draft survives reload", async ({ page }) => {
  await openDraftState(page, "profile", true);
  await expect(page.getByLabel("Seller name (shown to buyers)")).toHaveValue(
    "Sunrise Valley Daylilies",
  );
  await page.reload();
  await expect(page.getByLabel("Seller name (shown to buyers)")).toHaveValue(
    "Sunrise Valley Daylilies",
  );
});

test("hermetic checkout creates the catalog", async ({ page }, testInfo) => {
  test.skip(
    process.env.HERMETIC_MODE !== "1",
    "Checkout completion uses the guarded local checkout adapter.",
  );
  await openDraftState(page, "checkout", true);
  await page.getByRole("button", { name: /Edit email/i }).click();
  await page
    .getByTestId("anonymous-checkout-email")
    .fill("checkout-unpaid+clerk_test@hermetic.local");
  await page.getByTestId("anonymous-checkout-email-save").click();
  await expect(page.getByTestId("anonymous-checkout-email-value")).toHaveText(
    "checkout-unpaid+clerk_test@hermetic.local",
  );
  await page.getByTestId("anonymous-onboarding-checkout").click();
  await expect(page).toHaveURL(/\/onboarding\/checkout\/success\?session_id=/, {
    timeout: 30_000,
  });
  await captureCheckpoint(
    page,
    testInfo,
    "onboarding-checkout-success",
    "Successful local checkout return ready to create the purchased account.",
  );
  await captureCheckpoint(
    page,
    testInfo,
    "onboarding-account-verification",
    "Account verification step after a successful checkout return.",
  );
  await page.locator('[data-hermetic-persona="checkout-unpaid"]').click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
  await expect(page.getByTestId("dashboard-heading")).toBeVisible();
  await captureCheckpoint(
    page,
    testInfo,
    "onboarding-created-dashboard",
    "Newly claimed catalog opened in its authenticated dashboard.",
  );
});

test("hermetic checkout return failure", async ({ page }, testInfo) => {
  test.skip(
    process.env.HERMETIC_MODE !== "1",
    "Checkout return failures use the guarded local checkout adapter.",
  );
  await page.goto("/onboarding/checkout/success?session_id=missing-session");
  await expect(
    page.getByRole("heading", { name: "Checkout session not found" }),
  ).toBeVisible();
  await captureCheckpoint(
    page,
    testInfo,
    "membership-checkout-failure",
    "Checkout return when the referenced session cannot be found.",
    { allowExpectedErrors: true },
  );
});
