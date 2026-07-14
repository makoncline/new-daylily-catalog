import { captureCheckpoint, expect, test } from "./atlas-test";
import type { Page } from "@playwright/test";

test.setTimeout(120_000);

const sellerId = "93";
const catalogRoute = "/plantfancygardens";
const cartItems = [
  {
    id: "cmduj3mrk00033pci8mo3x7lb",
    title: "Blueberry Candy",
    price: 10,
    quantity: 1,
    listingId: "cmduj3mrk00033pci8mo3x7lb",
    userId: sellerId,
  },
  {
    id: "cmdui083l000110vxtv9funzu",
    title: "Abso Freakin Lutely",
    price: 25,
    quantity: 1,
    listingId: "cmdui083l000110vxtv9funzu",
    userId: sellerId,
  },
] as const;

async function setCart(
  page: Page,
  items: readonly (typeof cartItems)[number][],
) {
  await page.evaluate(
    ({ key, value }: { key: string; value: string }) =>
      localStorage.setItem(key, value),
    { key: `cart_${sellerId}`, value: JSON.stringify(items) },
  );
  await page.reload();
}

test("buyer builds a cart and contacts the grower", async ({
  page,
}, testInfo) => {
  test.skip(
    process.env.HERMETIC_MODE === "1",
    "This canonical flow uses the realistic PlantFancy catalog.",
  );

  await page.goto(catalogRoute);
  await page.evaluate((userId) => {
    localStorage.removeItem(`cart_${userId}`);
    localStorage.removeItem("customer_info");
  }, sellerId);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "PlantFancyGardens",
  );

  await page
    .getByRole("button", { name: "Contact seller", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await captureCheckpoint(
    page,
    testInfo,
    "contact-grower-empty-form",
    "Buyer contact dialog before customer details or cart items are supplied.",
  );

  const email = page.getByPlaceholder("your@email.com");
  await email.fill("not-an-email");
  await email.press("Tab");
  await expect(page.getByText(/valid email/i)).toBeVisible();
  await captureCheckpoint(
    page,
    testInfo,
    "contact-grower-invalid-email",
    "Buyer contact dialog showing email validation feedback.",
  );

  await email.fill("atlas-buyer@example.com");
  await email.press("Tab");
  await page.getByPlaceholder("Your name").fill("Atlas Buyer");
  const message = page.getByPlaceholder("Enter your message here");
  await message.fill(
    "Are these plants available for local pickup next weekend?",
  );
  await message.press("Tab");
  await expect(
    page.getByRole("button", { name: "Send Message" }),
  ).toBeEnabled();
  await captureCheckpoint(
    page,
    testInfo,
    "contact-grower-completed-message",
    "Valid buyer details and a complete message ready to submit.",
  );
  await page.keyboard.press("Escape");

  await setCart(page, cartItems.slice(0, 1));
  await expect(
    page.getByRole("button", {
      name: "Contact seller and view cart (1 item)",
    }),
  ).toBeVisible();
  await captureCheckpoint(
    page,
    testInfo,
    "contact-grower-one-cart-item",
    "Public catalog after one priced listing has been added to the buyer cart.",
    { viewportOnly: true },
  );

  await setCart(page, cartItems);
  await expect(
    page.getByRole("button", {
      name: "Contact seller and view cart (2 items)",
    }),
  ).toBeVisible();
  await captureCheckpoint(
    page,
    testInfo,
    "contact-grower-multiple-cart-items",
    "Public catalog with multiple selected listings in the buyer cart.",
    { viewportOnly: true },
  );

  await page
    .getByRole("button", {
      name: "Contact seller and view cart (2 items)",
    })
    .click();
  await expect(page.getByText("Cart Items", { exact: true })).toBeVisible();
  await captureCheckpoint(
    page,
    testInfo,
    "contact-grower-cart-populated",
    "Contact dialog with selected listings, quantities, and subtotal.",
  );
  const cartEmail = page.getByPlaceholder("your@email.com");
  await cartEmail.fill("atlas-buyer@example.com");
  await cartEmail.press("Tab");
  await expect(
    page.getByRole("button", { name: "Send Message" }),
  ).toBeEnabled();

  let releaseRequest: (() => void) | undefined;
  const requestReleased = new Promise<void>((resolve) => {
    releaseRequest = resolve;
  });
  await page.route("**/api/trpc/public.sendMessage*", async (route) => {
    await requestReleased;
    await route.continue();
  });
  const submitRequest = page
    .getByRole("button", { name: "Send Message" })
    .click();
  await expect(page.getByRole("button", { name: "Sending…" })).toBeVisible();
  await captureCheckpoint(
    page,
    testInfo,
    "contact-grower-submitting",
    "Contact request while the real application mutation is pending.",
  );
  releaseRequest?.();
  await submitRequest;
  await page.unroute("**/api/trpc/public.sendMessage*");
  await expect(
    page.getByRole("heading", { name: "Your message has been sent" }),
  ).toBeVisible();
  await captureCheckpoint(
    page,
    testInfo,
    "contact-grower-success",
    "Successful inquiry with the keep-or-clear-cart decision.",
  );
  await page.getByRole("button", { name: "Keep Cart" }).click();

  await page
    .getByRole("button", {
      name: "Contact seller and view cart (2 items)",
    })
    .click();
  await page.route("**/api/trpc/public.sendMessage*", (route) => route.abort());
  await page.getByRole("button", { name: "Send Message" }).click();
  await expect(page.getByText("Error sending message")).toBeVisible();
  await captureCheckpoint(
    page,
    testInfo,
    "contact-grower-failure",
    "Contact dialog after the request fails, preserving buyer input and cart.",
    { allowExpectedErrors: true },
  );
  await page.unroute("**/api/trpc/public.sendMessage*");
});
