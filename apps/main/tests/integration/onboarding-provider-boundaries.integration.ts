import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

async function reachCheckout(page: Page, email: string) {
  await page.getByTestId("anonymous-onboarding-email").fill(email);
  await page.getByTestId("anonymous-onboarding-email-submit").click();
  await expect(page).toHaveURL(/step=profile/);

  await page.getByTestId("anonymous-onboarding-primary-action").click();
  await expect(page).toHaveURL(/step=listing/);
  await page.getByTestId("anonymous-onboarding-primary-action").click();
  await expect(page).toHaveURL(/step=preview/);
  await page.getByTestId("anonymous-onboarding-primary-action").click();
  await expect(page).toHaveURL(/step=checkout/);
}

test("checkout provider failure is shown in the real onboarding UI", async ({
  context,
  page,
  baseURL,
}) => {
  if (!baseURL) throw new Error("Integration baseURL is required.");
  await context.addCookies([
    { name: "integration-auth", value: "anonymous", url: baseURL },
  ]);
  await page.goto("/onboarding");
  await reachCheckout(page, "integration-stripe-failure@example.com");

  await page.getByTestId("anonymous-onboarding-checkout").click();

  await expect(
    page.getByText("Stripe is unavailable in this integration scenario."),
  ).toBeVisible();
  await expect(page).toHaveURL(/step=checkout/);
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
  await page.goto("/onboarding");
  await reachCheckout(page, "integration-stripe-success@example.com");

  await page.getByTestId("anonymous-onboarding-checkout").click();

  await expect(page).toHaveURL(
    /\/onboarding\/checkout\/success\?session_id=cs_test_integration_onboarding/,
    { timeout: 15_000 },
  );
  await expect(
    page.getByRole("heading", { name: "Sign in to open your dashboard." }),
  ).toBeVisible();
});
