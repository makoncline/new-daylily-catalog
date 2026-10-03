import fs from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

const compareCultivars = process.env.TAGS_COMPARE_CULTIVAR_SEARCH === "1";
const candidatePath = path.resolve(
  ".tmp/search/public-search-candidate.sqlite",
);
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
  // Exercise the actual V2 cultivar read model, not rows with empty traits.
  for (const [season, traits] of [
    [
      "fall",
      {
        bloom_season_names: "Midseason",
        bloom_habit_names: "Diurnal",
        foliage_names: "Dormant",
        ploidy_names: "Tetraploid",
        fragrance_names: "Fragrant",
        flower_form_names: "Single",
        scape_height_in: 36,
        bloom_size_in: 6,
        bud_count: 24,
        branches: 4,
      },
    ],
    [
      "spring",
      {
        bloom_season_names: "Early",
        bloom_habit_names: "Nocturnal",
        foliage_names: "Evergreen",
        ploidy_names: "Diploid",
        fragrance_names: "Very Fragrant",
        flower_form_names: "Double",
        scape_height_in: 24,
        bloom_size_in: 4,
        bud_count: 16,
        branches: 2,
      },
    ],
  ] as const) {
    await db.v2AhsCultivar.create({
      data: {
        id: `tags-cultivar-${season}`,
        post_title: `Synthetic ${season} cultivar`,
        link_normalized_name: `synthetic ${season} cultivar`,
        introduction_date: "2026",
        primary_hybridizer_name: "Synthetic Garden",
        color: "Rose and gold",
        parentage: "Synthetic A x Synthetic B",
        ...traits,
      },
    });
    await db.cultivarReference.create({
      data: {
        id: `tags-reference-${season}`,
        v2AhsCultivarId: `tags-cultivar-${season}`,
        normalizedName: `synthetic ${season} cultivar`,
      },
    });
  }
  await db.listing.createMany({
    data: [
      {
        id: "tags-fall",
        cultivarReferenceId: "tags-reference-fall",
        userId: "integration-user",
        title: "Synthetic Fall Bloom",
        slug: "synthetic-fall-bloom",
        privateNote: purchaseNote,
        price: 25,
        status: "PUBLISHED",
      },
      {
        id: "tags-spring",
        cultivarReferenceId: "tags-reference-spring",
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
  if (compareCultivars) {
    // The optional four-page evidence run enables the existing runtime flag.
    // Build only from this disposable synthetic database in our own checkout.
    await promisify(execFile)(process.execPath, [
      "scripts/build-public-search-index.mjs",
      "--source",
      process.env.DATABASE_URL!,
      "--target",
      candidatePath,
    ]);
  }
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
  await db.cultivarReference.deleteMany({
    where: { id: { startsWith: "tags-reference-" } },
  });
  await db.v2AhsCultivar.deleteMany({
    where: { id: { startsWith: "tags-cultivar-" } },
  });
  await db.user.delete({ where: { id: "tags-other-owner" } });
  await db.$disconnect();
  if (compareCultivars) {
    for (const suffix of ["", ".next", ".previous"])
      await fs.rm(candidatePath + suffix, { force: true });
  }
});

async function capture(page: Page, name: string) {
  const directory = process.env.TAGS_EVIDENCE_DIR;
  if (!directory) return;
  await fs.mkdir(directory, { recursive: true });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.mouse.move(0, 0);
  await page.screenshot({
    path: path.join(directory, `${name}.png`),
    fullPage: true,
    animations: "disabled",
  });
  if (name.endsWith("-private-note")) {
    await page
      .getByRole("region", { name: "Choose listings", exact: true })
      .screenshot({
        path: path.join(directory, `${name}-filters.png`),
        animations: "disabled",
      });
  }
}

const traitControlIds = [
  "bloom-habit",
  "bloom-season",
  "scape-height",
  "bloom-size",
  "budcount",
  "branches",
  "form",
  "ploidy",
  "foliage-type",
  "fragrance",
] as const;

async function expectTraitControls(page: Page, accordion: boolean) {
  // Phone/iPad use the same responsive section accordions as Listings.
  if (accordion) {
    for (const name of ["Bloom Traits", "Classification & Details"]) {
      const section = page.getByRole("button", { name, exact: true });
      if (
        (await section.isVisible()) &&
        (await section.getAttribute("aria-expanded")) === "false"
      )
        await section.click();
    }
  }
  for (const id of traitControlIds) {
    await expect(
      page.locator(`[data-testid="advanced-filter-${id}"]:visible`),
      id,
    ).toBeVisible();
  }
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
      await expectTraitControls(page, touch);
      // Facet availability, result counts, and selection must agree.
      const habit = page.locator(
        '[data-testid="advanced-filter-bloom-habit"]:visible',
      );
      await habit.getByRole("button").click();
      const diurnal = page.getByRole("option", {
        name: "Diurnal",
        exact: true,
      });
      await expect(diurnal).toBeVisible();
      await expect(page.getByRole("option")).toHaveCount(2);
      await expect(
        page.getByRole("option", { name: "Nocturnal", exact: true }),
      ).toBeVisible();
      await diurnal.click();
      await page.keyboard.press("Escape");
      await expect(page.getByTestId("search-results-count")).toContainText(
        "1 /",
      );
      await expect(page.getByText("1 selected listing.")).toBeVisible();
      await habit.getByRole("button").click();
      await page.getByRole("option", { name: "Diurnal", exact: true }).click();
      await page.keyboard.press("Escape");
      const heightMin = page.locator(
        '[data-testid="advanced-filter-scape-height-input-min"]:visible',
      );
      await heightMin.fill("30");
      await heightMin.press("Enter");
      await expect(page.getByTestId("search-results-count")).toContainText(
        "1 /",
      );
      await expect(spring).toBeHidden();
      await expect(page.getByText("1 selected listing.")).toBeVisible();
      await heightMin.fill("24");
      await heightMin.press("Enter");
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
      await expectTraitControls(page, touch);
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

test("Tags renders the same populated cultivar controls as reference search pages", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  for (const [name, route] of [
    ["tags", "/dashboard/tags"],
    ["listings", "/dashboard/listings"],
    ["member", "/integration-seller/search?mode=advanced"],
    ...(compareCultivars
      ? [["cultivars", "/cultivars?advanced=true"] as const]
      : []),
  ] as const) {
    await page.goto(route);
    if (name === "tags" || name === "listings") {
      const mode = page.getByTestId("search-mode-switch");
      await expect(mode).toBeVisible();
      if ((await mode.getAttribute("data-state")) !== "checked")
        await mode.click();
    }
    if (name === "member") {
      for (const label of ["Bloom Traits", "Classification & Details"])
        await page.getByRole("button", { name: label, exact: true }).click();
    }
    await expectTraitControls(page, false);
    // Each reference uses the same range/facet primitives. Tags adds only the
    // owner's Private Notes text field to the Listings filter definitions.
    await expect(
      page.locator(
        '[data-testid="advanced-filter-scape-height-input-min"]:visible',
      ),
    ).toBeVisible();
    await expect(
      page
        .locator('[data-testid="advanced-filter-ploidy"]:visible')
        .getByRole("button"),
    ).toBeVisible();
    if (name === "tags" || name === "listings") {
      await expect(
        page.locator(
          '[data-testid="advanced-filter-scape-height-input-min"]:visible',
        ),
      ).toHaveValue("24");
      await expect(
        page.locator(
          '[data-testid="advanced-filter-scape-height-input-max"]:visible',
        ),
      ).toHaveValue("36");
    }
    if (name === "member" || name === "cultivars") {
      await expect(
        page.getByTestId("advanced-filter-private-note"),
      ).toHaveCount(0);
      await expect(page.getByText(purchaseNote, { exact: true })).toHaveCount(
        0,
      );
    }
    await capture(page, `reference-${name}-desktop`);
  }
});
