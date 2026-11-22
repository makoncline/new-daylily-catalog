import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";
import { expect, test } from "./fixtures";

const db = new PrismaClient({
  adapter: new PrismaLibSql(
    { url: process.env.DATABASE_URL! },
    { timestampFormat: "unixepoch-ms" },
  ),
});

test.afterAll(() => db.$disconnect());

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
