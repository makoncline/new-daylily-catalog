import { test, expect } from "@playwright/test";

test("should sign in and navigate to listings", async ({ page }) => {
  // Start from home page
  await page.goto("/");

  // Click sign in
  await page.getByRole("button", { name: "Sign in" }).click();

  // Fill in email
  await page
    .getByLabel("Email address")
    .fill("test_playwright+clerk_test@gmail.com");
  await page.getByRole("button", { name: "Continue" }).click();

  // Wait for code to be sent (indicated by "Resend" button)
  await page.getByText("Didn't receive a code? Resend").waitFor();

  // Add a delay to ensure Clerk has processed the code request
  await page.waitForTimeout(1000);

  // Wait for and fill in the code input field
  await page.waitForSelector("#digit-0-field");
  await page.keyboard.type("424242");

  // Wait for sign in to complete
  await page.waitForURL("/");
  await page.waitForTimeout(1000);

  // Navigate directly to listings page
  await page.goto("/listings");
  await expect(page).toHaveURL("/listings");

  // Click the New Listing button
  await page.getByRole("button", { name: "Create Listing" }).click();

  // Wait for redirect to the edit page
  await expect(page).toHaveURL(/\/listings\/.*\/edit/);

  // Verify the form fields are present
  await expect(page.getByLabel("Name")).toBeVisible();
  await expect(page.getByLabel("Price")).toBeVisible();
  await expect(page.getByLabel("Public Note")).toBeVisible();
  await expect(page.getByLabel("Private Note")).toBeVisible();

  // Verify custom component fields using role and text content
  await expect(page.getByText("Select AHS listing...")).toBeVisible();
  await expect(page.getByText("Select list...")).toBeVisible();
  await expect(page.getByText("Images", { exact: true })).toBeVisible();

  // Fill in the form fields
  await page.getByLabel("Name").fill("Test Daylily");
  await page.getByLabel("Price").fill("25.99");
  await page.getByLabel("Public Note").fill("Beautiful yellow blooms");
  await page.getByLabel("Private Note").fill("From Jane's garden");
  await page.getByLabel("Name").click();

  // Wait for auto-save
  await page.waitForTimeout(1000);

  await expect(page.getByLabel("Name")).toHaveValue("Test Daylily");
  await expect(page.getByLabel("Price")).toHaveValue("25.99");
  await expect(page.getByLabel("Public Note")).toHaveValue(
    "Beautiful yellow blooms",
  );
  await expect(page.getByLabel("Private Note")).toHaveValue(
    "From Jane's garden",
  );

  // Reload the page to verify persistence
  await page.reload();

  // Verify the values persisted
  await expect(page.getByLabel("Name")).toHaveValue("Test Daylily");
  await expect(page.getByLabel("Price")).toHaveValue("25.99");
  await expect(page.getByLabel("Public Note")).toHaveValue(
    "Beautiful yellow blooms",
  );
  await expect(page.getByLabel("Private Note")).toHaveValue(
    "From Jane's garden",
  );
});
