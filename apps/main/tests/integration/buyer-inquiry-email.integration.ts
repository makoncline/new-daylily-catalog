import { expect, test } from "./fixtures";

interface CapturedEmail {
  bcc: string[];
  from: string;
  replyTo: string[];
  subject: string;
  text: string;
  to: string[];
}

test("buyer inquiry sends the seller and buyer emails", async ({
  page,
  request,
}) => {
  const providerUrl =
    process.env.INTEGRATION_PROVIDER_URL ?? "http://127.0.0.1:3211";
  const buyerEmail = "integration-buyer@example.test";
  const buyerMessage = "Is this daylily available for fall shipping?";

  await request.delete(`${providerUrl}/__emails`);
  await page.goto("/integration-seller/existing-bloom");
  await page
    .getByRole("button", { name: "Contact Seller", exact: true })
    .click();
  await page.getByRole("textbox", { name: "Email" }).fill(buyerEmail);
  await page.getByRole("textbox", { name: "Name (optional)" }).fill("Iris");
  await page
    .getByRole("textbox", { name: "Message (optional)" })
    .fill(buyerMessage);
  await page.getByRole("textbox", { name: "Name (optional)" }).focus();
  const sendMessage = page.getByRole("button", { name: "Send Message" });
  await expect(sendMessage).toBeEnabled();
  await sendMessage.click();

  await expect(
    page.locator("[data-sonner-toast]").filter({ hasText: "Message sent" }),
  ).toBeVisible();

  const response = await request.get(`${providerUrl}/__emails`);
  expect(response.ok()).toBe(true);
  const emails = (await response.json()) as CapturedEmail[];
  expect(emails).toHaveLength(2);

  expect(emails).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        from: "daylily-catalog <noreply@daylilycatalog.com>",
        to: ["integration-seller@example.test"],
        bcc: [
          "admin@daylilycatalog.com",
          "makon+daylilycatalog-messages@hey.com",
        ],
        replyTo: [buyerEmail],
        subject: "New Customer Inquiry | Daylily Catalog",
        text: expect.stringContaining(buyerMessage),
      }),
      expect.objectContaining({
        from: "daylily-catalog <noreply@daylilycatalog.com>",
        to: [buyerEmail],
        bcc: ["makon+daylilycatalog-messages@hey.com"],
        replyTo: [],
        subject: "We've received your inquiry! | Integration Seller 🌸",
        text: expect.stringContaining(buyerMessage),
      }),
    ]),
  );
});
