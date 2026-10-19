import type { Page } from "@playwright/test";
import { SUBSCRIPTION_CONFIG } from "@/config/subscription-config";
import { expect, test } from "./fixtures";
import { mockCultivarMatches } from "../e2e/utils/catalog-importer";

async function reachCheckout(page: Page) {
  await mockCultivarMatches(page);
  for (const imagePattern of [
    "https://media.daylilycatalog.com/**",
    "https://media.example.com/**",
  ]) {
    await page.route(imagePattern, async (route) => {
      await route.fulfill({
        body: Buffer.from("R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=", "base64"),
        contentType: "image/gif",
        status: 200,
      });
    });
  }
  await page.getByRole("button", { name: "Use sample catalog" }).click();
  await page.getByRole("button", { name: "Build catalog preview" }).click();
  await page
    .getByRole("button", {
      name: SUBSCRIPTION_CONFIG.COPY.CTA.CONTINUE_TO_CHECKOUT,
    })
    .first()
    .click();
}

test("successful checkout returns to the real account handoff UI", async ({
  context,
  page,
  baseURL,
}) => {
  if (!baseURL) throw new Error("Integration baseURL is required.");
  await context.addCookies([
    { name: "integration-auth", value: "anonymous", url: baseURL },
  ]);
  await page.goto("/catalog-importer");
  await reachCheckout(page);

  await expect(page).toHaveURL(
    /\/catalog-importer\/checkout\/success\?session_id=cs_test_integration_catalog_importer/,
    { timeout: 15_000 },
  );
  await expect(
    page.getByRole("heading", { name: "Verify your email to continue." }),
  ).toBeVisible();
});
