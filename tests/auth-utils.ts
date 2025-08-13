import { Page } from "@playwright/test";
import { TEST_USER } from "./test-utils";

/**
 * Sets up Clerk authentication for testing
 * This simulates a logged-in user by setting the necessary cookies/session data
 */
export async function setupClerkAuth(page: Page): Promise<void> {
  // Navigate to a page that requires auth to trigger Clerk's auth flow
  await page.goto("/dashboard");
  
  // Check if we're already authenticated by looking for dashboard content
  const isDashboard = await page.locator('[data-testid="dashboard"]').isVisible().catch(() => false);
  
  if (!isDashboard) {
    // If not authenticated, we need to sign in
    // This assumes Clerk redirects to sign-in page when not authenticated
    
    // Wait for Clerk to load and look for sign-in form
    await page.waitForSelector('[data-clerk-element="signIn"]', { timeout: 10000 });
    
    // Fill in email
    await page.fill('input[name="identifier"]', TEST_USER.email);
    await page.click('button[data-clerk-element="signInSubmitButton"]');
    
    // Handle password step (if required)
    const passwordInput = page.locator('input[name="password"]');
    if (await passwordInput.isVisible()) {
      // For testing, you might need to set up a test password
      // or use Clerk's test mode features
      await passwordInput.fill("test-password-123");
      await page.click('button[data-clerk-element="signInSubmitButton"]');
    }
    
    // Wait for successful authentication and redirect to dashboard
    await page.waitForURL("/dashboard", { timeout: 15000 });
  }
}

/**
 * Alternative authentication method using Clerk's test tokens
 * This method sets authentication tokens directly in browser storage
 */
export async function setupClerkAuthWithTokens(page: Page): Promise<void> {
  // This approach sets the Clerk session token directly
  // You'll need to obtain a valid session token for your test user
  
  await page.goto("/");
  
  // Set Clerk session in localStorage
  await page.evaluate((testUser) => {
    // This is a simplified version - in practice you'd need a real Clerk session token
    const sessionToken = `test_session_${testUser.clerkId}`;
    
    localStorage.setItem("__clerk_session", sessionToken);
    localStorage.setItem("__clerk_user_id", testUser.clerkId);
    
    // Set session cookies that Clerk expects
    document.cookie = `__session=${sessionToken}; path=/; secure; samesite=lax`;
  }, TEST_USER);
  
  // Reload to pick up the authentication
  await page.reload();
  
  // Navigate to dashboard to verify auth worked
  await page.goto("/dashboard");
  await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });
}

/**
 * Clears all authentication data
 */
export async function clearClerkAuth(page: Page): Promise<void> {
  await page.evaluate(() => {
    // Clear localStorage
    localStorage.removeItem("__clerk_session");
    localStorage.removeItem("__clerk_user_id");
    localStorage.removeItem("__clerk_client");
    
    // Clear cookies
    document.cookie.split(";").forEach((c) => {
      const eqPos = c.indexOf("=");
      const name = eqPos > -1 ? c.substr(0, eqPos).trim() : c.trim();
      if (name.startsWith("__session") || name.startsWith("__clerk")) {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      }
    });
  });
}

/**
 * Waits for the user to be authenticated and ready
 */
export async function waitForAuthentication(page: Page): Promise<void> {
  // Wait for either dashboard content or user menu to be visible
  await Promise.race([
    page.waitForSelector('[data-testid="dashboard"]', { timeout: 15000 }),
    page.waitForSelector('[data-testid="user-menu"]', { timeout: 15000 }),
    page.waitForSelector('[data-clerk-element="userButton"]', { timeout: 15000 }),
  ]);
}