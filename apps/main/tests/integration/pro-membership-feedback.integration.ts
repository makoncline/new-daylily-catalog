import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";
import { expect, test } from "./fixtures";
import { mockCultivarMatches } from "../e2e/utils/catalog-importer";

const db = new PrismaClient({
  adapter: new PrismaLibSql(
    { url: process.env.DATABASE_URL! },
    { timestampFormat: "unixepoch-ms" },
  ),
});

test.afterAll(() => db.$disconnect());

test("feedback appears at importer finish and leaves checkout and downloads available", async ({
  page,
  context,
  baseURL,
}) => {
  if (!baseURL) throw new Error("Integration baseURL is required.");
  await context.addCookies([
    { name: "integration-auth", value: "anonymous", url: baseURL },
  ]);
  await mockCultivarMatches(page);
  for (const imagePattern of [
    "https://media.daylilycatalog.com/**",
    "https://media.example.com/**",
  ]) {
    await page.route(imagePattern, (route) =>
      route.fulfill({
        body: Buffer.from("R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=", "base64"),
        contentType: "image/gif",
      }),
    );
  }
  await page.goto("/start-membership");
  const trigger = page.getByRole("button", {
    name: "Not ready for Pro? Tell us why",
  });
  await expect(trigger).toHaveCount(0);
  await page.getByTestId("start-membership-checkout").click();
  await expect(page).toHaveURL(/\/catalog-importer$/, { timeout: 15_000 });
  await expect(trigger).toHaveCount(0);
  await page.getByRole("button", { name: "Use sample catalog" }).click();
  await page.getByRole("button", { name: "Build catalog preview" }).click();
  await expect(
    page.getByRole("heading", { name: "Publish this catalog with Pro" }),
  ).toBeVisible();
  await expect(trigger).toHaveCount(0);
  await page.getByRole("button", { name: "Finish", exact: true }).click();
  const readyHeading = page.getByRole("heading", {
    name: /\d+ listings? ready/,
  });
  await expect(readyHeading).toBeVisible();
  const readySummary = await readyHeading.innerText();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await trigger.click();
  await expect(
    page.getByRole("status").filter({ hasText: "question is not available" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Use the feedback form" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await expect(readyHeading).toHaveText(readySummary);
  await expect(
    page.getByRole("button", { name: "Continue to secure checkout" }),
  ).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "Download prepared import file" }),
  ).toBeEnabled();
});

test("free dashboard feedback can close without changing checkout", async ({
  page,
}) => {
  await db.keyValue.update({
    where: { key: "stripe:customer:cus_integration_seller" },
    data: {
      value: JSON.stringify({
        status: "canceled",
        subscriptionId: "sub_integration_seller",
        priceId: "price_integration",
        cancelAtPeriodEnd: false,
      }),
    },
  });
  try {
    await page.goto("/dashboard");
    const trigger = page.getByRole("button", {
      name: "Not ready for Pro? Tell us why",
    });
    await expect(page.getByTestId("dashboard-upgrade-to-pro")).toBeVisible();
    await trigger.click();
    await expect(page.getByText(/question is not available/)).toBeVisible();
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await expect(trigger).toBeFocused();
    await expect(page.getByTestId("dashboard-upgrade-to-pro")).toBeEnabled();
    await expect(page).toHaveURL(/\/dashboard$/);
  } finally {
    await db.keyValue.update({
      where: { key: "stripe:customer:cus_integration_seller" },
      data: {
        value: JSON.stringify({
          status: "active",
          subscriptionId: "sub_integration_seller",
          priceId: "price_integration",
          cancelAtPeriodEnd: false,
        }),
      },
    });
  }
});
