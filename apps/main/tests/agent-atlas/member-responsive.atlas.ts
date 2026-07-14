import { captureCheckpoint, expect, test } from "./atlas-test";
import { EditListingDialog } from "../e2e/pages/edit-listing-dialog";
import { ImageManager } from "../e2e/pages/image-manager";

test.setTimeout(180_000);

test("responsive member workspace", async ({ page }, testInfo) => {
  test.skip(
    !["rolling-oaks-mobile", "rolling-oaks-ipad"].includes(
      testInfo.project.name,
    ) || process.env.HERMETIC_MODE === "1",
    "Responsive captures use the realistic Rolling Oaks member.",
  );
  const mobile = testInfo.project.name === "rolling-oaks-mobile";
  const edit = new EditListingDialog(page);
  const images = new ImageManager(page);

  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({
    timeout: 30_000,
  });
  if (mobile) {
    await page.getByRole("button", { name: "Toggle Sidebar" }).click();
    await captureCheckpoint(
      page,
      testInfo,
      "mobile-dashboard-navigation",
      "Mobile dashboard with its member navigation open.",
    );
    await page.keyboard.press("Escape");
  } else {
    await captureCheckpoint(
      page,
      testInfo,
      "ipad-dashboard-overview",
      "Realistic member dashboard at an iPad portrait viewport.",
    );
  }

  await page.goto("/dashboard/listings");
  await expect(page.locator("h1").filter({ hasText: "Listings" })).toBeVisible({
    timeout: 30_000,
  });
  if (mobile) {
    await captureCheckpoint(
      page,
      testInfo,
      "mobile-listings-table",
      "Production-sized listings workspace on mobile.",
    );
  } else {
    await page.getByTestId("search-mode-switch").click();
    await captureCheckpoint(
      page,
      testInfo,
      "ipad-listings-filters",
      "Advanced listing filters at an iPad portrait viewport.",
    );
  }

  await page.goto("/dashboard/listings?editing=4259");
  await edit.isReady();
  await captureCheckpoint(
    page,
    testInfo,
    mobile ? "mobile-listing-editor" : "ipad-listing-editor",
    mobile
      ? "Populated listing editor on mobile."
      : "Populated listing editor at an iPad portrait viewport.",
  );
  if (!mobile) {
    await expect(images.imageGrid()).toBeVisible();
    await images.imageGrid().scrollIntoViewIfNeeded();
    await captureCheckpoint(
      page,
      testInfo,
      "ipad-image-manager",
      "Image management within the iPad-sized listing editor.",
    );
  }
});
