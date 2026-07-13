import { captureCheckpoint, expect, test } from "./atlas-test";
import path from "node:path";
import { DashboardProfile } from "../e2e/pages/dashboard-profile";
import { ImageManager } from "../e2e/pages/image-manager";

test.setTimeout(120_000);

test("new member setup states", async ({ page }, testInfo) => {
  test.skip(
    process.env.HERMETIC_MODE !== "1" ||
      !["hermetic-new-unpaid", "rolling-oaks"].includes(testInfo.project.name),
    "New-account variants are deterministic hermetic states.",
  );

  if (testInfo.project.name === "hermetic-new-unpaid") {
    await page.goto("/dashboard");
    await expect(page.getByTestId("dashboard-heading")).toBeVisible();
    await captureCheckpoint(
      page,
      testInfo,
      "new-member-empty-dashboard",
      "Brand-new unpaid member dashboard with no catalog inventory.",
    );
    await expect(
      page.getByTestId("dashboard-profile-completion-card"),
    ).toBeVisible();
    await captureCheckpoint(
      page,
      testInfo,
      "new-member-profile-prompt",
      "Dashboard prompt guiding a new member to complete their profile.",
    );
    await expect(
      page.getByTestId("dashboard-catalog-progress-card"),
    ).toBeVisible();
    await captureCheckpoint(
      page,
      testInfo,
      "new-member-catalog-prompt",
      "Dashboard catalog-progress prompt before the first listing.",
    );

    await page.goto("/dashboard/profile");
    const gardenName = page.getByLabel("Garden Name");
    await gardenName.fill("Partly Finished Hermetic Garden");
    await captureCheckpoint(
      page,
      testInfo,
      "new-member-profile-progress",
      "New member profile partially completed but not yet saved.",
    );
    return;
  }

  await page.goto("/dashboard/listings");
  await expect(page.getByTestId("listing-table")).toBeVisible();
  await captureCheckpoint(
    page,
    testInfo,
    "new-member-first-listing",
    "Member listings workspace after catalog inventory exists.",
  );
  await page.goto("/dashboard/lists");
  await expect(page.getByTestId("list-table")).toBeVisible();
  await captureCheckpoint(
    page,
    testInfo,
    "new-member-first-list",
    "Member list workspace after the first buyer-facing grouping exists.",
  );
  await page.goto("/dashboard?subscriptionSynced=1");
  await expect(page.getByTestId("dashboard-heading")).toBeVisible();
  await captureCheckpoint(
    page,
    testInfo,
    "new-member-completed-dashboard",
    "Completed member dashboard with profile, listings, and lists present.",
  );
  await captureCheckpoint(
    page,
    testInfo,
    "membership-subscribe-success",
    "Active dashboard after a successful subscription synchronization return.",
  );
});

test("billing account variants", async ({ page }, testInfo) => {
  test.skip(
    process.env.HERMETIC_MODE !== "1" ||
      !["hermetic-billing-past-due", "hermetic-billing-canceled"].includes(
        testInfo.project.name,
      ),
    "Billing variants are deterministic hermetic states.",
  );
  await page.goto("/dashboard");
  await expect(page.getByTestId("dashboard-heading")).toBeVisible();
  if (testInfo.project.name === "hermetic-billing-past-due") {
    await expect(page.getByTestId("dashboard-billing-alert")).toBeVisible();
    await captureCheckpoint(
      page,
      testInfo,
      "membership-past-due",
      "Dashboard warning and update-billing action for a past-due member.",
    );
  } else {
    await expect(
      page.getByTestId("dashboard-pro-membership-card"),
    ).toBeVisible();
    await captureCheckpoint(
      page,
      testInfo,
      "membership-inactive",
      "Canceled member dashboard offering a path back to Pro membership.",
    );
  }
});

test("free tier upgrade limit", async ({ page }, testInfo) => {
  test.skip(
    process.env.HERMETIC_MODE !== "1" ||
      testInfo.project.name !== "hermetic-free-at-limit",
    "The free-at-limit seller is seeded at the production free-tier limit.",
  );
  await page.goto("/dashboard/listings");
  await expect(page.getByTestId("listing-table")).toBeVisible();
  await page.getByTestId("create-listing-button").click();
  await expect(
    page.getByRole("heading", { name: "Upgrade Required" }),
  ).toBeVisible();
  await captureCheckpoint(
    page,
    testInfo,
    "membership-upgrade-required",
    "Free-tier owner sees the real upgrade dialog after reaching the listing limit.",
  );
});

test("profile content, image, and failure states", async ({
  page,
}, testInfo) => {
  test.skip(
    process.env.HERMETIC_MODE !== "1" ||
      testInfo.project.name !== "hermetic-profile-editor",
    "The profile-editor persona owns deterministic editable content and media.",
  );
  const profile = new DashboardProfile(page);
  const images = new ImageManager(page);
  await profile.goto();
  await profile.isReady();
  await expect(profile.contentEditor).toBeVisible({ timeout: 30_000 });
  await profile.contentEditor.scrollIntoViewIfNeeded();
  await captureCheckpoint(
    page,
    testInfo,
    "profile-content-editor",
    "Member profile rich-content editor ready for catalog storytelling.",
  );

  await page
    .locator("#image-upload-input")
    .setInputFiles(
      path.join(process.cwd(), "public/assets/catalog-blooms.webp"),
    );
  await expect(
    page.getByRole("button", { name: "Upload", exact: true }),
  ).toBeVisible();
  await captureCheckpoint(
    page,
    testInfo,
    "profile-image-crop",
    "Profile garden photograph in the cropper before upload.",
  );
  await page.getByRole("button", { name: "Cancel" }).click();

  const firstImage = (await images.imageOrderIds())[0]!;
  await images.imageDeleteButtonById(firstImage).click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await captureCheckpoint(
    page,
    testInfo,
    "profile-image-delete-confirmation",
    "Confirmation before removing a garden image from the public profile.",
  );
  await page.keyboard.press("Escape");

  await profile.gardenNameInput.fill("Unsaved failure preview");
  await page.route("**/api/trpc/dashboardDb.userProfile.update*", (route) =>
    route.abort("connectionfailed"),
  );
  await profile.saveChangesButton.click();
  await expect(
    page.getByText("Failed to save changes", { exact: true }),
  ).toBeVisible();
  await captureCheckpoint(
    page,
    testInfo,
    "profile-save-failure",
    "Profile form retaining unsaved input after an update failure.",
    { allowExpectedErrors: true },
  );
});
