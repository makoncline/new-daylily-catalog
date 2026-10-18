import { withTempE2EDb } from "@/lib/test-utils/e2e-db";
import { expect, test } from "./fixtures";

const count = 5_000;
const title = (index: number) => `Warm Bloom ${String(index).padStart(5, "0")}`;
const catalogRead = "dashboardV2.bootstrap.catalog";

test("saved listing links stay usable as the profile loads", async ({
  page,
  dashboardListings,
}) => {
  const id = "copy-link-before-profile";
  const listingTitle = "Copy Link Bloom";
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await withTempE2EDb(
    (db) =>
      db.listing.create({
        data: {
          id,
          userId: "integration-user",
          title: listingTitle,
          slug: id,
          status: "PUBLISHED",
        },
      }),
    { clearFirst: false },
  );
  let release: () => void = () => undefined;
  const delivery = new Promise<void>((resolve) => {
    release = resolve;
  });
  try {
    await page.goto("/dashboard/listings");
    await expect(dashboardListings.listingRow(listingTitle)).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Refresh dashboard data" }),
    ).toHaveAttribute("data-state", "idle");
    let profileHeld = false;
    await page.route("**/api/trpc/**", async (route) => {
      const url = route.request().url();
      if (!url.includes("dashboardV2.userProfile.get")) return route.fallback();
      const response = await route.fetch();
      profileHeld = true;
      await delivery;
      await route.fulfill({ response });
    });
    await page.reload();
    await expect.poll(() => profileHeld).toBe(true);
    await expect(
      page.getByRole("button", { name: "Refresh dashboard data" }),
    ).toHaveAttribute("data-state", "idle");
    await dashboardListings.setGlobalSearch(listingTitle);
    await expect(dashboardListings.filteredCount()).toContainText("1 /");
    await page.getByTestId("listing-row-actions-trigger").click();
    await expect(
      page.getByRole("menuitem", { name: "Copy link" }),
    ).toBeVisible();
    await page.getByRole("menuitem", { name: "Copy link" }).click();
    const expectedUrl = new URL(
      `/integration-user/${id}`,
      page.url(),
    ).toString();
    await expect
      .poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toBe(expectedUrl);
    await expect(
      page.getByRole("menuitem", { name: "Copy link" }),
    ).toBeHidden();
    await page.getByTestId("listing-row-actions-trigger").click();
    await expect(
      page.getByRole("menuitem", { name: "Copy link" }),
    ).toBeVisible();
    const profileResponse = page.waitForResponse((response) =>
      response.url().includes("dashboardV2.userProfile.get"),
    );
    release();
    await (await profileResponse).finished();
    // Let React paint the completed profile request before using the open menu.
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
    await expect(
      page.getByRole("menuitem", { name: "Copy link" }),
    ).toBeVisible();
    await page.getByRole("menuitem", { name: "Copy link" }).click();
    await expect
      .poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toBe(new URL(`/integration-seller/${id}`, page.url()).toString());
    await page.unroute("**/api/trpc/**");
    await page.goto(expectedUrl);
    await expect(
      page.getByRole("heading", { name: listingTitle, exact: true }),
    ).toBeVisible();
  } finally {
    release();
    await page.unroute("**/api/trpc/**");
    await withTempE2EDb((db) => db.listing.deleteMany({ where: { id } }), {
      clearFirst: false,
    });
  }
});

test("an outdated dashboard keeps its draft and explains how to reload", async ({
  page,
  editListingDialog,
}) => {
  const id = "outdated-dashboard-listing";
  const draft = "My unsaved garden note";
  await withTempE2EDb(
    (db) =>
      db.listing.create({
        data: {
          id,
          userId: "integration-user",
          title: "Deployment Test Bloom",
          slug: id,
          description: "Previously saved note",
        },
      }),
    { clearFirst: false },
  );
  try {
    await page.goto(`/dashboard/listings?editing=${id}`);
    await editListingDialog.isReady();
    // Send the old browser protocol to the real server. Do not mock a response.
    await page.route("**/api/trpc/**", async (route) => {
      await route.continue({
        url: route.request().url().replaceAll("dashboardV2.", "dashboardDb."),
      });
    });
    await editListingDialog.fillDescription(draft);
    await editListingDialog.clickSaveChanges();
    await expect(
      page.getByText(
        "This dashboard is out of date. Your changes were not saved. Copy any unsaved changes, then reload this page.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(editListingDialog.descriptionInput).toHaveValue(draft);
    await withTempE2EDb(
      async (db) => {
        expect(
          (await db.listing.findUniqueOrThrow({ where: { id } })).description,
        ).toBe("Previously saved note");
      },
      { clearFirst: false },
    );
    await page.unroute("**/api/trpc/**");
    page.once("dialog", (dialog) => dialog.accept());
    await page.reload();
    await editListingDialog.isReady();
    await expect(editListingDialog.descriptionInput).toHaveValue(
      "Previously saved note",
    );
    await editListingDialog.fillDescription(draft);
    await editListingDialog.clickSaveChanges();
    await expect(editListingDialog.dialog).toBeHidden();
    await withTempE2EDb(
      async (db) => {
        expect(
          (await db.listing.findUniqueOrThrow({ where: { id } })).description,
        ).toBe(draft);
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

// Requests reach the real app and SQLite database; only response delivery is delayed.
test("large saved catalog stays usable and current when a refresh overlaps a save", async ({
  page,
  dashboardListings,
  editListingDialog,
}, testInfo) => {
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
    if (pathname.includes(catalogRead)) requests.push(pathname);
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
    await expect(refresh).toHaveAttribute("data-state", "idle", {
      timeout: 15_000,
    });
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
      if (held || !route.request().url().includes(catalogRead))
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
  await expect(refresh).toHaveAttribute("data-state", "idle", {
    timeout: 15_000,
  });
  await page.route("**/api/trpc/**", async (route) => {
    if (route.request().url().includes(catalogRead))
      return route.abort("failed");
    return route.fallback();
  });
  await page.reload();
  await expect(dashboardListings.listingRow("Existing Bloom")).toBeVisible();
  await expect(refresh).toHaveAttribute("data-state", "idle", {
    timeout: 15_000,
  });
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
    await expect(refresh).toHaveAttribute("data-state", "idle", {
      timeout: 15_000,
    });
    await page.route("**/api/trpc/**", (route) => {
      if (route.request().url().includes(catalogRead))
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
    await expect(refresh).toHaveAttribute("data-state", "idle", {
      timeout: 15_000,
    });
    await page.goto(`/dashboard/listings?editing=${id}`);
    await editListingDialog.isReady();
    await expect(refresh).toHaveAttribute("data-state", "idle", {
      timeout: 15_000,
    });
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

test("an account change blocks an old dashboard save before it can write", async ({
  page,
  context,
  baseURL,
  createListingDialog,
  dashboardListings,
}) => {
  const draft = "Keep this draft in the original account";
  await withTempE2EDb(
    (db) =>
      db.user.upsert({
        where: { clerkUserId: "user_integration_other" },
        create: {
          id: "boundary-other-member",
          clerkUserId: "user_integration_other",
        },
        update: {},
      }),
    { clearFirst: false },
  );
  try {
    await page.goto("/dashboard/listings?creating=true");
    await createListingDialog.isReady();
    await createListingDialog.titleInput.fill(draft);
    // The cookie changes before Clerk updates the mounted dashboard.
    await context.addCookies([
      { name: "integration-auth", value: "other-member", url: baseURL! },
    ]);
    await createListingDialog.dialog
      .getByRole("button", { name: "Save", exact: true })
      .click();
    await expect(
      page.locator("[data-sonner-toast]").filter({
        hasText:
          "Your account changed. Your changes were not saved. Copy any unsaved changes, then reload this page.",
      }),
    ).toBeVisible();
    await expect(createListingDialog.titleInput).toHaveValue(draft);
    await withTempE2EDb(
      async (db) => {
        expect(await db.listing.count({ where: { title: draft } })).toBe(0);
      },
      { clearFirst: false },
    );
    // Neither a missing header nor a forged source name bypasses the boundary.
    const invalidHeaders: Record<string, string>[] = [
      {},
      { "x-trpc-source": "server-mcp" },
      { "x-dashboard-member-id": "integration-user" },
    ];
    for (const headers of invalidHeaders) {
      const response = await page.request.get(
        "/api/trpc/dashboardV2.bootstrap.catalog",
        { headers },
      );
      expect(response.status()).toBe(412);
    }
    const bootstrap = await page.request.get(
      "/api/trpc/dashboardV2.user.getCurrentUserId",
      {
        params: {
          input: JSON.stringify({
            json: { clerkUserId: "user_integration_seller" },
          }),
        },
      },
    );
    expect(bootstrap.status()).toBe(412);
    // Deliver Clerk's account change without a page reload.
    await page.evaluate(() =>
      window.dispatchEvent(new Event("integration-auth-change")),
    );
    await expect(page.getByTestId("dashboard-refresh")).toHaveAttribute(
      "data-state",
      "idle",
    );
    await expect(dashboardListings.listingRow("Existing Bloom")).toHaveCount(0);
    await context.clearCookies();
    page.once("dialog", (dialog) => dialog.accept());
    await page.goto("/dashboard/listings?query=Existing%20Bloom");
    await expect(dashboardListings.listingRow("Existing Bloom")).toBeVisible();
  } finally {
    await context.clearCookies();
    await withTempE2EDb(
      (db) => db.user.deleteMany({ where: { id: "boundary-other-member" } }),
      { clearFirst: false },
    );
  }
});
