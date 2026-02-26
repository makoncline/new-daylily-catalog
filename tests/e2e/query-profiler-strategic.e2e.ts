import { clerk } from "@clerk/testing/playwright";
import type { Page } from "@playwright/test";
import { test, expect } from "../../e2e/test-setup";

const PROFILE_TEST_EMAIL = "makon+clerk_test@hey.com";
const PROFILE_USER_SLUG = "rollingoaksdaylilies";
const PROFILE_QUERY = "spacecoast";
const PROFILE_CULTIVAR_SEGMENTS = ["coffee-frenzy", "starman"];

const shouldRunProfileScenario =
  process.env.E2E_PROFILE_SCENARIO === "1" &&
  typeof process.env.BASE_URL === "string" &&
  process.env.BASE_URL.length > 0;

async function waitForSettledPage(page: Page) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForLoadState("networkidle").catch(() => undefined);
}

async function visit(page: Page, path: string) {
  await page.goto(path);
  await waitForSettledPage(page);
}

async function clickLoadMoreIfVisible(page: Page) {
  const loadMoreButton = page.getByRole("button", { name: /load more/i }).first();
  const isVisible = await loadMoreButton.isVisible().catch(() => false);
  if (!isVisible) {
    return false;
  }

  await loadMoreButton.click();
  await waitForSettledPage(page);
  return true;
}

async function signInForProfileRun(page: Page) {
  await visit(page, "/");
  await expect(page).toHaveTitle("Daylily Catalog");

  await clerk.signIn({
    page,
    emailAddress: PROFILE_TEST_EMAIL,
  });

  await visit(page, "/dashboard");
  await expect(page).toHaveURL(/\/dashboard/);
}

test.describe("query profiler strategic navigation @profile", () => {
  test.skip(
    !shouldRunProfileScenario,
    "Set E2E_PROFILE_SCENARIO=1 and BASE_URL to run the profiler scenario.",
  );

  test("visits high-signal routes for query profiling", async ({ page }) => {
    test.slow();

    await signInForProfileRun(page);

    await visit(page, "/dashboard/listings");
    await visit(page, `/dashboard/listings?query=${encodeURIComponent(PROFILE_QUERY)}`);
    await visit(
      page,
      `/dashboard/listings?query=${encodeURIComponent(PROFILE_QUERY)}&page=2`,
    );
    await visit(page, "/dashboard/lists");
    await visit(page, "/dashboard/profile");

    await visit(page, "/catalogs");
    await expect(page).toHaveURL("/catalogs");

    await visit(page, `/${PROFILE_USER_SLUG}`);
    await expect(page).toHaveURL(new RegExp(`/${PROFILE_USER_SLUG}(\\?.*)?$`));

    await visit(
      page,
      `/${PROFILE_USER_SLUG}/search?query=${encodeURIComponent(PROFILE_QUERY)}&sort=price-asc`,
    );

    for (let i = 0; i < 2; i += 1) {
      const clicked = await clickLoadMoreIfVisible(page);
      if (!clicked) {
        break;
      }
    }

    for (const cultivarSegment of PROFILE_CULTIVAR_SEGMENTS) {
      await visit(page, `/cultivar/${cultivarSegment}`);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    }
  });
});
