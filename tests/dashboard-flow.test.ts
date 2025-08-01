import { test, expect } from "./fixtures";

test("complete dashboard flow: login, create listing, edit", async ({
  page,
  serverUrl,
  testUser,
  db,
}) => {
  console.log(`🚀 Starting complete dashboard flow test`);
  console.log(`🔗 Server: ${serverUrl}`);
  console.log(`👤 User: ${testUser.email}`);

  // Step 1: Load home page and login
  console.log("\n📍 Step 1: Login flow");
  await page.goto("/");
  console.log("✅ Home page loaded");

  await page.getByRole("button", { name: "Dashboard" }).click();
  console.log("✅ Clicked Dashboard button");

  await page.getByPlaceholder("Enter your email address").fill(testUser.email);
  console.log(`✅ Filled email: ${testUser.email}`);

  await page.getByRole("button", { name: "Continue" }).click();
  console.log("✅ Clicked Continue");

  // Enter verification code digits
  // just type 424242
  await page.waitForTimeout(1000);
  await page.getByText("Check your email").waitFor();
  await page.keyboard.type("424242");
  console.log("✅ Filled verification code: 424242");

  // Wait for redirect to dashboard
  await page.waitForURL("**/dashboard", { timeout: 10000 });
  console.log("🎉 Successfully reached dashboard!");

  // Step 2: Navigate to listings and create new listing
  console.log("\n📍 Step 2: Create new listing");

  await page.getByRole("link", { name: "Listings", exact: true }).click();
  console.log("✅ Navigated to listings page");

  await page.getByRole("button", { name: "Create Listing" }).click();
  console.log("✅ Clicked Create Listing button");

  // Create listing with unique title
  const listingTitle = `Test Listing ${Date.now()}`;
  await page.getByPlaceholder("Enter a title").fill(listingTitle);
  console.log(`✅ Filled listing title: ${listingTitle}`);

  await page.getByRole("button", { name: "Create Listing" }).click();
  console.log("✅ Created listing");

  // Step 3: Fill out listing details in edit modal
  console.log("\n📍 Step 3: Fill out listing details");

  const description = "Beautiful test daylily with vibrant colors";
  const price = "35";
  const privateNote = "E2E test listing";

  await page.getByLabel("Description").fill(description);
  console.log("✅ Filled description");

  await page.getByLabel("Price").fill(price);
  console.log("✅ Filled price");

  await page.getByLabel("Private Notes").fill(privateNote);
  console.log("✅ Filled private notes");

  await page.getByRole("button", { name: "Save Changes" }).click();
  console.log("✅ Saved listing changes");

  await page.getByRole("button", { name: "Close" }).click();
  console.log("✅ Closed listing edit modal");

  await page.waitForTimeout(1000);
  await page.getByPlaceholder("Filter listings...").fill(listingTitle);
  console.log("✅ Filtered listings");
  await expect(page.getByRole("code")).toContainText("1 / 6");
  console.log("✅ Verified filteredlisting count");
  await expect(page.locator("#data-table")).toContainText(listingTitle);
  await expect(page.locator("#data-table")).toContainText(`$${price}.00`);
  await expect(page.locator("#data-table")).toContainText(description);
  await expect(page.locator("#data-table")).toContainText(privateNote);
  console.log("✅ Verified listing details");
  await page.getByRole("button", { name: "Reset" }).click();
  console.log("✅ Reset filters");

  await page.pause();
});
