import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import type { Page } from "@playwright/test";
import { DashboardHome } from "../e2e/pages/dashboard-home";
import { DashboardShell } from "../e2e/pages/dashboard-shell";
import { captureAtlasState, expect, test } from "./atlas-test";

const desktop = { height: 768, width: 1024 };
const mobile = { height: 874, width: 402 };
const fixtureUserId = "atlas-dashboard-home-user";
const fixtureProfileId = "atlas-dashboard-home-profile";
const fixtureStripeCustomerId = "atlas_dashboard_home";
const fixtureStripeKey = `stripe:customer:${fixtureStripeCustomerId}`;
let originalUserId: string;
let realisticClerkUserId: string;
let originalStripeKey: string;
let originalSubscriptionValue: string;
let originalListingCount: number;

type DashboardState = "setup" | "upgrade" | "billing" | "active-pro";
type AtlasDatabaseRow = Record<string, unknown>;

function withAtlasDatabase<T>(run: (database: DatabaseSync) => T) {
  const databaseUrl = process.env.ATLAS_DATABASE_URL;
  if (!databaseUrl?.startsWith("file:")) {
    throw new Error(
      "Dashboard home Atlas states require a managed file-backed ATLAS_DATABASE_URL.",
    );
  }

  const database = new DatabaseSync(fileURLToPath(new URL(databaseUrl)));
  database.exec("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 15000;");
  try {
    return run(database);
  } finally {
    database.close();
  }
}

function inTransaction<T>(database: DatabaseSync, run: () => T) {
  database.exec("BEGIN IMMEDIATE;");
  try {
    const result = run();
    database.exec("COMMIT;");
    return result;
  } catch (error) {
    database.exec("ROLLBACK;");
    throw error;
  }
}

function initializeFixture() {
  withAtlasDatabase((database) =>
    inTransaction(database, () => {
      const originalUser = database
        .prepare(
          `
            SELECT
              User.id,
              User.clerkUserId,
              User.stripeCustomerId,
              KeyValue.value AS subscriptionValue
            FROM User
            INNER JOIN UserProfile ON UserProfile.userId = User.id
            INNER JOIN KeyValue
              ON KeyValue.key = 'stripe:customer:' || User.stripeCustomerId
            WHERE UserProfile.slug = 'rollingoaksdaylilies'
          `,
        )
        .get() as AtlasDatabaseRow | undefined;
      if (
        typeof originalUser?.id !== "string" ||
        typeof originalUser.clerkUserId !== "string" ||
        typeof originalUser.stripeCustomerId !== "string" ||
        typeof originalUser.subscriptionValue !== "string"
      ) {
        throw new Error("The realistic Rolling Oaks Atlas persona is missing.");
      }
      originalUserId = originalUser.id;
      realisticClerkUserId = originalUser.clerkUserId;
      originalStripeKey = `stripe:customer:${originalUser.stripeCustomerId}`;
      originalSubscriptionValue = originalUser.subscriptionValue;
      const listingCount = database
        .prepare("SELECT COUNT(*) AS count FROM Listing WHERE userId = ?")
        .get(originalUserId) as AtlasDatabaseRow | undefined;
      if (typeof listingCount?.count !== "number") {
        throw new Error("The realistic Rolling Oaks listing count is missing.");
      }
      originalListingCount = listingCount.count;

      const now = Date.now();
      database
        .prepare(
          `
            INSERT INTO User (
              id, clerkUserId, stripeCustomerId, role, createdAt, updatedAt
            )
            VALUES (?, NULL, ?, 'USER', ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              stripeCustomerId = excluded.stripeCustomerId,
              updatedAt = excluded.updatedAt
          `,
        )
        .run(fixtureUserId, fixtureStripeCustomerId, now, now);
      database
        .prepare(
          `
            INSERT INTO UserProfile (
              id, userId, title, slug, description, content, location,
              createdAt, updatedAt
            )
            VALUES (?, ?, ?, ?, NULL, NULL, NULL, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              title = excluded.title,
              slug = excluded.slug,
              updatedAt = excluded.updatedAt
          `,
        )
        .run(
          fixtureProfileId,
          fixtureUserId,
          "Atlas Daylilies",
          "atlas-dashboard-home",
          now,
          now,
        );
    }),
  );
}

function upsertSubscription(
  database: DatabaseSync,
  key: string,
  value: string,
  now: number,
) {
  database
    .prepare(
      `
        INSERT INTO KeyValue (key, value, createdAt, updatedAt)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET
          value = excluded.value,
          updatedAt = excluded.updatedAt
      `,
    )
    .run(key, value, now, now);
}

function seedDashboardState(state: DashboardState) {
  const subscriptionStatus =
    state === "billing"
      ? "past_due"
      : state === "active-pro"
        ? "active"
        : "none";

  withAtlasDatabase((database) =>
    inTransaction(database, () => {
      const now = Date.now();
      if (state === "setup") {
        database
          .prepare(
            "UPDATE User SET clerkUserId = NULL, updatedAt = ? WHERE id = ?",
          )
          .run(now, originalUserId);
        database
          .prepare(
            "UPDATE User SET clerkUserId = ?, updatedAt = ? WHERE id = ?",
          )
          .run(realisticClerkUserId, now, fixtureUserId);
        upsertSubscription(
          database,
          fixtureStripeKey,
          JSON.stringify({ status: "none" }),
          now,
        );
      } else {
        database
          .prepare(
            "UPDATE User SET clerkUserId = NULL, updatedAt = ? WHERE id = ?",
          )
          .run(now, fixtureUserId);
        database
          .prepare(
            "UPDATE User SET clerkUserId = ?, updatedAt = ? WHERE id = ?",
          )
          .run(realisticClerkUserId, now, originalUserId);
        upsertSubscription(
          database,
          originalStripeKey,
          JSON.stringify({ status: subscriptionStatus }),
          now,
        );
      }
    }),
  );
}

function restoreRealisticPersona() {
  if (!originalUserId) return;
  withAtlasDatabase((database) =>
    inTransaction(database, () => {
      const now = Date.now();
      database
        .prepare(
          "UPDATE User SET clerkUserId = NULL, updatedAt = ? WHERE id = ?",
        )
        .run(now, fixtureUserId);
      database
        .prepare("UPDATE User SET clerkUserId = ?, updatedAt = ? WHERE id = ?")
        .run(realisticClerkUserId, now, originalUserId);
      upsertSubscription(
        database,
        originalStripeKey,
        originalSubscriptionValue,
        now,
      );
    }),
  );
}

async function openDashboard(
  page: Page,
  state: DashboardState,
  viewport: typeof desktop,
) {
  seedDashboardState(state);
  await page.addInitScript(() => {
    for (const key of Object.keys(window.localStorage)) {
      if (key.startsWith("stripe-subscription:")) {
        window.localStorage.removeItem(key);
      }
    }
  });
  await page.setViewportSize(viewport);
  await page.goto("/dashboard");

  const dashboard = new DashboardHome(page);
  await dashboard.waitForLoaded();
  await new DashboardShell(page).refreshDashboardData();
  await expect(
    page.getByText("Dashboard refreshed", { exact: true }),
  ).toBeHidden();
  // The dev-only auth failure trigger is not part of the production dashboard.
  await page
    .getByRole("button", { name: "Test Auth Error" })
    .evaluate((button) => {
      button.parentElement?.style.setProperty("display", "none");
    });

  const totalListingsCard = page
    .getByText("Total Listings", { exact: true })
    .locator("../..");
  await expect(totalListingsCard).toContainText(
    state === "setup" ? "0" : String(originalListingCount),
  );
  return dashboard;
}

async function captureSetup(
  page: Page,
  viewport: typeof desktop,
  stateId: string,
) {
  const dashboard = await openDashboard(page, "setup", viewport);
  await expect(dashboard.profileCompletionPercentage).toHaveText("0%");
  await expect(dashboard.catalogProgressPercentage).toHaveText("0%");
  await expect(dashboard.upgradeToProButton).toBeVisible();
  await captureAtlasState(page, stateId);
}

async function captureUpgrade(
  page: Page,
  viewport: typeof desktop,
  stateId: string,
) {
  const dashboard = await openDashboard(page, "upgrade", viewport);
  await expect(dashboard.completeProfileCard).toHaveCount(0);
  await expect(dashboard.catalogProgressCard).toHaveCount(0);
  await expect(dashboard.upgradeToProButton).toBeVisible();
  await expect(page.getByTestId("dashboard-billing-alert")).toHaveCount(0);
  await captureAtlasState(page, stateId);
}

async function captureBilling(
  page: Page,
  viewport: typeof desktop,
  stateId: string,
) {
  const dashboard = await openDashboard(page, "billing", viewport);
  await expect(dashboard.completeProfileCard).toHaveCount(0);
  await expect(dashboard.catalogProgressCard).toHaveCount(0);
  await expect(page.getByTestId("dashboard-billing-alert")).toBeVisible();
  await expect(page.getByTestId("dashboard-update-billing")).toBeVisible();
  await captureAtlasState(page, stateId);
}

async function captureActivePro(
  page: Page,
  viewport: typeof desktop,
  stateId: string,
) {
  const dashboard = await openDashboard(page, "active-pro", viewport);
  await expect(dashboard.completeProfileCard).toHaveCount(0);
  await expect(dashboard.catalogProgressCard).toHaveCount(0);
  await expect(dashboard.proMembershipCard).toHaveCount(0);
  await expect(page.getByTestId("dashboard-billing-alert")).toHaveCount(0);
  await captureAtlasState(page, stateId);
}

test.describe.configure({ mode: "serial" });
test.beforeAll(initializeFixture);
test.afterAll(restoreRealisticPersona);

test("Desktop setup guidance", async ({ page }) => {
  await captureSetup(page, desktop, "dashboard-home-desktop-setup");
});

test("Mobile setup guidance", async ({ page }) => {
  await captureSetup(page, mobile, "dashboard-home-mobile-setup");
});

test("Desktop membership upgrade", async ({ page }) => {
  await captureUpgrade(page, desktop, "dashboard-home-desktop-upgrade");
});

test("Mobile membership upgrade", async ({ page }) => {
  await captureUpgrade(page, mobile, "dashboard-home-mobile-upgrade");
});

test("Desktop billing attention", async ({ page }) => {
  await captureBilling(page, desktop, "dashboard-home-desktop-billing");
});

test("Mobile billing attention", async ({ page }) => {
  await captureBilling(page, mobile, "dashboard-home-mobile-billing");
});

test("Desktop active Pro", async ({ page }) => {
  await captureActivePro(page, desktop, "dashboard-home-desktop-active-pro");
});

test("Mobile active Pro", async ({ page }) => {
  await captureActivePro(page, mobile, "dashboard-home-mobile-active-pro");
});
