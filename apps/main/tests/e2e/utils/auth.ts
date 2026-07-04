import { clerk } from "@clerk/testing/playwright";
import type { Page } from "@playwright/test";
import { TEST_USER } from "../../../src/lib/test-utils/e2e-users";

export async function signInTestUser(page: Page) {
  await page.goto("/sign-in");
  await clerk.signIn({ page, emailAddress: TEST_USER.email });
}
