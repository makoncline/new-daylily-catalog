import type { Page } from "@playwright/test";
import { withTempE2EDb } from "@/lib/test-utils/e2e-db";
import { expect, test } from "./fixtures";

async function openBulkAction(page: Page, name: string) {
  await page.getByRole("button", { name: /^Bulk actions \(/ }).click();
  await page.getByRole("menuitem", { name, exact: true }).click();
}

test("seller hides, publishes, and deletes selected listings without changing other rows", async ({
  page,
  dashboardListings,
}) => {
  test.setTimeout(90_000);
  const titles = Array.from({ length: 22 }, (_, index) =>
    index === 3
      ? "Bulk Bloom 03 — A Cultivar with a Long Name for a Small Screen"
      : `Bulk Bloom ${String(index).padStart(2, "0")}`,
  );
  await withTempE2EDb(
    async (db) => {
      await db.listing.createMany({
        data: titles.map((title, index) => ({
          id: `bulk-listing-${index}`,
          userId: "integration-user",
          title,
          slug: `bulk-bloom-${index}`,
        })),
      });
      await db.list.update({
        where: { id: "integration-favorites-list" },
        data: { listings: { connect: [{ id: "bulk-listing-0" }] } },
      });
      await db.image.createMany({
        data: [0, 20].map((index) => ({
          id: `bulk-image-${index}`,
          listingId: `bulk-listing-${index}`,
          url: "/assets/bouquet.png",
        })),
      });
      await db.imageAsset.createMany({
        data: [0, 20].map((index) => ({
          id: `bulk-image-${index}`,
          legacyImageId: `bulk-image-${index}`,
          kind: "listing",
          listingId: `bulk-listing-${index}`,
          displayUrl: "/assets/bouquet.png",
        })),
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
    page.getByRole("button", { name: "Bulk actions (2)", exact: true }),
  ).toBeVisible();

  const dialog = page.getByRole("alertdialog");
  await page.screenshot({ path: test.info().outputPath("bulk-selection.png") });
  await openBulkAction(page, "Hide");
  await expect(dialog).toContainText("2 listings");
  await expect(dialog.getByRole("listitem")).toHaveText([
    "Bulk Bloom 00",
    "Bulk Bloom 21",
  ]);
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(dialog).toBeHidden();
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
  await openBulkAction(page, "Hide");
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

  if (await dashboardListings.pagerNextButton.isEnabled())
    await dashboardListings.pagerNextButton.click();
  await select("Bulk Bloom 21").check();
  await dashboardListings.setGlobalSearch("Bulk Bloom 00");
  await select("Bulk Bloom 00").check();
  await openBulkAction(page, "Publish");
  await expect(dialog.getByRole("listitem")).toHaveText([
    "Bulk Bloom 00",
    "Bulk Bloom 21",
  ]);
  await expect(dialog).toContainText(
    "Hidden by your filters: 1 selected. This action includes them.",
  );
  await dialog.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(
    page.getByText("2 listings published", { exact: true }),
  ).toBeVisible();
  await withTempE2EDb(
    async (db) => {
      expect(
        await db.listing.findUnique({ where: { id: "bulk-listing-0" } }),
      ).toMatchObject({ status: null });
      expect(
        await db.listing.findUnique({ where: { id: "bulk-listing-21" } }),
      ).toMatchObject({ status: null });
    },
    { clearFirst: false },
  );

  await dashboardListings.setGlobalSearch("Bulk Bloom");
  await expect(
    page.getByRole("button", { name: /^Bulk actions \(/ }),
  ).toHaveCount(0);
  if (await dashboardListings.pagerFirstButton.isEnabled())
    await dashboardListings.pagerFirstButton.click();
  await page
    .getByRole("checkbox", { name: "Select all on this page", exact: true })
    .check();
  await expect(
    page.getByText("2 listings published", { exact: true }),
  ).toBeHidden();
  await dashboardListings.setGlobalSearch("Bulk Bloom 00");
  await openBulkAction(page, "Delete");
  await expect(dialog).toContainText("20 listings");
  await expect(dialog).toContainText(
    "Hidden by your filters: 19 selected. This action includes them.",
  );
  await expect(dialog).toContainText(
    "This permanently deletes the listings below and their images",
  );
  const affected = dialog.getByRole("list", { name: "Selected listings" });
  await expect(affected.getByRole("listitem")).toHaveText(titles.slice(0, 20));
  const confirmation = dialog.getByRole("textbox", {
    name: "Type DELETE to confirm",
  });
  const deleteButton = dialog.getByRole("button", {
    name: "Delete 20 listings",
    exact: true,
  });
  for (const viewport of [
    { name: "desktop", width: 1280, height: 720 },
    { name: "mobile", width: 390, height: 844 },
    { name: "small-mobile", width: 360, height: 568 },
  ]) {
    await page.setViewportSize(viewport);
    await expect(deleteButton).toBeDisabled();
    await expect(deleteButton).toBeInViewport({ ratio: 1 });
    await expect(confirmation).toBeInViewport({ ratio: 1 });
    await expect(
      dialog.getByRole("button", { name: "Cancel", exact: true }),
    ).toBeInViewport({ ratio: 1 });
    expect(
      await affected.evaluate((element) => ({
        scrollsVertically: element.scrollHeight > element.clientHeight,
        fitsWidth: element.scrollWidth <= element.clientWidth,
      })),
    ).toEqual({ scrollsVertically: true, fitsWidth: true });
    await affected.focus();
    await page.keyboard.press("Home");
    await expect(affected.getByRole("listitem").first()).toBeInViewport({
      ratio: 1,
    });
    await dialog.getByRole("button", { name: "Cancel", exact: true }).focus();
    await page.screenshot({
      path: test.info().outputPath(`bulk-delete-20-${viewport.name}.png`),
      animations: "disabled",
    });
    await affected.focus();
    await page.keyboard.press("End");
    await expect(affected.getByRole("listitem").last()).toBeInViewport({
      ratio: 1,
    });
    await expect(deleteButton).toBeInViewport({ ratio: 1 });
  }
  await confirmation.fill("keep");
  await expect(deleteButton).toBeDisabled();
  await confirmation.fill("delete");
  await expect(deleteButton).toBeEnabled();
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(dialog).toBeHidden();
  await withTempE2EDb(
    async (db) => {
      expect(
        await db.listing.count({
          where: { id: { startsWith: "bulk-listing-" } },
        }),
      ).toBe(22);
      expect(
        await db.imageAsset.count({
          where: { id: { startsWith: "bulk-image-" } },
        }),
      ).toBe(2);
    },
    { clearFirst: false },
  );
  await dashboardListings.setGlobalSearch("Bulk Bloom");
  await dashboardListings.pagerNextButton.click();
  await expect(dashboardListings.pageIndicator()).toHaveText("Page 2 of 2");
  await openBulkAction(page, "Delete");
  await expect(confirmation).toHaveValue("");
  await expect(deleteButton).toBeDisabled();
  await confirmation.fill("DELETE");
  await deleteButton.click();
  await expect(
    page.getByText("20 listings deleted", { exact: true }),
  ).toBeVisible({ timeout: 15_000 });
  await expect(dashboardListings.pageIndicator()).toHaveText("Page 1 of 1");
  await expect(dashboardListings.listingRow("Bulk Bloom 20")).toBeVisible();
  await expect(dashboardListings.listingRow("Bulk Bloom 21")).toBeVisible();
  await expect(page).toHaveURL(
    (url) => url.searchParams.get("query") === "Bulk Bloom",
  );
  await page.reload();
  await dashboardListings.isReady();
  await expect(dashboardListings.listingRow("Bulk Bloom 00")).toHaveCount(0);
  await expect(dashboardListings.listingRow("Bulk Bloom 20")).toBeVisible({
    timeout: 15_000,
  });
  await withTempE2EDb(
    async (db) => {
      expect(
        await db.listing.count({
          where: { id: { startsWith: "bulk-listing-" } },
        }),
      ).toBe(2);
      expect(
        await db.imageAsset.findUnique({ where: { id: "bulk-image-0" } }),
      ).toBeNull();
      expect(
        await db.image.findUnique({ where: { id: "bulk-image-0" } }),
      ).toBeNull();
      expect(
        await db.image.findUnique({ where: { id: "bulk-image-20" } }),
      ).toMatchObject({ listingId: "bulk-listing-20" });
      expect(
        await db.imageAsset.findUnique({ where: { id: "bulk-image-20" } }),
      ).not.toBeNull();
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
      await db.list.create({
        data: {
          id: "bulk-target-list",
          userId: "integration-user",
          title: "Bulk target list",
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
  const viewSelected = page.getByRole("button", {
    name: "View selected",
    exact: true,
  });
  const backToResults = page.getByRole("button", {
    name: "Back to results",
    exact: true,
  });
  const search = page.getByPlaceholder("Search listings...");
  const forSale = page.getByTestId("advanced-filter-for-sale");
  await expect(viewSelected).toHaveCount(0);
  await select("Bulk Add 00").check();
  await dashboardListings.pagerNextButton.click();
  await select("Bulk Add 21").check();
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("heading", { name: "Listings", exact: true })
    .scrollIntoViewIfNeeded();
  await page.screenshot({
    path: test.info().outputPath("bulk-toolbar-mobile.png"),
    animations: "disabled",
  });
  await dashboardListings.setGlobalSearch("No matching listings");
  await forSale.click();
  await expect(forSale).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByText("Hidden by your filters: 2 selected.", { exact: true }),
  ).toBeVisible();
  await viewSelected.click();
  await expect(search).toBeHidden();
  await expect(dashboardListings.listingRow("Bulk Add 00")).toBeVisible();
  await expect(dashboardListings.listingRow("Bulk Add 21")).toBeVisible();
  await expect(dashboardListings.listingRow("Bulk Add 01")).toHaveCount(0);
  for (const viewport of [
    { name: "desktop", width: 1280, height: 720 },
    { name: "mobile", width: 390, height: 844 },
    { name: "small-mobile", width: 360, height: 568 },
  ]) {
    await page.setViewportSize(viewport);
    await expect(
      dashboardListings.listingsTable.locator("th").first(),
    ).toHaveCSS("width", "32px");
    await expect(
      dashboardListings.listingRow("Bulk Add 00").locator("td").first(),
    ).toHaveCSS("width", "32px");
    await expect(select("Bulk Add 00")).toHaveCSS("width", "16px");
    await expect(select("Bulk Add 00")).toBeChecked();
    await page.screenshot({
      path: test.info().outputPath(`bulk-review-${viewport.name}.png`),
      animations: "disabled",
    });
    await page
      .getByRole("button", { name: "Bulk actions (2)", exact: true })
      .click();
    await expect(
      page.getByRole("menuitem", { name: "Delete", exact: true }),
    ).toBeInViewport({ ratio: 1 });
    await page.screenshot({
      path: test.info().outputPath(`bulk-menu-${viewport.name}.png`),
      animations: "disabled",
    });
    await page.keyboard.press("Escape");
  }
  await backToResults.click();
  await expect(search).toHaveValue("No matching listings");
  await expect(forSale).toHaveAttribute("aria-pressed", "true");
  await expect(dashboardListings.listingRow("Bulk Add 00")).toHaveCount(0);

  const dialog = page.getByRole("alertdialog");
  await openBulkAction(page, "Add to list");
  await expect(dialog.getByRole("listitem")).toHaveText([
    "Bulk Add 00",
    "Bulk Add 21",
  ]);
  await expect(
    dialog.getByRole("button", { name: "Add to list", exact: true }),
  ).toBeDisabled();
  await dialog.getByRole("combobox", { name: "List", exact: true }).click();
  await page
    .getByRole("option", { name: "Bulk target list", exact: true })
    .click();
  await expect(dialog).toContainText(
    "Other list memberships and visibility do not change",
  );
  await page.screenshot({
    path: test.info().outputPath("bulk-add-confirmation.png"),
    animations: "disabled",
  });
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(dialog).toBeHidden();
  await withTempE2EDb(
    async (db) => {
      expect(
        await db.list.count({
          where: {
            id: "bulk-target-list",
            listings: { some: { id: "bulk-add-21" } },
          },
        }),
      ).toBe(0);
    },
    { clearFirst: false },
  );
  await openBulkAction(page, "Add to list");
  await dialog.getByRole("combobox", { name: "List", exact: true }).click();
  await page
    .getByRole("option", { name: "Bulk target list", exact: true })
    .click();
  await dialog
    .getByRole("button", { name: "Add to list", exact: true })
    .click();
  await expect(
    page.getByText("2 listings are in “Bulk target list”", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(viewSelected).toHaveCount(0);
  await expect(search).toHaveValue("No matching listings");
  await expect(forSale).toHaveAttribute("aria-pressed", "true");
  await dashboardListings.setGlobalSearch("Bulk Add");
  await forSale.click();
  await expect(dashboardListings.listingRow("Bulk Add 01")).toBeVisible();

  await select("Bulk Add 00").check();
  await viewSelected.click();
  await select("Bulk Add 00").uncheck();
  await expect(search).toHaveValue("Bulk Add");
  await expect(dashboardListings.listingRow("Bulk Add 01")).toBeVisible();
  await select("Bulk Add 00").check();
  await viewSelected.click();
  await page
    .getByRole("button", { name: "Clear selection", exact: true })
    .click();
  await expect(viewSelected).toHaveCount(0);
  await expect(search).toHaveValue("Bulk Add");
  await expect(dashboardListings.listingRow("Bulk Add 01")).toBeVisible();
  await page.reload();
  await dashboardListings.isReady();
  await withTempE2EDb(
    async (db) => {
      const target = await db.list.findUniqueOrThrow({
        where: { id: "bulk-target-list" },
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

test("seller creates a first list from bulk selection before confirming its members", async ({
  page,
  context,
  baseURL,
  dashboardListings,
}) => {
  await withTempE2EDb(
    (db) =>
      db.user.create({
        data: {
          id: "bulk-new-list-member",
          clerkUserId: "user_integration_other",
          listings: {
            create: [0, 1, 2].map((index) => ({
              id: `bulk-new-list-${index}`,
              title: `New List Bloom ${index}`,
              slug: `new-list-bloom-${index}`,
              status: "HIDDEN",
            })),
          },
        },
      }),
    { clearFirst: false },
  );
  try {
    await context.addCookies([
      { name: "integration-auth", value: "other-member", url: baseURL! },
    ]);
    await page.goto("/dashboard/listings");
    await dashboardListings.isReady();
    for (const index of [0, 1]) {
      await dashboardListings
        .listingRow(`New List Bloom ${index}`)
        .getByRole("checkbox", { name: "Select row" })
        .check();
    }
    await openBulkAction(page, "Add to list");
    const confirmation = page.getByRole("alertdialog");
    await confirmation
      .getByRole("combobox", { name: "List", exact: true })
      .click();
    const picker = page.getByRole("dialog", {
      name: "Select a list",
      exact: true,
    });
    await picker.getByPlaceholder("Search lists...").fill("New bulk list");
    await page.screenshot({
      path: test.info().outputPath("bulk-create-list-desktop.png"),
      animations: "disabled",
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: test.info().outputPath("bulk-create-list-mobile.png"),
      animations: "disabled",
    });
    await picker
      .getByRole("option", { name: 'Create "New bulk list"', exact: true })
      .click();
    await expect(picker).toBeHidden();
    await expect(confirmation).toContainText("New bulk list");
    await expect(confirmation.getByRole("listitem")).toHaveText([
      "New List Bloom 0",
      "New List Bloom 1",
    ]);
    await confirmation
      .getByRole("button", { name: "Cancel", exact: true })
      .click();
    await expect(confirmation).toBeHidden();
    await withTempE2EDb(
      async (db) => {
        const lists = await db.list.findMany({
          where: { userId: "bulk-new-list-member" },
          include: { listings: true },
        });
        expect(lists).toHaveLength(1);
        expect(lists[0]).toMatchObject({
          title: "New bulk list",
          listings: [],
        });
      },
      { clearFirst: false },
    );

    await openBulkAction(page, "Add to list");
    await confirmation
      .getByRole("combobox", { name: "List", exact: true })
      .click();
    await picker
      .getByRole("option", { name: "New bulk list", exact: true })
      .click();
    await expect(picker).toBeHidden();
    await page.screenshot({
      path: test.info().outputPath("bulk-new-list-mobile.png"),
      animations: "disabled",
    });
    await confirmation
      .getByRole("button", { name: "Add to list", exact: true })
      .click();
    await expect(
      page.getByText("2 listings are in “New bulk list”", { exact: true }),
    ).toBeVisible();
    await page.reload();
    await dashboardListings.isReady();
    await expect(
      page.getByRole("cell", { name: "New bulk list", exact: true }),
    ).toHaveCount(2);
    await withTempE2EDb(
      async (db) => {
        const lists = await db.list.findMany({
          where: { userId: "bulk-new-list-member" },
          include: { listings: { orderBy: { id: "asc" } } },
        });
        expect(lists).toHaveLength(1);
        expect(
          lists[0]?.listings.map(({ id, status }) => ({ id, status })),
        ).toEqual([
          { id: "bulk-new-list-0", status: "HIDDEN" },
          { id: "bulk-new-list-1", status: "HIDDEN" },
        ]);
      },
      { clearFirst: false },
    );
  } finally {
    await context.clearCookies();
    await page.close();
    await withTempE2EDb(
      async (db) => {
        await db.list.deleteMany({ where: { userId: "bulk-new-list-member" } });
        await db.listing.deleteMany({
          where: { userId: "bulk-new-list-member" },
        });
        await db.user.delete({ where: { id: "bulk-new-list-member" } });
      },
      { clearFirst: false },
    );
  }
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
  await openBulkAction(page, "Hide");
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
