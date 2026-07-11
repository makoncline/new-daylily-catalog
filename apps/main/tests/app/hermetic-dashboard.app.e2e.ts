import { expect, test } from "@playwright/test";
import path from "node:path";
import { CreateListingDialog } from "../e2e/pages/create-listing-dialog";
import { DashboardListings } from "../e2e/pages/dashboard-listings";
import { DashboardLists } from "../e2e/pages/dashboard-lists";
import { DashboardHome } from "../e2e/pages/dashboard-home";
import { DashboardProfile } from "../e2e/pages/dashboard-profile";
import { EditListingDialog } from "../e2e/pages/edit-listing-dialog";
import { ManageListPage } from "../e2e/pages/manage-list-page";
import { ImageManager } from "../e2e/pages/image-manager";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
let networkLedger: string[] = [];

test.beforeEach(async ({ context, request }) => {
  const reset = await request.post("/api/hermetic/reset");
  expect(reset.ok()).toBe(true);
  networkLedger = [];
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    networkLedger.push(`${route.request().method()} ${url.href}`);
    if (
      ["http:", "https:", "ws:", "wss:"].includes(url.protocol) &&
      !LOCAL_HOSTS.has(url.hostname)
    ) {
      throw new Error(`Hermetic test blocked outbound request: ${url.href}`);
    }
    await route.continue();
  });
});

test.afterEach(async ({}, testInfo) => {
  await testInfo.attach("network-ledger.json", {
    body: Buffer.from(JSON.stringify(networkLedger, null, 2)),
    contentType: "application/json",
  });
});

test("pro seller can sign in locally and open the real listings dashboard", async ({
  page,
}) => {
  await page.goto("/sign-in");
  await page.locator('[data-hermetic-persona="pro-primary"]').click();

  const listings = new DashboardListings(page);
  await listings.goto();
  await listings.isReady();

  await expect(page).toHaveURL(/\/dashboard\/listings/);
  await expect(
    listings.listingRow("Hermetic Pro Garden Daylily 01"),
  ).toBeVisible();

  await page.reload();
  await listings.isReady();
  await expect(
    listings.listingRow("Hermetic Pro Garden Daylily 01"),
  ).toBeVisible();
});

test("guest browses catalogs, a seller, a listing, and catalog search", async ({
  page,
}) => {
  test.slow();
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.locator('a[href="/catalogs"]:visible').first().click();

  await expect(page).toHaveURL(/\/catalogs/);
  await expect(
    page.getByRole("heading", { name: "Daylily Catalogs" }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: /Hermetic Pro Garden/ })
    .first()
    .click();

  await expect(page).toHaveURL(/\/hermetic-pro-garden/);
  await expect(
    page.getByRole("heading", { name: "Hermetic Pro Garden", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("heading", { name: "Hermetic Pro Garden Daylily 01" })
    .click();
  await expect(page).toHaveURL(
    (url) =>
      url.searchParams.get("viewing") === "hermetic-listing-pro-primary-1",
  );
  await expect(page.getByRole("dialog")).toContainText(
    "Hermetic Pro Garden Daylily 01",
  );
  await page.goto("/hermetic-pro-garden/seeded-daylily-1");
  await expect(
    page.getByRole("heading", {
      name: "Hermetic Pro Garden Daylily 01",
      exact: true,
    }),
  ).toBeVisible();

  await page
    .getByRole("button", { name: "Contact Seller", exact: true })
    .click();
  const contactDialog = page.getByRole("dialog");
  await contactDialog.getByLabel("Email").fill("buyer@example.com");
  await contactDialog
    .getByLabel("Message (optional)")
    .fill("Is this daylily available for local pickup?");
  await contactDialog.getByLabel("Message (optional)").press("Tab");
  const sendMessage = contactDialog.getByRole("button", {
    name: "Send Message",
  });
  await expect(sendMessage).toBeEnabled();
  await sendMessage.click();
  await expect(
    page.locator("[data-sonner-toast]").filter({ hasText: "Message sent" }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const response = await fetch("/api/hermetic/events");
        const payload = (await response.json()) as { events: unknown[] };
        return payload.events.length;
      }),
    )
    .toBe(2);

  await page.goto("/hermetic-pro-garden/search");
  const search = page.getByPlaceholder("Search listings...");
  await search.fill("Daylily 02");
  await search.press("Enter");
  await expect(page.getByText("Hermetic Pro Garden Daylily 02")).toBeVisible();
  await expect(page).toHaveURL(
    (url) => url.searchParams.get("query") === "Daylily 02",
  );
  await page.reload();
  await expect(search).toHaveValue("Daylily 02");

  const advanced = page.getByRole("switch", { name: /advanced/i });
  await advanced.click();
  await expect(advanced).toBeChecked();
  await expect(page).toHaveURL(/mode=advanced/);
  await page.getByRole("button", { name: /for sale/i }).click();
  await expect(page).toHaveURL(/price=true/);
  await page.reload();
  await expect(page.getByRole("switch", { name: /advanced/i })).toBeChecked();

  await page.goto("/cultivar/hermetic-create-bloom");
  await expect(
    page.getByRole("heading", { name: "Hermetic Create Bloom", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Hermetic Pro Garden Daylily 01")).toBeVisible();
});

test("protected routes and a second persona use the local auth shell", async ({
  page,
}) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/sign-in/);
  await page.locator('[data-hermetic-persona="pro-secondary"]').click();

  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  for (const [testId, path, heading] of [
    ["dashboard-nav-listings", "/dashboard/listings", "Listings"],
    ["dashboard-nav-lists", "/dashboard/lists", "Lists"],
    ["dashboard-nav-profile", "/dashboard/profile", "Profile"],
    ["dashboard-nav-tags", "/dashboard/tags", "Tags"],
  ] as const) {
    await Promise.all([
      page.waitForURL(path, { timeout: 15_000 }),
      page.getByTestId(testId).click(),
    ]);
    await expect(
      page.getByRole("heading", { name: heading, exact: true }),
    ).toBeVisible();
  }
});

test("anonymous onboarding persists its draft and reaches the dashboard offline", async ({
  page,
}) => {
  const email = "new-unpaid+clerk_test@hermetic.local";

  await page.goto("/start-membership");
  const startMembership = page.getByTestId("start-membership-checkout").first();
  await expect(startMembership).toBeVisible();
  await Promise.all([
    page.waitForURL(/\/onboarding/, { timeout: 15_000 }),
    startMembership.click(),
  ]);

  await page.getByTestId("anonymous-onboarding-email").fill(email);
  await page.getByTestId("anonymous-onboarding-email-submit").click();
  await expect(
    page.getByRole("heading", { name: "Edit your profile" }),
  ).toBeVisible();

  await page.getByTestId("anonymous-profile-name").fill("Claimed Local Garden");
  await page.getByTestId("anonymous-profile-location").fill("Offline, Local");
  await page
    .getByTestId("anonymous-profile-description")
    .fill("Created through the real onboarding UI without third parties.");
  await page.reload();
  await expect(page.getByTestId("anonymous-profile-name")).toHaveValue(
    "Claimed Local Garden",
  );
  await page.getByTestId("anonymous-onboarding-primary-action").click();

  await expect(
    page.getByRole("heading", { name: "Edit your first listing" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Lemon Chiffon Cupcake" }).click();
  await page
    .getByTestId("anonymous-listing-title")
    .fill("Local Onboarding Preview");
  await page.getByTestId("anonymous-listing-price").fill("24");
  await page
    .getByTestId("anonymous-listing-description")
    .fill("A deterministic preview listing.");
  await page.getByTestId("anonymous-onboarding-primary-action").click();

  await expect(page).toHaveURL(/step=preview/);
  await expect(page.getByText("Local Onboarding Preview")).toBeVisible();
  await page.getByTestId("anonymous-onboarding-primary-action").click();
  await expect(
    page.getByRole("heading", { name: "Confirm your account email" }),
  ).toBeVisible();
  await Promise.all([
    page.waitForURL(/\/onboarding\/checkout\/success\?session_id=/, {
      timeout: 15_000,
    }),
    page.getByTestId("anonymous-onboarding-checkout").click(),
  ]);
  await page.locator('[data-hermetic-persona="new-unpaid"]').click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  await page.getByTestId("dashboard-nav-profile").click();
  await expect(page.getByLabel("Garden Name")).toHaveValue(
    "Claimed Local Garden",
  );
});

test("membership states use the local Stripe checkout and portal", async ({
  context,
  page,
}) => {
  await page.goto("/sign-in");
  await page.locator('[data-hermetic-persona="billing-past-due"]').click();
  const billingAlert = page.getByTestId("dashboard-billing-alert");
  await expect(billingAlert).toBeVisible();
  const portalResponse = page.waitForResponse((response) =>
    response.url().includes("stripe.getPortalSession"),
  );
  await billingAlert.getByRole("button", { name: "Update billing" }).click();
  await expect((await portalResponse).ok()).toBe(true);
  await expect(page).toHaveURL(/hermeticPortal=1/);

  await context.clearCookies();
  await page.goto("/sign-in");
  await page.locator('[data-hermetic-persona="checkout-unpaid"]').click();
  const dashboard = new DashboardHome(page);
  await dashboard.waitForLoaded();
  await expect(dashboard.proMembershipCard).toBeVisible();
  await dashboard.upgradeToProButton.click();
  await expect(page).toHaveURL(/\/hermetic\/stripe\/checkout\?session_id=/);
  await expect(
    page.getByRole("heading", { name: "Test checkout complete" }),
  ).toBeVisible();

  await context.clearCookies();
  await page.goto("/sign-in");
  await page.locator('[data-hermetic-persona="billing-canceled"]').click();
  await dashboard.waitForLoaded();
  await expect(dashboard.proMembershipCard).toBeVisible();
});

test("seller edits a profile and sees it on the public catalog", async ({
  page,
}) => {
  await page.goto("/sign-in");
  await page.locator('[data-hermetic-persona="profile-editor"]').click();

  const profile = new DashboardProfile(page);
  await profile.goto();
  await profile.isReady();
  await profile.fillGardenName("Hermetic Garden Updated");
  await profile.fillDescription("Updated through the full dashboard profile.");
  await profile.fillLocation("Updated, Local");
  await profile.saveChangesButton.click();
  await expect(profile.saveChangesButton).toBeDisabled();

  await page.reload();
  await profile.isReady();
  await expect(profile.gardenNameInput).toHaveValue("Hermetic Garden Updated");
  await expect(profile.locationInput).toHaveValue("Updated, Local");

  await page.goto("/hermetic-profile-garden");
  await expect(
    page.getByRole("heading", { name: "Hermetic Garden Updated", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Updated through the full dashboard profile."),
  ).toBeVisible();
});

test("agent discovery, runtime contracts, and WebMCP work offline", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const tools: string[] = [];
    Object.defineProperty(window.navigator, "modelContext", {
      configurable: true,
      value: {
        registerTool(
          tool: { name: string },
          options?: { signal?: AbortSignal },
        ) {
          tools.push(tool.name);
          options?.signal?.addEventListener(
            "abort",
            () => tools.splice(tools.indexOf(tool.name), 1),
            { once: true },
          );
        },
      },
    });
    Object.defineProperty(window, "__hermeticWebMcpTools", {
      configurable: true,
      value: tools,
    });
  });

  await page.goto("/");
  const contracts = await page.evaluate(async () => {
    const paths = [
      "/api/runtime-config",
      "/openapi.json",
      "/.well-known/api-catalog",
      "/.well-known/mcp/server-card.json",
      "/llms.txt",
    ];
    return Promise.all(
      paths.map(async (path) => {
        const response = await fetch(path);
        return { path, status: response.status, body: await response.text() };
      }),
    );
  });
  for (const contract of contracts) {
    expect(contract.status, contract.path).toBe(200);
    expect(contract.body.length, contract.path).toBeGreaterThan(20);
  }

  await page.goto("/sign-in");
  await page.locator('[data-hermetic-persona="pro-primary"]').click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as Window & { __hermeticWebMcpTools?: string[] })
            .__hermeticWebMcpTools,
      ),
    )
    .toContain("daylily.create-listing");
});

test("pro seller creates and edits a listing through the real app", async ({
  page,
}) => {
  await page.goto("/sign-in");
  await page.locator('[data-hermetic-persona="workflow-seller"]').click();

  const listings = new DashboardListings(page);
  const createDialog = new CreateListingDialog(page);
  const editDialog = new EditListingDialog(page);
  await listings.goto();
  await listings.isReady();

  await listings.createListingButton.click();
  await createDialog.isReady();
  await createDialog.searchAndSelectAhsListing(
    "Hermetic Create",
    "Hermetic Create Bloom",
  );
  await createDialog.changeTitle("Hermetic Tracer Listing");
  await createDialog.createListing();

  await editDialog.isReady();
  await editDialog.fillTitle("Hermetic Tracer Listing Edited");
  await editDialog.fillDescription("Persisted through the full local app.");
  await editDialog.fillPrivateNote("Private offline tracer note.");
  await editDialog.setStatusToHidden();
  await editDialog.openListsPicker();
  await editDialog.toggleListByName("Featured Flowers");
  await editDialog.closeListsPicker();
  await editDialog.clickSaveChanges();
  await editDialog.closeWithHeaderX();

  await page.goto("/dashboard");
  await page.goto("/dashboard/listings");
  await listings.isReady();
  await listings.setGlobalSearch("Hermetic Tracer Listing Edited");
  await expect(
    listings.listingRow("Hermetic Tracer Listing Edited"),
  ).toBeVisible();

  await page.reload();
  await listings.isReady();
  await expect(
    listings.listingRow("Hermetic Tracer Listing Edited"),
  ).toBeVisible();
});

test("pro seller uploads, reorders, and deletes images through local storage", async ({
  page,
}) => {
  test.slow();
  await page.goto("/sign-in");
  await page.locator('[data-hermetic-persona="pro-primary"]').click();

  const listings = new DashboardListings(page);
  const editDialog = new EditListingDialog(page);
  const images = new ImageManager(page);
  await page.goto("/dashboard/listings?editing=hermetic-listing-pro-primary-1");
  await listings.isReady();
  await editDialog.isReady();

  await editDialog.dialog
    .locator("#image-upload-input")
    .setInputFiles(path.resolve("public/assets/catalog-blooms.webp"));
  await page.getByRole("button", { name: "Upload", exact: true }).click();
  await expect(
    page.locator("[data-sonner-toast]").filter({
      hasText: "Image uploaded successfully",
    }),
  ).toBeVisible();
  await expect(images.imageItems()).toHaveCount(4);

  await page.reload();
  await editDialog.isReady();
  await expect(images.imageItems()).toHaveCount(4);
  await images.dragImageBefore("hermetic-image-1", "hermetic-image-3");
  await expect(
    page
      .locator("[data-sonner-toast]")
      .filter({ hasText: "Image order updated" }),
  ).toBeVisible();
  await expect
    .poll(() => images.imageOrderIds())
    .toEqual([
      "hermetic-image-2",
      "hermetic-image-3",
      "hermetic-image-1",
      expect.any(String),
    ]);
  await images.imageDeleteButtonById("hermetic-image-3").click();
  await images.confirmImageDelete();
  await expect(images.imageItemById("hermetic-image-3")).toHaveCount(0);
  await page.reload();
  await editDialog.isReady();
  await expect(images.imageItems()).toHaveCount(3);
});

test("seller uses listing filters, pagination, and list membership", async ({
  page,
}) => {
  test.slow();
  await page.goto("/sign-in");
  await page.locator('[data-hermetic-persona="pro-primary"]').click();

  const listings = new DashboardListings(page);
  await listings.goto();
  await listings.isReady();
  await page.getByTestId("pager-per-page").click();
  await page.getByRole("option", { name: "20", exact: true }).click();
  await expect(listings.rows()).toHaveCount(20);
  await listings.goToNextPage();
  await expect(listings.pageIndicator()).toHaveText("Page 2 of 2");
  await listings.goToFirstPage();

  await listings.setGlobalSearch("Daylily 02");
  await expect(
    listings.listingRow("Hermetic Pro Garden Daylily 02"),
  ).toBeVisible();
  await expect(page).toHaveURL(
    (url) => url.searchParams.get("query") === "Daylily 02",
  );
  await page.reload();
  await expect(listings.globalSearchInput).toHaveValue("Daylily 02");
  await listings.resetToolbarFiltersIfVisible();

  await listings.openListsFilter();
  await listings.toggleListFilterOption("Featured Flowers");
  await page.keyboard.press("Escape");
  await expect(listings.rows()).toHaveCount(5);
  await expect(page).toHaveURL(/lists=hermetic-list-pro-primary-featured/);

  const advanced = page.getByRole("switch", { name: /advanced/i });
  await advanced.click();
  await expect(advanced).toBeChecked();
  await listings.openColumnFilter("Private Notes");
  await listings.setOpenColumnFilterValue("note 3");
  await expect(
    listings.listingRow("Hermetic Pro Garden Daylily 03"),
  ).toBeVisible();

  const dashboardLists = new DashboardLists(page);
  await dashboardLists.goto();
  await dashboardLists.isReady();
  await dashboardLists.setGlobalSearch("Featured Flowers");
  await expect(dashboardLists.listRow("Featured Flowers")).toBeVisible();
  await dashboardLists.openFirstVisibleRowActions();
  const manage = dashboardLists.manageRowAction();
  await manage.click();

  const manageList = new ManageListPage(page);
  await manageList.isReady();
  await manageList.openAddListingsDialog();
  await manageList.searchAddListings("Daylily 06");
  await manageList.selectListingToAdd("Hermetic Pro Garden Daylily 06");
  await expect(
    manageList.listingRow("Hermetic Pro Garden Daylily 06"),
  ).toBeVisible();
  await manageList.saveChangesAndWait();
  await page.reload();
  await manageList.isReady();
  await expect(
    manageList.listingRow("Hermetic Pro Garden Daylily 06"),
  ).toBeVisible();

  await dashboardLists.goto();
  await dashboardLists.isReady();
  await dashboardLists.createListButton.click();
  const createList = page.getByRole("dialog", { name: "Create New List" });
  await createList.getByLabel("List Title").fill("Hermetic CRUD List");
  await createList.getByRole("button", { name: "Create List" }).click();
  const editList = dashboardLists.editDialog();
  await expect(editList).toBeVisible();
  await dashboardLists
    .editDescriptionInput()
    .fill("Created and edited offline.");
  await dashboardLists.saveChangesButton().click();
  await dashboardLists.closeEditDialog();
  await dashboardLists.setGlobalSearch("Hermetic CRUD List");
  await expect(dashboardLists.listRow("Hermetic CRUD List")).toBeVisible();
  await dashboardLists.chooseRowActionDelete();
  await dashboardLists.confirmDelete();
  await expect(dashboardLists.listRow("Hermetic CRUD List")).toHaveCount(0);
});
