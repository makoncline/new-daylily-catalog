import { createCatalogImporterCheckoutSource } from "@/lib/catalog-importer-membership";
import { expect, test } from "./fixtures";

test("checkout success still loads for a session created before the Playground handoff was removed", async ({
  context,
  page,
  baseURL,
}) => {
  await context.addCookies([
    { name: "integration-auth", value: "anonymous", url: baseURL! },
  ]);
  const checkout = await context.request.post(
    "/api/trpc/catalogImporter.createCheckout",
    { data: { json: createCatalogImporterCheckoutSource("previous-import") } },
  );
  expect(checkout.ok(), await checkout.text()).toBe(true);
  const { url } = (await checkout.json()).result.data.json as { url: string };
  const sessionId = new URL(url).searchParams.get("session_id");
  expect(sessionId).toBe("cs_test_integration_catalog_importer");

  await page.goto(`/onboarding/checkout/success?session_id=${sessionId}`);
  await expect(page).toHaveURL(url);
  await expect(
    page.getByRole("heading", { name: "Verify your email to continue." }),
  ).toBeVisible();
});
