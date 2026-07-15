import type { Page } from "@playwright/test";
import { captureAtlasState, expect, test } from "./atlas-test";

const listingPath = "/starcrossedseeds/unpredictable";

async function openPricedListing(page: Page) {
  await page.goto(listingPath);
  await expect(
    page.getByRole("heading", { name: "UNPREDICTABLE", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("$400.00", { exact: true })).toBeVisible();
}

function addToCartButton(page: Page) {
  return page.getByRole("button", { name: "Add UNPREDICTABLE to cart" });
}

async function addItem(page: Page) {
  await openPricedListing(page);
  await addToCartButton(page).click();
  await expect(
    page.getByRole("button", { name: "Contact Seller (1 item)" }),
  ).toBeVisible();
}

async function openContactForm(page: Page) {
  await page
    .getByRole("button", { name: /Contact Seller(?: \(1 item\))?/ })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
}

async function openCartContactForm(page: Page) {
  await addItem(page);
  await openContactForm(page);
  await expect(page.getByRole("heading", { name: "Cart Items" })).toBeVisible();
}

test("Priced listing", async ({ page }) => {
  await openPricedListing(page);
  await expect(addToCartButton(page)).toBeVisible();
  await captureAtlasState(page, "buyer-priced-listing", { fullPage: false });
});

test("Item added to cart", async ({ page }) => {
  await addItem(page);
  await expect(page.getByText("Added to cart", { exact: true })).toBeVisible();
  await captureAtlasState(page, "buyer-item-added", { fullPage: false });
});

test("Message-only contact form", async ({ page }) => {
  await openPricedListing(page);
  await openContactForm(page);
  await expect(
    page.getByRole("heading", { name: "Contact starcrossedseeds" }),
  ).toBeVisible();
  await captureAtlasState(page, "buyer-contact-empty", { fullPage: false });
});

test("Contact form with cart", async ({ page }) => {
  await openCartContactForm(page);
  await captureAtlasState(page, "buyer-contact-cart", { fullPage: false });
});

test("Adjusted cart quantity", async ({ page }) => {
  await openCartContactForm(page);
  await page
    .getByRole("button", { name: "Increase quantity for UNPREDICTABLE" })
    .click();
  await expect(page.getByText("$800.00", { exact: true })).toBeVisible();
  await captureAtlasState(page, "buyer-cart-quantity", { fullPage: false });
});

test("Cart item removed", async ({ page }) => {
  await openCartContactForm(page);
  await page
    .getByRole("button", { name: "Remove UNPREDICTABLE from cart" })
    .click();
  await expect(page.getByRole("heading", { name: "Cart Items" })).toHaveCount(
    0,
  );
  await captureAtlasState(page, "buyer-cart-removed", { fullPage: false });
});

test("Invalid contact email", async ({ page }) => {
  await openPricedListing(page);
  await openContactForm(page);
  await page.getByRole("textbox", { name: "Email" }).fill("not-an-email");
  await page.getByRole("textbox", { name: "Name (optional)" }).focus();
  await expect(
    page.getByText("Please enter a valid email address"),
  ).toBeVisible();
  await captureAtlasState(page, "buyer-email-invalid", { fullPage: false });
});

test("Message ready to send", async ({ page }) => {
  await openPricedListing(page);
  await openContactForm(page);
  await page.getByRole("textbox", { name: "Email" }).fill("buyer@example.com");
  await page
    .getByRole("textbox", { name: "Message (optional)" })
    .fill("Is this daylily available for fall shipping?");
  await page.getByRole("textbox", { name: "Name (optional)" }).focus();
  await expect(
    page.getByRole("button", { name: "Send Message" }),
  ).toBeEnabled();
  await captureAtlasState(page, "buyer-ready-to-send", { fullPage: false });
});
