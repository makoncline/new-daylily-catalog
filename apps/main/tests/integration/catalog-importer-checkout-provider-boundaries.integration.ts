import type { Page } from "@playwright/test";
import { SUBSCRIPTION_CONFIG } from "@/config/subscription-config";
import { expect, test } from "./fixtures";

async function reachCheckout(page: Page, email: string) {
  await page.route("https://media.daylilycatalog.com/**", async (route) => {
    await route.fulfill({
      body: Buffer.from("R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=", "base64"),
      contentType: "image/gif",
      status: 200,
    });
  });
  await page.getByRole("button", { name: "Use sample catalog" }).click();
  await page.getByRole("button", { name: "Build catalog preview" }).click();
  await page
    .getByRole("button", {
      name: SUBSCRIPTION_CONFIG.COPY.CTA.START_TRIAL,
    })
    .first()
    .click();
  await expect(page).toHaveURL(
    /\/catalog-importer\/checkout\?.*entry=catalog_importer/,
  );
  const emailInput = page.getByLabel("Email address");
  await expect(emailInput).toBeEnabled();
  await emailInput.fill(email);
  await expect(
    page.getByRole("button", {
      name: SUBSCRIPTION_CONFIG.COPY.CTA.CONTINUE_TO_TRIAL,
    }),
  ).toBeEnabled();
}

test("checkout provider failure is shown in the importer checkout UI", async ({
  context,
  page,
  baseURL,
}) => {
  if (!baseURL) throw new Error("Integration baseURL is required.");
  await context.addCookies([
    { name: "integration-auth", value: "anonymous", url: baseURL },
  ]);
  await page.goto("/catalog-importer");
  await reachCheckout(page, "integration-stripe-failure@example.com");

  await page
    .getByRole("button", {
      name: SUBSCRIPTION_CONFIG.COPY.CTA.CONTINUE_TO_TRIAL,
    })
    .click();

  await expect(
    page.getByText("Checkout did not open. Check your email and try again."),
  ).toBeVisible();
  await expect(page).toHaveURL(
    /\/catalog-importer\/checkout\?.*entry=catalog_importer/,
  );
});

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
  await reachCheckout(page, "integration-stripe-success@example.com");

  await page
    .getByRole("button", {
      name: SUBSCRIPTION_CONFIG.COPY.CTA.CONTINUE_TO_TRIAL,
    })
    .click();

  await expect(page).toHaveURL(
    /\/catalog-importer\/checkout\/success\?session_id=cs_test_integration_catalog_importer/,
    { timeout: 15_000 },
  );
  await expect(
    page.getByRole("heading", { name: "Verify your email to continue." }),
  ).toBeVisible();
});
