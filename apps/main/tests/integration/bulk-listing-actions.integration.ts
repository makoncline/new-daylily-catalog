import { withTempE2EDb } from "@/lib/test-utils/e2e-db";
import { expect, test } from "./fixtures";

test("seller hides, publishes, and deletes selected listings without changing other rows", async ({
  page,
  dashboardListings,
}) => {
  await withTempE2EDb(
    async (db) => {
      await db.listing.createMany({
        data: Array.from({ length: 22 }, (_, index) => ({
          id: `bulk-listing-${index}`,
          userId: "integration-user",
          title: `Bulk Bloom ${String(index).padStart(2, "0")}`,
          slug: `bulk-bloom-${index}`,
        })),
      });
      await db.list.update({
        where: { id: "integration-favorites-list" },
        data: { listings: { connect: [{ id: "bulk-listing-0" }] } },
      });
    },
    { clearFirst: false },
  );
  await page.goto("/dashboard/listings?size=20&query=Bulk%20Bloom");
  await dashboardListings.isReady();
  const select = (title: string) =>
    dashboardListings
      .listingRow(title)
      .getByRole("checkbox", { name: "Select row" });
  await select("Bulk Bloom 00").check();
  await dashboardListings.pagerNextButton.click();
  await select("Bulk Bloom 21").check();
  await expect(
    page.getByText("2 selected in these results", { exact: true }),
  ).toBeVisible();

  const dialog = page.getByRole("alertdialog");
  await page.screenshot({ path: test.info().outputPath("bulk-selection.png") });
  await page
    .getByRole("button", { name: "Hide selected", exact: true })
    .click();
  await expect(dialog).toContainText("2 listings");
  await expect(dialog.getByRole("listitem")).toHaveText([
    "Bulk Bloom 00",
    "Bulk Bloom 21",
  ]);
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await withTempE2EDb(
    async (db) => {
      expect(
        await db.listing.count({
          where: { id: { startsWith: "bulk-listing-" }, status: "HIDDEN" },
        }),
      ).toBe(0);
    },
    { clearFirst: false },
  );
  await page
    .getByRole("button", { name: "Hide selected", exact: true })
    .click();
  await dialog.getByRole("button", { name: "Hide", exact: true }).click();
  await expect(
    page.getByText("2 listings hidden", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await dashboardListings.isReady();
  await withTempE2EDb(
    async (db) => {
      expect(
        (
          await db.listing.findMany({
            where: { id: { startsWith: "bulk-listing-" }, status: "HIDDEN" },
            select: { id: true },
          })
        )
          .map((row) => row.id)
          .sort(),
      ).toEqual(["bulk-listing-0", "bulk-listing-21"]);
      expect(
        await db.listing.count({
          where: { id: { startsWith: "bulk-listing-" } },
        }),
      ).toBe(22);
    },
    { clearFirst: false },
  );

  await select("Bulk Bloom 21").check();
  await dashboardListings.setGlobalSearch("Bulk Bloom 00");
  await select("Bulk Bloom 00").check();
  await page
    .getByRole("button", { name: "Publish selected", exact: true })
    .click();
  await dialog.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(
    page.getByText("1 listing published", { exact: true }),
  ).toBeVisible();
  await withTempE2EDb(
    async (db) => {
      expect(
        await db.listing.findUnique({ where: { id: "bulk-listing-0" } }),
      ).toMatchObject({ status: null });
      expect(
        await db.listing.findUnique({ where: { id: "bulk-listing-21" } }),
      ).toMatchObject({ status: "HIDDEN" });
    },
    { clearFirst: false },
  );

  await dashboardListings.setGlobalSearch("Bulk Bloom");
  await expect(
    page.getByText("1 selected in these results", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Clear selection", exact: true })
    .click();
  if (await dashboardListings.pagerFirstButton.isEnabled())
    await dashboardListings.pagerFirstButton.click();
  await select("Bulk Bloom 00").check();
  await select("Bulk Bloom 01").check();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: test.info().outputPath("bulk-selection-mobile.png"),
  });
  await page
    .getByRole("button", { name: "Delete selected", exact: true })
    .click();
  await expect(dialog).toContainText("2 listings");
  await expect(dialog.getByRole("listitem")).toHaveText([
    "Bulk Bloom 00",
    "Bulk Bloom 01",
  ]);
  await expect(dialog).toContainText("permanently deleted");
  await page.screenshot({
    path: test.info().outputPath("bulk-delete-confirmation-mobile.png"),
    animations: "disabled",
  });
  await dialog.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(
    page.getByText("2 listings deleted", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await dashboardListings.isReady();
  await expect(dashboardListings.listingRow("Bulk Bloom 00")).toHaveCount(0);
  await expect(dashboardListings.listingRow("Bulk Bloom 02")).toBeVisible();
  await withTempE2EDb(
    async (db) => {
      expect(
        await db.listing.count({
          where: { id: { startsWith: "bulk-listing-" } },
        }),
      ).toBe(20);
      expect(
        await db.listing.findUnique({
          where: { id: "integration-existing-listing" },
        }),
      ).not.toBeNull();
      expect(
        await db.list.findUnique({
          where: { id: "integration-favorites-list" },
        }),
      ).not.toBeNull();
    },
    { clearFirst: false },
  );
});

test("seller reviews all selected listings and adds them to a list without replacing memberships", async ({
  page,
  dashboardListings,
}) => {
  await withTempE2EDb(
    async (db) => {
      await db.listing.createMany({
        data: Array.from({ length: 22 }, (_, index) => ({
          id: `bulk-add-${index}`,
          userId: "integration-user",
          title: `Bulk Add ${String(index).padStart(2, "0")}`,
          slug: `bulk-add-${index}`,
          status: "HIDDEN",
        })),
      });
      await db.list.update({
        where: { id: "integration-favorites-list" },
        data: {
          listings: {
            connect: [
              { id: "bulk-add-0" },
              { id: "integration-existing-listing" },
            ],
          },
        },
      });
      await db.list.create({
        data: {
          id: "bulk-other-list",
          userId: "integration-user",
          title: "Other list",
          listings: { connect: { id: "bulk-add-21" } },
        },
      });
    },
    { clearFirst: false },
  );
  await page.goto("/dashboard/listings?size=20&query=Bulk%20Add");
  await dashboardListings.isReady();
  const select = (title: string) =>
    dashboardListings
      .listingRow(title)
      .getByRole("checkbox", { name: "Select row" });
  await expect(page.getByRole("button", { name: /^Selected \(/ })).toHaveCount(
    0,
  );
  await select("Bulk Add 00").check();
  await dashboardListings.pagerNextButton.click();
  await select("Bulk Add 21").check();
  await dashboardListings.setGlobalSearch("No matching listings");
  const selectedFilter = page.getByRole("button", {
    name: "Selected (2)",
    exact: true,
  });
  await selectedFilter.click();
  await expect(selectedFilter).toHaveAttribute("aria-pressed", "true");
  await expect(dashboardListings.listingRow("Bulk Add 00")).toBeVisible();
  await expect(dashboardListings.listingRow("Bulk Add 21")).toBeVisible();
  await expect(dashboardListings.listingRow("Bulk Add 01")).toHaveCount(0);

  const dialog = page.getByRole("alertdialog");
  await page.getByRole("button", { name: "Add to list", exact: true }).click();
  await expect(dialog.getByRole("listitem")).toHaveText([
    "Bulk Add 00",
    "Bulk Add 21",
  ]);
  await expect(
    dialog.getByRole("button", { name: "Add to list", exact: true }),
  ).toBeDisabled();
  await dialog.getByRole("combobox", { name: "List", exact: true }).click();
  await page
    .getByRole("option", { name: "Integration Favorites", exact: true })
    .click();
  await expect(dialog).toContainText(
    "Other list memberships and visibility do not change",
  );
  await page.screenshot({
    path: test.info().outputPath("bulk-add-confirmation.png"),
    animations: "disabled",
  });
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await withTempE2EDb(
    async (db) => {
      expect(
        await db.list.count({
          where: {
            id: "integration-favorites-list",
            listings: { some: { id: "bulk-add-21" } },
          },
        }),
      ).toBe(0);
    },
    { clearFirst: false },
  );
  await page.getByRole("button", { name: "Add to list", exact: true }).click();
  await dialog.getByRole("combobox", { name: "List", exact: true }).click();
  await page
    .getByRole("option", { name: "Integration Favorites", exact: true })
    .click();
  await dialog
    .getByRole("button", { name: "Add to list", exact: true })
    .click();
  await expect(
    page.getByText("2 listings are in “Integration Favorites”", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /^Selected \(/ })).toHaveCount(
    0,
  );
  await expect(dashboardListings.listingRow("Bulk Add 01")).toBeVisible();

  await select("Bulk Add 00").check();
  await page.getByRole("button", { name: "Selected (1)", exact: true }).click();
  await select("Bulk Add 00").uncheck();
  await expect(dashboardListings.listingRow("Bulk Add 01")).toBeVisible();
  await select("Bulk Add 00").check();
  await expect(
    page.getByRole("button", { name: "Selected (1)", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  await page.reload();
  await dashboardListings.isReady();
  await withTempE2EDb(
    async (db) => {
      const target = await db.list.findUniqueOrThrow({
        where: { id: "integration-favorites-list" },
        include: { listings: true },
      });
      expect(target.listings.map(({ id }) => id).sort()).toEqual([
        "bulk-add-0",
        "bulk-add-21",
        "integration-existing-listing",
      ]);
      const other = await db.list.findUniqueOrThrow({
        where: { id: "bulk-other-list" },
        include: { listings: true },
      });
      expect(other.listings.map(({ id }) => id)).toEqual(["bulk-add-21"]);
      expect(
        await db.listing.count({
          where: { id: { startsWith: "bulk-add-" }, status: "HIDDEN" },
        }),
      ).toBe(22);
    },
    { clearFirst: false },
  );
});

test("a conflicting bulk save stops after the confirmed rows", async ({
  page,
  dashboardListings,
}) => {
  await withTempE2EDb(
    async (db) => {
      await db.listing.createMany({
        data: [0, 1, 2].map((index) => ({
          id: `bulk-conflict-${index}`,
          userId: "integration-user",
          title: `Bulk Conflict ${index}`,
          slug: `bulk-conflict-${index}`,
        })),
      });
    },
    { clearFirst: false },
  );
  await page.goto("/dashboard/listings?query=Bulk%20Conflict");
  await dashboardListings.isReady();
  await page
    .getByRole("checkbox", { name: "Select all on this page", exact: true })
    .check();
  await page
    .getByRole("button", { name: "Hide selected", exact: true })
    .click();
  await withTempE2EDb(
    async (db) => {
      await db.listing.update({
        where: { id: "bulk-conflict-1" },
        data: {
          title: "Changed in another tab",
          updatedAt: new Date(Date.now() + 1000),
        },
      });
    },
    { clearFirst: false },
  );
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Hide", exact: true })
    .click();
  await expect(page.getByText(/1 of 3 changes were confirmed/)).toBeVisible();
  await page.reload();
  await dashboardListings.isReady();
  await withTempE2EDb(
    async (db) => {
      expect(
        await db.listing.findUnique({ where: { id: "bulk-conflict-0" } }),
      ).toMatchObject({ status: "HIDDEN" });
      expect(
        await db.listing.findUnique({ where: { id: "bulk-conflict-1" } }),
      ).toMatchObject({ status: null, title: "Changed in another tab" });
      expect(
        await db.listing.findUnique({ where: { id: "bulk-conflict-2" } }),
      ).toMatchObject({ status: null });
    },
    { clearFirst: false },
  );
});
