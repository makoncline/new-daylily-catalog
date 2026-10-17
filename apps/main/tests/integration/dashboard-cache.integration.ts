import { withTempE2EDb } from "@/lib/test-utils/e2e-db";
import { expect, test } from "./fixtures";

const count = 5_000;
const title = (index: number) => `Warm Bloom ${String(index).padStart(5, "0")}`;
const catalogRead = /dashboardDb\.bootstrap\.(catalog|roots)/;

// Requests reach the real app and SQLite database; only response delivery is delayed.
test("large saved catalog stays usable and current when a refresh overlaps a save", async ({
  page,
  dashboardListings,
  editListingDialog,
}, testInfo) => {
  test.skip(
    process.env.DASHBOARD_DATA_LAYER !== "tanstack",
    "The current refresh discards external changes when a save overlaps it.",
  );
  test.setTimeout(120_000);
  await withTempE2EDb(
    async (db) => {
      await db.cultivarReference.createMany({
        data: Array.from({ length: 500 }, (_, index) => ({
          id: `warm-reference-${index}`,
          normalizedName: `warm cultivar ${index}`,
        })),
      });
      await db.listing.createMany({
        data: Array.from({ length: count }, (_, index) => ({
          id: `warm-listing-${index}`,
          title: title(index),
          slug: `warm-bloom-${index}`,
          userId: "integration-user",
          cultivarReferenceId: `warm-reference-${index % 500}`,
          description:
            "A synthetic catalog entry with notes, a cultivar reference, and a price.",
          privateNote: "Keep this division in the east bed.",
          price: 20 + (index % 30),
          status: "PUBLISHED",
        })),
      });
      await db.image.createMany({
        data: Array.from({ length: 1_000 }, (_, index) => ({
          id: `warm-image-${index}`,
          listingId: `warm-listing-${index}`,
          url: "/assets/bouquet.png",
          order: 0,
        })),
      });
    },
    { clearFirst: false },
  );
  const requests: string[] = [];
  page.on("request", (request) => {
    const pathname = new URL(request.url()).pathname;
    if (
      /dashboardDb\.(bootstrap|image\.listBy|cultivarReference\.getByIdsBatch|.*\.sync)/.test(
        pathname,
      )
    )
      requests.push(pathname);
  });
  const refresh = page.getByRole("button", { name: "Refresh dashboard data" });
  let release: () => void = () => undefined;
  try {
    const coldStart = performance.now();
    await page.goto("/dashboard/listings?query=Warm%20Bloom");
    await expect(dashboardListings.filteredCount()).toContainText(
      /5,000 \/ [\d,]+ results/,
      { timeout: 60_000 },
    );
    await expect(refresh).toHaveAttribute("data-state", "idle");
    const coldMs = performance.now() - coldStart;
    const coldRequests = requests.splice(0);
    await dashboardListings.setGlobalSearch(title(4999));
    await expect(dashboardListings.listingRow(title(4999))).toBeVisible();
    await expect(page).toHaveURL(
      (url) => url.searchParams.get("query") === title(4999),
    );

    await withTempE2EDb(
      async (db) => {
        await db.listing.update({
          where: { id: "warm-listing-0" },
          data: { title: "Fresh Bloom 00000" },
        });
        await db.listing.delete({ where: { id: "warm-listing-10" } });
        await db.listing.create({
          data: {
            id: "warm-listing-added",
            userId: "integration-user",
            title: "External New Bloom",
            slug: "external-new-bloom",
            status: "PUBLISHED",
          },
        });
      },
      { clearFirst: false },
    );
    let held = false;
    let responseHeldResolve: () => void = () => undefined;
    const responseHeld = new Promise<void>((resolve) => {
      responseHeldResolve = resolve;
    });
    const delivery = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route("**/api/trpc/**", async (route) => {
      if (held || !catalogRead.test(route.request().url()))
        return route.fallback();
      held = true;
      const response = await route.fetch();
      responseHeldResolve();
      await delivery;
      await route.fulfill({ response });
    });
    const warmStart = performance.now();
    await page.reload();
    await expect(dashboardListings.listingRow(title(4999))).toBeVisible({
      timeout: 5_000,
    });
    const warmUsableMs = performance.now() - warmStart;
    await responseHeld;
    await dashboardListings.setGlobalSearch(title(0));
    await expect(dashboardListings.listingRow(title(0))).toBeVisible();
    await dashboardListings.setGlobalSearch(title(4999));
    await page
      .getByTestId("listing-row-actions-trigger")
      .filter({ visible: true })
      .first()
      .click();
    await page
      .getByTestId("listing-row-action-edit")
      .filter({ visible: true })
      .click();
    await editListingDialog.isReady();
    await editListingDialog.fillTitle("Saved Warm Bloom 04999");
    const saveStart = performance.now();
    await editListingDialog.clickSaveChanges();
    await expect(editListingDialog.dialog).toBeHidden({ timeout: 10_000 });
    const saveMs = performance.now() - saveStart;
    const measurements = {
      mode: process.env.DASHBOARD_DATA_LAYER ?? "current",
      coldMs,
      warmUsableMs,
      saveMs,
      coldRequests,
      requestsThroughSave: [...requests],
    };
    console.log("DASHBOARD_MEASUREMENTS", JSON.stringify(measurements));
    await testInfo.attach("dashboard-measurements", {
      body: JSON.stringify(measurements, null, 2),
      contentType: "application/json",
    });
    release();
    await expect(refresh).toHaveAttribute("data-state", "idle", {
      timeout: 30_000,
    });
    await expect(
      dashboardListings.listingRow("Saved Warm Bloom 04999"),
    ).toBeVisible();
    await dashboardListings.setGlobalSearch("Fresh Bloom 00000");
    await expect(dashboardListings.listingRow("Fresh Bloom 00000")).toBeVisible(
      { timeout: 15_000 },
    );
    await dashboardListings.setGlobalSearch("External New Bloom");
    await expect(
      dashboardListings.listingRow("External New Bloom"),
    ).toBeVisible();
    await dashboardListings.setGlobalSearch(title(10));
    await expect(dashboardListings.filteredCount()).toContainText(
      /0 \/ [\d,]+ results/,
    );
    await dashboardListings.setGlobalSearch("Fresh Bloom 00000");
    await expect(page).toHaveURL(
      (url) => url.searchParams.get("query") === "Fresh Bloom 00000",
    );
    await page.reload();
    await expect(
      dashboardListings.listingRow("Fresh Bloom 00000"),
    ).toBeVisible();
    await dashboardListings.setGlobalSearch("Saved Warm Bloom 04999");
    await expect(
      dashboardListings.listingRow("Saved Warm Bloom 04999"),
    ).toBeVisible();
    await withTempE2EDb(
      async (db) => {
        expect(
          await db.listing.count({
            where: { id: { startsWith: "warm-listing-" } },
          }),
        ).toBe(count);
        expect(
          (
            await db.listing.findUniqueOrThrow({
              where: { id: "warm-listing-4999" },
            })
          ).title,
        ).toBe("Saved Warm Bloom 04999");
      },
      { clearFirst: false },
    );
  } finally {
    release();
    await page.unroute("**/api/trpc/**");
    await withTempE2EDb(
      async (db) => {
        await db.image.deleteMany({
          where: { id: { startsWith: "warm-image-" } },
        });
        await db.listing.deleteMany({
          where: { id: { startsWith: "warm-listing-" } },
        });
        await db.cultivarReference.deleteMany({
          where: { id: { startsWith: "warm-reference-" } },
        });
      },
      { clearFirst: false },
    );
  }
});

test("saved catalog survives a failed refresh and stays scoped to its member", async ({
  page,
  context,
  baseURL,
  dashboardListings,
}) => {
  await page.goto("/dashboard/listings?query=Existing%20Bloom");
  await expect(dashboardListings.listingRow("Existing Bloom")).toBeVisible();
  const refresh = page.getByRole("button", { name: "Refresh dashboard data" });
  await expect(refresh).toHaveAttribute("data-state", "idle");
  await page.route("**/api/trpc/**", async (route) => {
    if (
      /dashboardDb\.(bootstrap\.(catalog|roots)|.*\.sync)/.test(
        route.request().url(),
      )
    )
      return route.abort("failed");
    return route.fallback();
  });
  await page.reload();
  await expect(dashboardListings.listingRow("Existing Bloom")).toBeVisible();
  await expect(refresh).toHaveAttribute("data-state", "idle");
  await page.reload();
  await expect(dashboardListings.listingRow("Existing Bloom")).toBeVisible();
  await page.unroute("**/api/trpc/**");

  await withTempE2EDb(
    async (db) => {
      await db.user.create({
        data: {
          id: "cache-other-member",
          clerkUserId: "user_integration_other",
        },
      });
      await db.listing.create({
        data: {
          id: "cache-other-listing",
          userId: "cache-other-member",
          title: "Other Garden Bloom",
          slug: "other-garden-bloom",
          status: "PUBLISHED",
        },
      });
    },
    { clearFirst: false },
  );
  try {
    await context.addCookies([
      { name: "integration-auth", value: "other-member", url: baseURL! },
    ]);
    await page.goto("/dashboard/listings");
    await expect(
      dashboardListings.listingRow("Other Garden Bloom"),
    ).toBeVisible();
    await expect(dashboardListings.listingRow("Existing Bloom")).toHaveCount(0);
    await context.clearCookies();
    await page.goto("/dashboard/listings?query=Existing%20Bloom");
    await expect(dashboardListings.listingRow("Existing Bloom")).toBeVisible();
    await expect(
      dashboardListings.listingRow("Other Garden Bloom"),
    ).toHaveCount(0);
  } finally {
    await withTempE2EDb(
      async (db) => {
        await db.listing.deleteMany({ where: { id: "cache-other-listing" } });
        await db.user.deleteMany({ where: { id: "cache-other-member" } });
      },
      { clearFirst: false },
    );
  }
});

test("a confirmed save survives failed refreshes and catalog reloads", async ({
  page,
  editListingDialog,
}) => {
  const id = "cache-confirmed-listing";
  await withTempE2EDb(
    (db) =>
      db.listing.create({
        data: {
          id,
          userId: "integration-user",
          title: "Confirmed Cache Bloom",
          slug: id,
        },
      }),
    { clearFirst: false },
  );
  try {
    await page.goto(`/dashboard/listings?editing=${id}`);
    await editListingDialog.isReady();
    const refresh = page.getByRole("button", {
      name: "Refresh dashboard data",
    });
    await expect(refresh).toHaveAttribute("data-state", "idle");
    await page.route("**/api/trpc/**", (route) => {
      if (
        /dashboardDb\.(bootstrap\.(catalog|roots)|.*\.sync)/.test(
          route.request().url(),
        )
      )
        return route.abort("failed");
      return route.fallback();
    });
    await editListingDialog.fillDescription(
      "This save was confirmed by the real server.",
    );
    await editListingDialog.clickSaveChanges();
    await expect(editListingDialog.dialog).toBeHidden();
    await expect(
      page.locator("[data-sonner-toast]").filter({ hasText: "Changes saved" }),
    ).toBeVisible();
    await refresh.click();
    await expect(refresh).toHaveAttribute("data-state", "idle");
    await page.goto(`/dashboard/listings?editing=${id}`);
    await editListingDialog.isReady();
    await expect(refresh).toHaveAttribute("data-state", "idle");
    await expect(editListingDialog.descriptionInput).toHaveValue(
      "This save was confirmed by the real server.",
    );
    await editListingDialog.fillDescription("Saved after the refresh failed.");
    await editListingDialog.clickSaveChanges();
    await expect(editListingDialog.dialog).toBeHidden();
    await page.goto(`/dashboard/listings?editing=${id}`);
    await editListingDialog.isReady();
    await expect(editListingDialog.descriptionInput).toHaveValue(
      "Saved after the refresh failed.",
    );
    await page.reload();
    await editListingDialog.isReady();
    await expect(editListingDialog.descriptionInput).toHaveValue(
      "Saved after the refresh failed.",
    );
    await withTempE2EDb(
      async (db) => {
        expect(
          (await db.listing.findUniqueOrThrow({ where: { id } })).description,
        ).toBe("Saved after the refresh failed.");
      },
      { clearFirst: false },
    );
  } finally {
    await page.unroute("**/api/trpc/**");
    await withTempE2EDb((db) => db.listing.deleteMany({ where: { id } }), {
      clearFirst: false,
    });
  }
});
