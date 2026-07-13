import { captureCheckpoint, expect, test } from "./atlas-test";
import { DashboardLists } from "../e2e/pages/dashboard-lists";

test.setTimeout(180_000);

test.beforeEach(({}, testInfo) => {
  test.skip(
    testInfo.project.name !== "rolling-oaks" ||
      process.env.HERMETIC_MODE === "1",
    "The realistic Rolling Oaks persona supplies member operations data.",
  );
});

test("active membership controls", async ({ page }, testInfo) => {
  await page.goto("/dashboard");
  await expect(
    page.getByText("prodlike+clerk_test_rollingoaks@example.com").first(),
  ).toBeAttached({ timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({
    timeout: 30_000,
  });
  const accountTrigger = page
    .getByRole("button")
    .filter({ hasText: "prodlike+clerk_test_rollingoaks@example.com" });
  await accountTrigger.click();
  await expect(
    page.getByRole("menuitem", { name: "Manage Subscription" }),
  ).toBeVisible();
  await captureCheckpoint(
    page,
    testInfo,
    "active-membership-controls",
    "Active member account menu with subscription management available.",
  );
});

test("delete list confirmation", async ({ page }, testInfo) => {
  const lists = new DashboardLists(page);
  await lists.goto();
  await lists.isReady();
  await lists.openFirstVisibleRowActions();
  await page.getByTestId("list-row-action-delete").click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await captureCheckpoint(
    page,
    testInfo,
    "delete-list-confirmation",
    "Confirmation before permanently deleting a catalog list.",
  );
});

test("list and profile states", async ({ page }, testInfo) => {
  const lists = new DashboardLists(page);
  const subscriptionReady = page.waitForResponse((response) =>
    decodeURIComponent(response.url()).includes("stripe.getSubscription"),
  );
  await lists.goto();
  await lists.isReady();
  await subscriptionReady;
  await lists.createListButton.click();
  const createDialog = page.getByRole("dialog").filter({
    has: page.getByRole("heading", { name: "Create New List" }),
  });
  await createDialog
    .getByPlaceholder("Enter a title")
    .fill("Spring Introductions");
  await expect(
    createDialog.getByRole("button", { name: "Create List" }),
  ).toBeEnabled();
  await captureCheckpoint(
    page,
    testInfo,
    "create-list-details-completed",
    "Create List with a useful title and enabled confirmation.",
  );
  await createDialog.getByRole("button", { name: "Cancel" }).click();

  await lists.openFirstVisibleRowActions();
  await page.getByTestId("list-row-action-edit").click();
  await expect(lists.editDialog()).toBeVisible();
  await captureCheckpoint(
    page,
    testInfo,
    "saved-list-details",
    "A persisted real list opened for editing.",
  );
  await lists.closeEditDialog();

  await page.goto("/dashboard/profile");
  await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();
  const gardenName = page.getByLabel("Garden Name");
  const originalGardenName = await gardenName.inputValue();
  await gardenName.fill(`${originalGardenName} — unsaved preview`);
  await expect(
    page.getByRole("button", { name: "Save Changes" }),
  ).toBeEnabled();
  await captureCheckpoint(
    page,
    testInfo,
    "profile-unsaved-changes",
    "Profile form with a visible unsaved garden-name change.",
  );
  let releaseProfileSave: (() => void) | undefined;
  const profileSaveReleased = new Promise<void>((resolve) => {
    releaseProfileSave = resolve;
  });
  await page.route(
    "**/api/trpc/dashboardDb.userProfile.update*",
    async (route) => {
      await profileSaveReleased;
      await route.continue();
    },
  );
  const profileSave = page
    .getByRole("button", { name: "Save Changes" })
    .click();
  await expect(gardenName).toBeDisabled();
  await captureCheckpoint(
    page,
    testInfo,
    "profile-saving",
    "Profile form locked while the real profile update is pending.",
  );
  releaseProfileSave?.();
  await profileSave;
  await page.unroute("**/api/trpc/dashboardDb.userProfile.update*");
  await expect(page.getByText("Changes saved", { exact: true })).toBeVisible();
  await captureCheckpoint(
    page,
    testInfo,
    "profile-save-success",
    "Profile after a successful save with visible confirmation.",
  );

  await gardenName.fill(originalGardenName);
  await gardenName.blur();
  await page.getByRole("button", { name: "Save Changes" }).click();
  await expect(page.getByText("Changes saved", { exact: true })).toBeVisible();

  const imageSection = page.getByText("Profile Images", { exact: true });
  await imageSection.scrollIntoViewIfNeeded();
  await captureCheckpoint(
    page,
    testInfo,
    "profile-images-section",
    "Profile image management with real garden images and upload affordance.",
  );
});

test("tag design states", async ({ page }, testInfo) => {
  await page.goto("/dashboard/tags");
  await expect(page.getByRole("heading", { name: "Tags" })).toBeVisible({
    timeout: 30_000,
  });
  const rowCheckboxes = page.getByRole("checkbox", { name: "Select row" });
  await expect(rowCheckboxes).not.toHaveCount(0);
  await rowCheckboxes.nth(0).check();
  await rowCheckboxes.nth(1).check();
  await expect(page.getByText("Selected (2):", { exact: true })).toBeVisible();
  await captureCheckpoint(
    page,
    testInfo,
    "tag-listings-selected",
    "Tag designer with two real listings selected and populated previews.",
  );

  await page.locator("#tag-size-select").selectOption({ index: 1 });
  await captureCheckpoint(
    page,
    testInfo,
    "tag-layout-changed",
    "Populated tag preview after selecting a different physical tag size.",
  );

  await page.getByRole("button", { name: "Download" }).click();
  await expect(
    page.getByRole("menuitem", { name: "PDF (.pdf)" }),
  ).toBeVisible();
  await captureCheckpoint(
    page,
    testInfo,
    "tag-export-options",
    "Available HTML, PDF, image, and CSV export choices for populated tags.",
  );
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Make Sheet" }).click();
  await expect(
    page.getByRole("heading", { name: /sheet/i }).first(),
  ).toBeVisible();
  await captureCheckpoint(
    page,
    testInfo,
    "tag-sheet-preview",
    "Sheet builder with repeated labels and printable page preview.",
  );
});
