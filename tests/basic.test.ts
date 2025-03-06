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
  console.log("Navigated to home page");

  // Wait for page to be ready
  await page.waitForLoadState("networkidle");
  console.log("Page loaded, current URL:", page.url());

  // Debug: Log the page content
  const bodyContent = await page.content();
  console.log("Page HTML:", bodyContent);

  // Debug: Check for any sign in related elements
  const signInElements = await page.$$(
    'button:has-text("Create your catalog")',
  );
  console.log("Found sign in elements:", signInElements.length);

  // Look for sign in button using component attribute
  console.log("Looking for sign in button...");
  const signInButton = page.locator('header button[component="SignInButton"]');
  try {
    await expect(signInButton).toBeVisible({ timeout: 10000 });
    await signInButton.click();
    console.log("Sign in button clicked");
  } catch (error) {
    console.log("Failed to find sign in button. Error:", error);
    console.log("Current page content:", await page.content());
    throw error;
  }

  // Fill in email
  const emailInput = page.getByLabel("Email address");
  await expect(emailInput).toBeVisible({ timeout: 5000 });
  console.log("Email input is visible");

  await emailInput.fill("test_playwright+clerk_test@gmail.com");
  await page.getByRole("button", { name: "Continue" }).click();
  console.log("Filled email and clicked continue");

  // Wait for code to be sent and enter it
  await page.waitForTimeout(1000);
  await page.waitForSelector("#digit-0-field");
  await page.keyboard.type("424242");
  console.log("Entered verification code");

  // Wait for sign in to complete and go to listings
  await page.waitForURL("/");
  console.log("Redirected to home page after sign in");

  await page.waitForTimeout(1000);
  await page.goto("/dashboard/listings");
  console.log("Navigated to listings page");

  // Create new listing
  const createButton = page.getByRole("button", { name: "Create Listing" });
  await expect(createButton).toBeVisible({ timeout: 5000 });
  await createButton.click();
  console.log("Clicked create listing button");

  await expect(page).toHaveURL(/\/dashboard\/listings\?editing=.*/);
  console.log("On listing edit dialog:", page.url());

  // Verify form fields are present
  await expect(page.getByLabel("Name")).toBeVisible();
  await expect(page.getByLabel("Price")).toBeVisible();
  await expect(page.getByLabel("Public Note")).toBeVisible();
  await expect(page.getByLabel("Private Note")).toBeVisible();
  await expect(page.getByLabel("AHS Listing")).toBeVisible();
  await expect(page.getByLabel("List", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Images")).toBeVisible();
  console.log("All form fields are visible");

  await page.getByLabel("Name").fill(formValues.name);
  await page.getByLabel("Price").fill(formValues.price);
  await page.getByLabel("Public Note").fill(formValues.publicNote);
  await page.getByLabel("Private Note").fill(formValues.privateNote);
  await page.getByLabel("Private Note").blur();
  console.log("Filled all form fields");

  await page.waitForTimeout(1000);

  await assertFormValues();
  console.log("Form values verified");

  // Reload and verify persistence
  await page.reload();
  await assertFormValues();
  console.log("Form values verified after reload");
});
