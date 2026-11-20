import path from "node:path";
import { withTempE2EDb } from "@/lib/test-utils/e2e-db";
import { expect, test } from "./fixtures";

const clerkUserId = "user_integration_checkout";
const stripeCustomerId = "cus_integration_catalog_importer";

const checkouts = [
  {
    name: "catalog importer checkout",
    entry: "/catalog-importer/checkout/success",
    sessionId: "cs_test_integration_catalog_importer",
  },
  {
    name: "onboarding checkout",
    entry: "/onboarding/checkout/success",
    sessionId: "cs_test_integration_onboarding",
  },
];

for (const { name, entry, sessionId } of checkouts) {
  test(`claims an existing ${name} and opens the Importer`, async ({
    context,
    page,
    baseURL,
  }) => {
    await withTempE2EDb(
      async (db) => {
        await db.user.updateMany({
          where: { clerkUserId },
          data: { stripeCustomerId: null },
        });
        await db.keyValue.deleteMany({
          where: { key: `stripe:customer:${stripeCustomerId}` },
        });
      },
      { clearFirst: false },
    );

    const isDirectReturn = entry === "/catalog-importer/checkout/success";
    const authCookie = { name: "integration-auth", url: baseURL! };
    const signedIn = { ...authCookie, value: "checkout-member" };
    if (isDirectReturn) {
      await context.addCookies([signedIn]);
      await page.goto("/dashboard/imports");
      await expect(page.getByText("Import listings with Pro")).toBeVisible();
    }

    await context.addCookies([{ ...authCookie, value: "anonymous" }]);
    await page.goto(`${entry}?session_id=${sessionId}`);
    await expect(page).toHaveURL(
      `/catalog-importer/checkout/success?session_id=${sessionId}`,
    );
    const checkout = page.getByTestId("catalog-importer-checkout-success");
    await expect(
      checkout.getByRole("heading", { name: "Verify your email to continue." }),
    ).toBeVisible();
    await expect(
      checkout.getByText(
        "Use the email from checkout. We will send your one-time login code.",
        { exact: true },
      ),
    ).toBeVisible();

    let continueClaim!: () => void;
    const claimGate = new Promise<void>((resolve) => {
      continueClaim = resolve;
    });
    await page.route(
      "**/api/trpc/*catalogImporter.claimCheckout*",
      async (route) => {
        await claimGate;
        await route.fallback();
      },
      { times: 1 },
    );
    await context.addCookies([signedIn]);
    try {
      await page.reload();
      await expect(checkout.getByText("Membership active")).toBeVisible();
      await expect(
        checkout.getByRole("heading", { name: "Opening your dashboard" }),
      ).toBeVisible();
      await expect(
        checkout.getByText("We are linking your membership to your account."),
      ).toBeVisible();
    } finally {
      continueClaim();
    }
    await expect(page.getByLabel("Playground file")).toBeVisible();
    await expect(page).toHaveURL("/dashboard/imports");

    await withTempE2EDb(
      async (db) => {
        const user = await db.user.findUniqueOrThrow({
          where: { clerkUserId },
        });
        expect(user.stripeCustomerId).toBe(stripeCustomerId);
        const subscription = await db.keyValue.findUniqueOrThrow({
          where: { key: `stripe:customer:${stripeCustomerId}` },
        });
        expect(JSON.parse(subscription.value)).toMatchObject({
          status: "active",
        });
      },
      { clearFirst: false },
    );

    const evidenceDirectory = process.env.CHECKOUT_EVIDENCE_DIR;
    if (evidenceDirectory && isDirectReturn) {
      await page.screenshot({
        path: path.join(evidenceDirectory, "checkout-imports.png"),
        animations: "disabled",
      });
    }
  });
}
