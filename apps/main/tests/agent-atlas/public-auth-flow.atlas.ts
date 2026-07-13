import { captureCheckpoint, expect, test } from "./atlas-test";

test.setTimeout(120_000);

test("authentication states", async ({ page }, testInfo) => {
  test.skip(
    process.env.HERMETIC_MODE === "1",
    "Stage Clerk supplies the canonical connected authentication states.",
  );

  await page.goto("/sign-in");
  const email = page.getByLabel(/email/i).first();
  await email.fill("not-an-email");
  await page
    .getByRole("button", { name: /continue/i })
    .first()
    .click();
  await expect(email).toHaveValue("not-an-email");
  await captureCheckpoint(
    page,
    testInfo,
    "authentication-invalid-email",
    "Stage Clerk sign-in rejecting an invalid email address.",
  );

  await email.fill("prodlike+clerk_test_rollingoaks@example.com");
  await page
    .getByRole("button", { name: /continue/i })
    .first()
    .click();
  const code = page
    .getByRole("textbox", { name: /enter verification code/i })
    .first();
  await expect(code).toBeVisible();
  await captureCheckpoint(
    page,
    testInfo,
    "authentication-verification-code",
    "One-time verification code entry for a realistic-data member.",
  );

  await code.fill("000000");
  await page
    .getByRole("button", { name: /continue/i })
    .last()
    .click();
  await expect(
    page.getByText(/incorrect|invalid|expired/i).first(),
  ).toBeVisible();
  await captureCheckpoint(
    page,
    testInfo,
    "authentication-invalid-code",
    "Verification screen after an incorrect one-time code.",
  );

  await page.goto("/auth-error");
  await expect(page.getByRole("heading").first()).toBeVisible();
  await captureCheckpoint(
    page,
    testInfo,
    "authentication-error-page",
    "Application authentication error and recovery surface.",
  );

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/sign-in/);
  await captureCheckpoint(
    page,
    testInfo,
    "authentication-signed-out-redirect",
    "A protected dashboard request redirected to sign-in.",
  );
});
