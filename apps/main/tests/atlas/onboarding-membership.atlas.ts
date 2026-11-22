import { captureAtlasState, expect, test } from "./atlas-test";

test("Start membership", async ({ page }) => {
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
  ).toHaveAttribute("href", "/playground");
  await expect(page.locator("body")).not.toContainText(/\btrial\b/i);
  await expect(page.locator("body")).not.toContainText(/\$\s*\d/);
  await captureAtlasState(page, "onboarding-start-membership");
});
