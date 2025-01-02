import { test, expect } from "@playwright/test";

test("should sign in and navigate to listings", async ({ page }) => {
  const formValues = {
    name: "Test Daylily",
    price: "25",
    publicNote: "Beautiful yellow blooms",
    privateNote: "From Jane's garden",
  } as const;

  async function assertFormValues() {
    await expect(page.getByLabel("Name")).toHaveValue(formValues.name);
    await expect(page.getByLabel("Price")).toHaveValue(formValues.price);
    await expect(page.getByLabel("Public Note")).toHaveValue(
      formValues.publicNote,
    );
    await expect(page.getByLabel("Private Note")).toHaveValue(
      formValues.privateNote,
    );
  }

  // Start from home page
  await page.goto("/");

  // Click sign in
  await page.getByRole("button", { name: "Sign in" }).click();

  // Fill in email
  await page
    .getByLabel("Email address")
    .fill("test_playwright+clerk_test@gmail.com");
  await page.getByRole("button", { name: "Continue" }).click();

  // Wait for code to be sent and enter it
  await page.waitForTimeout(1000);
  await page.waitForSelector("#digit-0-field");
  await page.keyboard.type("424242");

  // Wait for sign in to complete and go to listings
  await page.waitForURL("/");
  await page.waitForTimeout(1000);
  await page.goto("/listings");

  // Create new listing
  await page.getByRole("button", { name: "Create Listing" }).click();
  await expect(page).toHaveURL(/\/listings\/.*\/edit/);

  // Verify form fields are present
  await expect(page.getByLabel("Name")).toBeVisible();
  await expect(page.getByLabel("Price")).toBeVisible();
  await expect(page.getByLabel("Public Note")).toBeVisible();
  await expect(page.getByLabel("Private Note")).toBeVisible();
  await expect(page.getByLabel("AHS Listing")).toBeVisible();
  await expect(page.getByLabel("List", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Images")).toBeVisible();

  await page.getByLabel("Name").fill(formValues.name);
  await page.getByLabel("Price").fill(formValues.price);
  await page.getByLabel("Public Note").fill(formValues.publicNote);
  await page.getByLabel("Private Note").fill(formValues.privateNote);
  await page.getByLabel("Private Note").blur();

  await page.waitForTimeout(1000);

  await assertFormValues();

  // Reload and verify persistence
  await page.reload();
  await assertFormValues();
});
