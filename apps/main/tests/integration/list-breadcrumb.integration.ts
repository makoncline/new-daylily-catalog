import { expect, test } from "./fixtures";

test("list breadcrumb distinguishes ready, missing and failed lookups", async ({
  page,
}) => {
  test.setTimeout(60_000);
  const breadcrumb = page.getByRole("navigation", { name: "breadcrumb" });
  await page.goto("/dashboard/lists/integration-favorites-list");
  await expect(breadcrumb).toContainText("Integration Favorites");
  await expect(breadcrumb).not.toContainText("Loading...");

  await page.goto("/dashboard/lists/missing-list");
  await expect(
    page.getByRole("heading", { name: "List not found" }),
  ).toBeVisible();
  await expect(breadcrumb).toContainText("List not found", { timeout: 15_000 });

  // The lookup can share a transport batch with the current-user query.
  await page.route("**/api/trpc/*dashboardDb.list.get*", (route) =>
    route.abort("failed"),
  );
  await page.goto("/dashboard/lists/integration-favorites-list");
  await expect(
    page.getByRole("heading", { name: "Manage List: Integration Favorites" }),
  ).toBeVisible();
  await expect(breadcrumb).toContainText("List unavailable", {
    timeout: 15_000,
  });
  await expect(breadcrumb).not.toContainText("Loading...");
  await page.unroute("**/api/trpc/*dashboardDb.list.get*");
  await page.reload();
  await expect(breadcrumb).toContainText("Integration Favorites");
});
