import { clerk } from "@clerk/testing/playwright";
import type { APIRequestContext, Page } from "@playwright/test";
import { test, expect } from "./fixtures/app-fixtures";

const TEST_EMAIL = "makon+clerk_test@hey.com";
const SECONDARY_PROFILE_SLUG = "secondary-seeded-daylily-01";
const RELATED_CULTIVAR_PATH = "/cultivar/coffee-frenzy";
const UNRELATED_CULTIVAR_PATH = "/cultivar/goldenzelle";
const CATALOGS_PATH = "/catalogs";
const SECOND_LIST_TITLE = "Show Winners";
const TARGET_LISTING_TITLE = "Coffee Frenzy Prime Fan";
const PROD_SCENARIO_ENABLED =
  process.env.E2E_PROD_SCENARIO === "1" &&
  typeof process.env.BASE_URL === "string" &&
  process.env.BASE_URL.length > 0;

interface RouteSnapshot {
  cacheStatus: string | null;
  html: string;
  status: number;
}

const POLL_INTERVAL_MS = 750;
const ROUTE_EVENTUAL_TIMEOUT_MS = 12000;

function uniqueValue(prefix: string) {
  return `${prefix} qa-${Date.now().toString().slice(-6)}`;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function signIn(page: Page) {
  await page.goto("/");
  await clerk.signIn({ page, emailAddress: TEST_EMAIL });
}

async function getCurrentProfilePath(page: Page) {
  await page.goto("/dashboard/profile", { waitUntil: "networkidle" });
  const href = await page
    .getByRole("link", { name: "View Public Profile" })
    .getAttribute("href");

  if (!href) {
    throw new Error("Could not resolve current public profile path");
  }

  return href;
}

async function getRouteSnapshot(
  request: APIRequestContext,
  path: string,
): Promise<RouteSnapshot> {
  const response = await request.get(path);
  return {
    cacheStatus: response.headers()["x-nextjs-cache"] ?? null,
    html: await response.text(),
    status: response.status(),
  };
}

async function warmRouteAndExpectHit(
  request: APIRequestContext,
  path: string,
): Promise<RouteSnapshot> {
  let snapshot = await getRouteSnapshot(request, path);

  const deadline = Date.now() + ROUTE_EVENTUAL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    snapshot = await getRouteSnapshot(request, path);
    if (snapshot.cacheStatus === "HIT") {
      return snapshot;
    }
    await sleep(POLL_INTERVAL_MS);
  }

  expect(snapshot.cacheStatus).toBe("HIT");
  return snapshot;
}

async function expectRouteContains(args: {
  expectedText: string;
  path: string;
  request: APIRequestContext;
}) {
  let snapshot = await getRouteSnapshot(args.request, args.path);

  const deadline = Date.now() + ROUTE_EVENTUAL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    snapshot = await getRouteSnapshot(args.request, args.path);
    if (snapshot.status === 200 && snapshot.html.includes(args.expectedText)) {
      return snapshot;
    }
    await sleep(POLL_INTERVAL_MS);
  }

  expect(snapshot.status).toBe(200);
  expect(snapshot.html).toContain(args.expectedText);
  return snapshot;
}

async function expectRouteStaysWarmAndContains(args: {
  expectedText: string;
  path: string;
  request: APIRequestContext;
}) {
  const snapshot = await getRouteSnapshot(args.request, args.path);
  expect(snapshot.status).toBe(200);
  expect(snapshot.cacheStatus).toBe("HIT");
  expect(snapshot.html).toContain(args.expectedText);
  return snapshot;
}

async function openTargetListingForEdit(args: {
  title: string;
  dashboardListings: {
    goto: () => Promise<void>;
    isReady: () => Promise<void>;
    setGlobalSearch: (value: string) => Promise<void>;
    listingRow: (listingTitle: string) => ReturnType<Page["locator"]>;
    openFirstVisibleRowActions: () => Promise<void>;
    chooseRowActionEdit: () => Promise<void>;
  };
  editListingDialog: {
    isReady: () => Promise<void>;
  };
}) {
  await args.dashboardListings.goto();
  await args.dashboardListings.isReady();
  await args.dashboardListings.setGlobalSearch(args.title);
  await expect(args.dashboardListings.listingRow(args.title)).toBeVisible();
  await args.dashboardListings.openFirstVisibleRowActions();
  await args.dashboardListings.chooseRowActionEdit();
  await args.editListingDialog.isReady();
}

function listingCardContent(page: Page, title: string) {
  return page
    .getByRole("heading", { name: title })
    .first()
    .locator("xpath=ancestor::div[contains(@class, 'justify-between')][1]");
}

async function expectSearchPageListingListCount(args: {
  countLabel: string;
  page: Page;
  path: string;
  title: string;
}) {
  await args.page.goto(args.path, { waitUntil: "networkidle" });
  await args.page.reload({ waitUntil: "networkidle" });

  const cardContent = listingCardContent(args.page, args.title);
  await expect(cardContent).toBeVisible();
  await expect(
    cardContent.getByRole("button", { name: args.countLabel }).first(),
  ).toBeVisible();
}

test.describe("public invalidation smoke @prod", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(60_000);

  test.skip(
    !PROD_SCENARIO_ENABLED,
    "Set E2E_PROD_SCENARIO=1 and BASE_URL to run the prod attach invalidation scenario.",
  );

  test("profile title update refreshes seller pages while leaving unrelated seller pages warm", async ({
    page,
    request,
    dashboardProfile,
  }) => {
    await signIn(page);

    const profilePath = await getCurrentProfilePath(page);
    await warmRouteAndExpectHit(request, CATALOGS_PATH);
    await warmRouteAndExpectHit(request, profilePath);
    await warmRouteAndExpectHit(request, `/${SECONDARY_PROFILE_SLUG}`);

    await dashboardProfile.goto();
    await dashboardProfile.isReady();

    const nextTitle = uniqueValue("Seeded Daylily Farm");
    await dashboardProfile.fillGardenName(nextTitle);
    await dashboardProfile.saveChangesButton.click();
    await expect(page.getByText("Changes saved")).toBeVisible();

    await expectRouteContains({
      expectedText: nextTitle,
      path: profilePath,
      request,
    });

    await page.goto(`${profilePath}/search`, { waitUntil: "networkidle" });
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.getByText(nextTitle).first()).toBeVisible();

    await expectRouteStaysWarmAndContains({
      expectedText: "Secondary Seed Farm 01",
      path: `/${SECONDARY_PROFILE_SLUG}`,
      request,
    });
  });

  test("listing description update refreshes seller and cultivar pages while leaving unrelated seller and cultivar pages warm", async ({
    page,
    request,
    dashboardListings,
    editListingDialog,
  }) => {
    await signIn(page);
    const profilePath = await getCurrentProfilePath(page);

    await warmRouteAndExpectHit(request, profilePath);
    await warmRouteAndExpectHit(request, RELATED_CULTIVAR_PATH);
    await warmRouteAndExpectHit(request, `/${SECONDARY_PROFILE_SLUG}`);
    await warmRouteAndExpectHit(request, UNRELATED_CULTIVAR_PATH);

    await openTargetListingForEdit({
      title: TARGET_LISTING_TITLE,
      dashboardListings,
      editListingDialog,
    });

    const nextDescription = uniqueValue("Coffee Frenzy description");
    await editListingDialog.fillDescription(nextDescription);
    await editListingDialog.clickSaveChanges();
    await expect(page.getByText("Changes saved")).toBeVisible();

    await expectRouteContains({
      expectedText: nextDescription,
      path: profilePath,
      request,
    });
    await expectRouteContains({
      expectedText: nextDescription,
      path: RELATED_CULTIVAR_PATH,
      request,
    });

    await expectRouteStaysWarmAndContains({
      expectedText: "Secondary Seed Farm 01",
      path: `/${SECONDARY_PROFILE_SLUG}`,
      request,
    });
    await expectRouteStaysWarmAndContains({
      expectedText: "Goldenzelle",
      path: UNRELATED_CULTIVAR_PATH,
      request,
    });
  });

  test("list membership update refreshes the seller root listing card without touching catalogs or unrelated sellers", async ({
    page,
    request,
    dashboardListings,
    editListingDialog,
  }) => {
    await signIn(page);
    const profilePath = await getCurrentProfilePath(page);

    await warmRouteAndExpectHit(request, profilePath);
    await warmRouteAndExpectHit(request, CATALOGS_PATH);
    await warmRouteAndExpectHit(request, `/${SECONDARY_PROFILE_SLUG}`);

    await openTargetListingForEdit({
      title: TARGET_LISTING_TITLE,
      dashboardListings,
      editListingDialog,
    });

    await editListingDialog.openListsPicker();
    const wasSecondListSelected =
      await editListingDialog.isListSelected(SECOND_LIST_TITLE);
    const expectedCountLabel = wasSecondListSelected ? "1 list" : "2 lists";
    await editListingDialog.toggleListByName(SECOND_LIST_TITLE);
    await expect(page.getByText("Lists updated")).toBeVisible();
    await editListingDialog.closeListsPicker();

    await expectSearchPageListingListCount({
      countLabel: expectedCountLabel,
      page,
      path: profilePath,
      title: TARGET_LISTING_TITLE,
    });

    await expectRouteStaysWarmAndContains({
      expectedText: "Browse Daylily Catalogs",
      path: CATALOGS_PATH,
      request,
    });
    await expectRouteStaysWarmAndContains({
      expectedText: "Secondary Seed Farm 01",
      path: `/${SECONDARY_PROFILE_SLUG}`,
      request,
    });
  });

  test("slug update refreshes the new path and clears the old path while leaving unrelated seller pages warm", async ({
    page,
    request,
    dashboardProfile,
  }) => {
    await signIn(page);

    const oldProfilePath = await getCurrentProfilePath(page);
    await warmRouteAndExpectHit(request, oldProfilePath);
    await warmRouteAndExpectHit(request, `/${SECONDARY_PROFILE_SLUG}`);

    await dashboardProfile.goto();
    await dashboardProfile.isReady();

    const currentTitle = await dashboardProfile.gardenNameInput.inputValue();
    const nextSlug = `seeded-daylily-${Date.now().toString().slice(-6)}`;
    await dashboardProfile.fillSlug(nextSlug);
    await dashboardProfile.saveChangesButton.click();
    await expect(page.getByText("Changes saved")).toBeVisible();

    const newProfilePath = `/${nextSlug}`;

    await expectRouteContains({
      expectedText: currentTitle,
      path: newProfilePath,
      request,
    });

    const oldPathSnapshot = await getRouteSnapshot(request, oldProfilePath);
    expect(oldPathSnapshot.status).toBe(404);

    await expectRouteStaysWarmAndContains({
      expectedText: "Secondary Seed Farm 01",
      path: `/${SECONDARY_PROFILE_SLUG}`,
      request,
    });
  });
});
