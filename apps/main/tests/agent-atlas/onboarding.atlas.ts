import type { Page } from "@playwright/test";
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
      description: filled ? "A small family garden growing colorful northern-hardy daylilies." : "",
      profileImageDataUrl: null,
      profileImageSource: filled ? "starter" : null,
      starterImageUrl: filled ? "/assets/onboarding-starter-images/Morning serenity along the garden path.png" : null,
      starterImageApplyNameOverlay: true,
    },
    listingPreview: {
      cultivarKey: "cr-ahs-176320",
      title: filled ? "Lemon Chiffon Cupcake Double Fan" : "",
      price: filled ? 24 : null,
      description: filled ? "Healthy dormant double fan with strong roots, ready for spring shipping." : "",
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
}

const states = [
  ["email", false, "onboarding-email-empty", "Email entry before lead information is supplied."],
  ["profile", false, "onboarding-profile-empty", "Profile builder with placeholders and starter-image choices."],
  ["profile", true, "onboarding-profile-filled", "Completed profile draft with realistic garden information and starter media."],
  ["listing", false, "onboarding-listing-empty", "First-listing builder before customization."],
  ["listing", true, "onboarding-listing-filled", "Completed first-listing draft with title, price, and description."],
  ["preview", true, "onboarding-catalog-preview", "Buyer-facing catalog and listing preview built from the draft."],
  ["checkout", true, "onboarding-checkout", "Final email confirmation and membership checkout state."],
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
  await page.getByRole("heading", { name: "What email should we use for your account?" }).click();
  await expect(page.getByTestId("anonymous-onboarding-email-submit")).toBeDisabled();
  await captureCheckpoint(page, testInfo, "onboarding-email-invalid", "Invalid email entry with the primary action disabled.");
});

test("onboarding profile upload mode", async ({ page }, testInfo) => {
  await openDraftState(page, "profile", true);
  await page.getByTestId("anonymous-profile-image-mode-upload").click();
  await expect(page.getByTestId("anonymous-profile-image-dropzone")).toBeVisible();
  await captureCheckpoint(page, testInfo, "onboarding-profile-upload-mode", "Profile builder switched to the custom image-upload state.");
});
