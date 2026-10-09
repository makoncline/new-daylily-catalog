import { clerk, setupClerkTestingToken } from "@clerk/testing/playwright";
import { test, expect } from "../../e2e/test-setup";
import { REALISTIC_DATA_PERSONAS } from "../../scripts/realistic-data-personas.mjs";

const persona = REALISTIC_DATA_PERSONAS.find(
  ({ key }) => key === "rolling-oaks",
);
if (!persona)
  throw new Error("The existing Rolling Oaks test persona is required.");

test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status === testInfo.expectedStatus) return;
  // Report auth state without recording cookies, tokens, user IDs, or emails.
  const state = await page
    .evaluate(() => ({
      path: window.location.pathname,
      clerkLoaded: Boolean(window.Clerk?.loaded),
      signedIn: Boolean(window.Clerk?.user),
      activeSession: Boolean(window.Clerk?.session),
      catalogLoading: Boolean(document.querySelector('[role="status"]')),
    }))
    .catch(() => ({ unavailable: true }));
  await testInfo.attach("preview-auth-state.json", {
    body: JSON.stringify(state, null, 2),
    contentType: "application/json",
  });
});

// Use existing seeded data. Do not create users, change memberships, or reseed.
test("member signs in on the native preview URL @preview", async ({
  page,
  baseURL,
}) => {
  test.setTimeout(120_000);
  if (!baseURL || !new URL(baseURL).hostname.endsWith(".vercel.app")) {
    throw new Error(
      "This test requires the immutable native Vercel preview URL.",
    );
  }
  if (
    !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith("pk_test_") ||
    !process.env.CLERK_SECRET_KEY?.startsWith("sk_test_")
  ) {
    throw new Error(
      "Preview sign-in tests require the existing Clerk development keys.",
    );
  }
  const origin = new URL(baseURL).origin;
  const emailInput = page.getByLabel(/email/i).first();

  await test.step("load Clerk on the native preview", async () => {
    await setupClerkTestingToken({ page });
    const response = await page.goto("/sign-in");
    expect(response, "Sign-in must return a document response").not.toBeNull();
    expect(
      response!.status(),
      "Preview access must succeed before testing Clerk",
    ).toBeLessThan(400);
    expect(new URL(page.url()).origin).toBe(origin);
    await clerk.loaded({ page });
    await expect(emailInput, "Clerk's sign-in form must load").toBeVisible();
  });

  await test.step("sign in through the email-code form", async () => {
    await emailInput.fill(persona.email);
    await page.getByRole("button", { name: /continue/i }).click();
    const codeInput = page
      .getByRole("textbox", { name: /enter verification code/i })
      .first();
    await expect(codeInput).toBeVisible();
    const sendCodeWarning = page.getByText(
      "You need to send a verification code before attempting to verify.",
    );
    if (await sendCodeWarning.isVisible()) {
      await page
        .getByRole("button", { name: /didn't receive a code\? resend/i })
        .click();
      await expect(sendCodeWarning).toBeHidden();
    }
    // Clerk's documented development test code, not a user's credential.
    await codeInput.pressSequentially("424242", { delay: 100 });
    await expect(page).toHaveURL(`${origin}/dashboard`, { timeout: 30_000 });
    await expect(page.getByTestId("dashboard-heading")).toBeVisible({
      timeout: 30_000,
    });
    await page.waitForLoadState("load");
  });

  await test.step("retain the session and load the seeded member's catalog", async () => {
    await page.reload();
    await expect(page).toHaveURL(`${origin}/dashboard`);
    await expect(page.getByTestId("dashboard-heading")).toBeVisible({
      timeout: 30_000,
    });
    await page.getByTestId("dashboard-nav-profile").click();
    await expect(page).toHaveURL(`${origin}/dashboard/profile`);
    await expect(page.getByLabel("Profile URL", { exact: true })).toHaveValue(
      persona.sourceProfileSlug,
      { timeout: 30_000 },
    );
  });

  await test.step("sign out and reject a fresh dashboard visit", async () => {
    await page.getByRole("button").filter({ hasText: persona.email }).click();
    await page.getByRole("menuitem", { name: "Log out" }).click();
    await expect(page).not.toHaveURL(/\/dashboard/);
    await page.goto("/dashboard");
    await expect(emailInput).toBeVisible();
    // auth.protect() may use Clerk's hosted development sign-in page. That
    // is a valid signed-out redirect, not a native-preview domain failure.
    await expect(page).not.toHaveURL(`${origin}/dashboard`);
    await page.goto("/sign-in");
    await expect(emailInput).toBeVisible();
    expect(new URL(page.url()).origin).toBe(origin);
    expect(new URL(page.url()).pathname).toBe("/sign-in");
  });
});
