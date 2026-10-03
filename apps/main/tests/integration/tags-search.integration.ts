import fs from "node:fs/promises";
import path from "node:path";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

const purchaseNote = "2026 fall synthetic purchase";
const db = new PrismaClient({
  adapter: new PrismaLibSql(
    { url: process.env.DATABASE_URL! },
    { timestampFormat: "unixepoch-ms" },
  ),
});

test.beforeAll(async () => {
  await db.user.create({
    data: { id: "tags-other-owner", clerkUserId: "tags-other-clerk" },
  });
  await db.listing.createMany({
    data: [
      {
        id: "tags-fall",
        userId: "integration-user",
        title: "Synthetic Fall Bloom",
        slug: "synthetic-fall-bloom",
        privateNote: purchaseNote,
        price: 25,
        status: "PUBLISHED",
      },
      {
        id: "tags-spring",
        userId: "integration-user",
        title: "Synthetic Spring Bloom",
        slug: "synthetic-spring-bloom",
        privateNote: "2026 spring synthetic purchase",
        price: 15,
        status: "HIDDEN",
      },
      {
        id: "tags-no-note",
        userId: "integration-user",
        title: "Synthetic Unnoted Bloom",
        slug: "synthetic-unnoted-bloom",
        status: "PUBLISHED",
      },
      {
        id: "tags-other",
        userId: "tags-other-owner",
        title: "Other Owner Bloom",
        slug: "other-owner-bloom",
        privateNote: purchaseNote,
        status: "PUBLISHED",
      },
    ],
  });
  await db.list.create({
    data: {
      id: "tags-list",
      userId: "integration-user",
      title: "Synthetic Purchases",
      listings: { connect: [{ id: "tags-fall" }, { id: "tags-spring" }] },
    },
  });
});
test.afterAll(async () => {
  await db.list.deleteMany({ where: { id: "tags-list" } });
  await db.listing.deleteMany({ where: { id: { startsWith: "tags-" } } });
  await db.user.delete({ where: { id: "tags-other-owner" } });
  await db.$disconnect();
});

async function capture(page: Page, name: string) {
  const directory = process.env.TAGS_EVIDENCE_DIR;
  if (!directory) return;
  await fs.mkdir(directory, { recursive: true });
  await page.mouse.move(0, 0);
  await page.screenshot({
    path: path.join(directory, `${name}.png`),
    fullPage: true,
    animations: "disabled",
  });
}

for (const [device, viewport, touch] of [
  ["desktop", { width: 1440, height: 1000 }, false],
  ["mobile", { width: 390, height: 844 }, true],
  ["ipad", { width: 1024, height: 1366 }, true],
] as const) {
  test.describe(device, () => {
    test.use({ viewport, hasTouch: touch });
    test("Tags filters preserve selected exports and keep private text local", async ({
      page,
    }) => {
      test.setTimeout(120_000);
      const errors: string[] = [];
      const requests: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("request", (request) =>
        requests.push(`${request.url()} ${request.postData() ?? ""}`),
      );
      await page.goto("/dashboard/tags");
      const search = page.getByTestId("search-all-fields-input");
      await expect(search).toBeVisible();
      await capture(page, `${device}-basic`);
      const initialHistoryLength = await page.evaluate(() => history.length);
      await search.fill("Synthetic Spring Bloom");
      await search.press("Enter");
      const spring = page.getByRole("row").filter({
        has: page.getByText("Synthetic Spring Bloom", { exact: true }),
      });
      await spring
        .getByRole("checkbox", { name: "Select row", exact: true })
        .click();
      await expect(page.getByText("1 selected listing.")).toBeVisible();
      await search.clear();
      const mode = page.getByTestId("search-mode-switch");
      if (touch) await mode.tap();
      else await mode.press("Space");
      const note = page.locator(
        '[data-testid="advanced-filter-private-note"]:visible',
      );
      await expect(note).toBeVisible();
      await note.fill("2026 FALL");
      await expect(page.getByTestId("search-results-count")).toContainText(
        "1 /",
      );
      await expect(spring).toBeHidden();
      await expect(
        page.getByText(
          "1 selected listing is hidden by filters and will be included in your tags.",
        ),
      ).toBeVisible();
      await expect(
        page.getByText("Other Owner Bloom", { exact: true }),
      ).toHaveCount(0);
      await page
        .getByRole("checkbox", { name: "Select all", exact: true })
        .click();
      await expect(page.getByText("2 selected listings.")).toBeVisible();
      await capture(page, `${device}-private-note`);
      await expect(
        page.getByRole("main").locator('[data-slot="card"]'),
      ).toHaveCount(0);
      await expect(page.getByTestId("advanced-search-panel")).toHaveCSS(
        "border-top-width",
        "0px",
      );
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(viewport.width);

      // Basic mode retains advanced filters and makes the active chip removable.
      await mode.click();
      await expect(note).toBeHidden();
      await expect(page.getByTestId("search-results-count")).toContainText(
        "1 /",
      );
      await page
        .getByRole("button", { name: "Private Notes: 2026 FALL", exact: true })
        .click();
      await search.fill("synthetic purchase");
      await expect(page.getByTestId("search-results-count")).toContainText(
        "2 /",
      );
      await page.getByTestId("advanced-filter-lists").click();
      await page.getByRole("option", { name: /Synthetic Purchases/ }).click();
      await page.keyboard.press("Escape");
      await page.getByTestId("advanced-filter-for-sale").click();
      await expect(page.getByTestId("search-results-count")).toContainText(
        "2 /",
      );
      await page.getByRole("button", { name: "Reset", exact: true }).click();
      await expect(search).toHaveValue("");
      await expect(page.getByText("2 selected listings.")).toBeVisible();
      await search.fill("no-synthetic-match");
      await expect(
        page.getByText("No listings found", { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByText(
          "2 selected listings are hidden by filters and will be included in your tags.",
        ),
      ).toBeVisible();
      await capture(page, `${device}-no-results`);

      // Export uses the full selected set even when there are no visible rows.
      await page.getByRole("button", { name: "Make sheet" }).click();
      const sheet = page.getByRole("dialog", { name: "Sheet Creator" });
      await expect(sheet).toContainText(
        "2 labels selected, 1 copy of each, 2 total labels.",
      );
      await sheet.getByRole("button", { name: "Close", exact: true }).click();
      for (const [name, extension] of [
        ["CSV", ".csv"],
        ["Pages (.html)", ".html"],
        ["PDF (.pdf)", ".pdf"],
        ["Images (.zip)", ".zip"],
      ] as const) {
        await page.getByRole("button", { name: "Output options" }).click();
        const downloaded = page.waitForEvent("download");
        await page.getByRole("menuitem", { name, exact: true }).click();
        const file = await downloaded;
        expect(await file.failure()).toBeNull();
        expect(file.suggestedFilename()).toContain(extension);
        const content = await fs.readFile((await file.path())!);
        expect(content.length).toBeGreaterThan(0);
        if (extension === ".csv" || extension === ".html") {
          const text = content.toString("utf8");
          expect(text).toContain("Synthetic Fall Bloom");
          expect(text).toContain("Synthetic Spring Bloom");
          expect(text).not.toContain("Synthetic Unnoted Bloom");
          expect(text).not.toContain(purchaseNote);
          expect(text).not.toContain("no-synthetic-match");
        } else if (extension === ".pdf")
          expect(content.subarray(0, 5).toString()).toBe("%PDF-");
        else expect(content.subarray(0, 2).toString()).toBe("PK");
      }
      expect(new URL(page.url()).search).toBe("");
      expect(await page.evaluate(() => history.length)).toBe(
        initialHistoryLength,
      );
      expect(requests.join("\n")).not.toContain("2026 FALL");
      expect(requests.join("\n")).not.toContain("synthetic purchase");
      const stored = await page.evaluate(() =>
        JSON.stringify({ ...localStorage, ...sessionStorage }),
      );
      expect(stored).not.toContain("2026 FALL");
      expect(stored).not.toContain("no-synthetic-match");
      await page
        .getByRole("button", { name: "Remove all", exact: true })
        .click();
      await expect(
        page.getByRole("button", { name: "Make sheet" }),
      ).toBeDisabled();
      await page.keyboard.press("Alt+/");
      await expect(search).toBeHidden();
      await page.getByTestId("search-panel-expand").click();
      await expect(search).toBeVisible();
      await page.goto("/dashboard");
      await expect(
        page.getByText("Fetching your catalog...", { exact: true }),
      ).toBeHidden();
      await expect(
        page.getByRole("main").getByRole("heading", { level: 1 }),
      ).toBeVisible();
      await page.goBack();
      await expect(search).toHaveValue("");
      await expect(
        page.getByRole("button", { name: "Make sheet" }),
      ).toBeDisabled();
      expect(errors).toEqual([]);
    });
  });
}

test("Tags shows dashboard loading and a recoverable load error", async ({
  page,
}) => {
  let releaseLookup: (() => void) | undefined;
  const gate = new Promise<void>((resolve) => {
    releaseLookup = resolve;
  });
  await page.route("**/api/trpc/**", async (route) => {
    if (!route.request().url().includes("dashboardDb.user.getCurrentUserId"))
      return route.continue();
    await gate;
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify([
        {
          error: {
            json: {
              message: "Synthetic catalog unavailable",
              code: -32603,
              data: { code: "INTERNAL_SERVER_ERROR", httpStatus: 500 },
            },
          },
        },
      ]),
    });
  });
  await page.goto("/dashboard/tags");
  await expect(
    page.getByText("Fetching your catalog...", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("No listings", { exact: true })).toBeHidden();
  await capture(page, "loading");
  releaseLookup!();
  await expect(
    page.getByText("Unable to load dashboard data", { exact: true }),
  ).toBeVisible({ timeout: 15_000 });
  await expect(
    page.getByText("Please refresh the page.", { exact: true }),
  ).toBeVisible();
  await capture(page, "error");
  await page.unroute("**/api/trpc/**");
  await page.reload();
  await expect(page.getByTestId("search-all-fields-input")).toBeVisible();
});
