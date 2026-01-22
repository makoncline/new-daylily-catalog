import { test, expect } from "@playwright/test";
import type { PrismaClient } from "@prisma/client";
import { clerk } from "@clerk/testing/playwright";
import { withTempE2EDb } from "../../src/lib/test-utils/e2e-db";
import {
  TEST_USER,
  createAuthedUser,
} from "../../src/lib/test-utils/e2e-users";

const TOTAL_LISTINGS = 135;
const DEFAULT_SIZE = 100;

async function seedListings(db: PrismaClient, userId: string, count: number) {
  const batchSize = 50;
  for (let start = 0; start < count; start += batchSize) {
    const chunk = Array.from({
      length: Math.min(batchSize, count - start),
    }).map((_, offset) => {
      const index = start + offset + 1;
      return db.listing.create({
        data: {
          userId,
          title: `Seed Item ${index}`,
          slug: `seed-item-${index}`,
          description: `Generated listing ${index}`,
          price: index,
        },
      });
    });
    await db.$transaction(chunk);
  }
}

test("dashboard-two listings: happy path pagination flow", async ({ page }) => {
  await withTempE2EDb(async (db) => {
    const user = await createAuthedUser(db);
    await seedListings(db, user.id, TOTAL_LISTINGS);
  });

  await page.goto("/");
  await clerk.signIn({ page, emailAddress: TEST_USER.email });
  await page.goto("/dashboard-two/listings");

  const countEl = page.getByTestId("filtered-rows-count");
  const indicator = page.getByTestId("pager-page-indicator");
  const firstBtn = page.getByTestId("pager-first");
  const prevBtn = page.getByTestId("pager-prev");
  const nextBtn = page.getByTestId("pager-next");
  const lastBtn = page.getByTestId("pager-last");
  const perPageSelect = page.getByTestId("pager-per-page");
  const titleCells = page.locator("#data-table [data-column='title']");
  const filterBox = page.getByPlaceholder("Filter listings...");
  const resetBtn = page
    .getByRole("button", { name: /reset filters/i })
    .or(page.getByRole("button", { name: "Reset" }));

  await test.step("Initial load shows default pagination", async () => {
    await expect(indicator).toBeVisible();
    await expect(countEl).toHaveText(
      new RegExp(`^${TOTAL_LISTINGS}\\s*/\\s*${TOTAL_LISTINGS}$`),
    );
    await expect(firstBtn).toBeDisabled();
    await expect(prevBtn).toBeDisabled();
    await expect(nextBtn).toBeEnabled();
    await expect(lastBtn).toBeEnabled();
    await expectPage({ pageIndex: 1, pageSize: DEFAULT_SIZE });
    await expect(titleCells).toHaveCount(DEFAULT_SIZE);
  });

  await test.step("Navigate forward and backward at default size", async () => {
    await goTo(nextBtn, 2, DEFAULT_SIZE);
    await expect(nextBtn).toBeDisabled();
    await expect(lastBtn).toBeDisabled();
    await expect(titleCells).toHaveCount(TOTAL_LISTINGS - DEFAULT_SIZE);

    await goTo(prevBtn, 1, DEFAULT_SIZE);
    await expect(firstBtn).toBeDisabled();
    await expect(prevBtn).toBeDisabled();

    await goTo(lastBtn, totalPages(DEFAULT_SIZE), DEFAULT_SIZE);
    await expect(titleCells).toHaveCount(remaining(DEFAULT_SIZE));

    await goTo(firstBtn, 1, DEFAULT_SIZE);
    await expect(titleCells).toHaveCount(DEFAULT_SIZE);
  });

  await test.step("Change page sizes resets to first page", async () => {
    const fifty = 50;
    await setPageSize(fifty);
    await expectPage({ pageIndex: 1, pageSize: fifty });
    await expect(titleCells).toHaveCount(fifty);

    await goTo(lastBtn, totalPages(fifty), fifty);
    await expect(titleCells).toHaveCount(remaining(fifty));

    const twenty = 20;
    await setPageSize(twenty);
    await expectPage({ pageIndex: 1, pageSize: twenty });
    await expect(titleCells).toHaveCount(twenty);
  });

  await test.step("Persist pagination through reloads and deep links", async () => {
    const twenty = 20;

    await goTo(nextBtn, 2, twenty);
    await goTo(nextBtn, 3, twenty);
    await page.reload();
    await expectPage({ pageIndex: 3, pageSize: twenty });
    await expect(titleCells).toHaveCount(twenty);

    const deepLinkTarget = 4;
    await page.goto(
      `/dashboard-two/listings?page=${deepLinkTarget}&size=${twenty}`,
    );
    await expectPage({ pageIndex: deepLinkTarget, pageSize: twenty });
  });

  await test.step("Filters reset pagination and clamp out-of-range pages", async () => {
    const twenty = 20;

    await filterBox.fill("Seed Item 12");
    await expectPage({ pageIndex: 1, pageSize: twenty, totalPages: 1 });
    const filteredByFuzzy = await expectVisibleRowsMatchFiltered(twenty);
    expect(filteredByFuzzy).toBeGreaterThan(0);

    await resetBtn.click();
    await expectPage({ pageIndex: 1, pageSize: twenty });
    await expectVisibleRowsMatchFiltered(twenty);

    const outOfRangePage = 999;
    const targetSize = 50;
    await page.goto(
      `/dashboard-two/listings?page=${outOfRangePage}&size=${targetSize}`,
    );
    await expectPage({
      pageIndex: totalPages(targetSize),
      pageSize: targetSize,
    });

    await filterBox.fill("Seed Item 135");
    await expectPage({ pageIndex: 1, pageSize: targetSize, totalPages: 1 });
    const filteredExact = await expectVisibleRowsMatchFiltered(targetSize);
    expect(filteredExact).toBe(1);

    await resetBtn.click();
    await expectVisibleRowsMatchFiltered(targetSize);
  });

  async function expectPage({
    pageIndex,
    pageSize,
    totalPages: overrideTotal,
  }: {
    pageIndex: number;
    pageSize: number;
    totalPages?: number;
  }) {
    await expectUrl(pageIndex, pageSize);
    const expectedTotal = overrideTotal ?? totalPages(pageSize);
    await expectIndicator(pageIndex, expectedTotal);
  }

  async function expectUrl(pageIndex: number, pageSize: number) {
    await expect
      .poll(() => Number(new URL(page.url()).searchParams.get("page") ?? "1"))
      .toBe(pageIndex);

    if (pageSize === DEFAULT_SIZE) {
      await expect
        .poll(() => new URL(page.url()).searchParams.get("size"))
        .toBeNull();
    } else {
      await expect
        .poll(() => {
          const raw = new URL(page.url()).searchParams.get("size");
          return raw ? Number(raw) : null;
        })
        .toBe(pageSize);
    }
  }

  async function expectIndicator(pageIndex: number, total: number) {
    await expect
      .poll(async () => {
        const text = await indicator.textContent();
        const match = /Page\s+(\d+)\s+of\s+(\d+)/i.exec(text ?? "");
        return match
          ? { page: Number(match[1]), pages: Number(match[2]) }
          : null;
      })
      .toEqual({ page: pageIndex, pages: total });
  }

  async function goTo(
    button: ReturnType<typeof page.getByTestId>,
    pageIndex: number,
    pageSize: number,
  ) {
    await expect(button).toBeEnabled();
    await button.click();
    await expectPage({ pageIndex, pageSize });
  }

  async function setPageSize(size: number) {
    await perPageSelect.click();
    await page.getByRole("option", { name: String(size), exact: true }).click();
  }

  function totalPages(pageSize: number) {
    return Math.ceil(TOTAL_LISTINGS / pageSize);
  }

  function remaining(pageSize: number) {
    const leftover = TOTAL_LISTINGS % pageSize;
    return leftover === 0 ? pageSize : leftover;
  }

  async function readFilteredCount() {
    await expect(countEl).toBeVisible();
    const text = (await countEl.textContent()) ?? "";
    const match = /^(\d+)\s*\/\s*(\d+)/.exec(text.trim());
    if (!match) {
      throw new Error(`Unable to parse filtered count from "${text}"`);
    }
    return { filtered: Number(match[1]), total: Number(match[2]) };
  }

  async function expectVisibleRowsMatchFiltered(pageSize: number) {
    const { filtered } = await readFilteredCount();
    const expectedVisible = Math.min(filtered, pageSize);
    await expect(titleCells).toHaveCount(expectedVisible);
    return filtered;
  }
});
