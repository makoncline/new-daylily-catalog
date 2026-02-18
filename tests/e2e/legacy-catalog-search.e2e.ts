import { expect, test } from "../../e2e/test-setup";
import {
  type E2EPrismaClient,
  withTempE2EDb,
} from "../../src/lib/test-utils/e2e-db";

const PROFILE_SLUG = "legacy-search-grower";

async function seedLegacySearchProfile(db: E2EPrismaClient) {
  const user = await db.user.create({
    data: {
      clerkUserId: "clerk-legacy-search-grower",
      stripeCustomerId: "cus-legacy-search-grower",
    },
  });

  await db.userProfile.create({
    data: {
      userId: user.id,
      slug: PROFILE_SLUG,
      title: "Legacy Search Grower",
      description: "Catalog profile used for legacy search route e2e coverage.",
      location: "Mississippi",
    },
  });

  const list = await db.list.create({
    data: {
      userId: user.id,
      title: "Featured",
      description: "Featured listings",
    },
  });

  for (let index = 1; index <= 18; index += 1) {
    const number = String(index).padStart(2, "0");
    await db.listing.create({
      data: {
        userId: user.id,
        title: `Legacy Listing ${number}`,
        slug: `legacy-listing-${number}`,
        description: `Description for listing ${number}`,
        price: index % 2 === 0 ? index : null,
        lists: {
          connect: [{ id: list.id }],
        },
      },
    });
  }
}

test.describe("legacy catalog search route @local", () => {
  test.beforeAll(async () => {
    await withTempE2EDb(async (db) => {
      await seedLegacySearchProfile(db);
    });
  });

  test("opens catalog search route from paginated profile page and persists url state", async ({
    page,
  }) => {
    await page.goto(`/${PROFILE_SLUG}?page=2`);
    await expect(page).toHaveURL(`/${PROFILE_SLUG}?page=2`);
    await expect(page.getByTestId("legacy-page-indicator")).toContainText(
      "Page 2 of",
    );

    const openSearchButton = page.getByRole("link", {
      name: "Open Catalog Search",
    });
    await expect(openSearchButton).toBeVisible();
    const searchHref = await openSearchButton.getAttribute("href");
    expect(searchHref).toBe(`/${PROFILE_SLUG}/catalog?page=2`);
    await page.goto(searchHref!);

    await expect(page).toHaveURL(`/${PROFILE_SLUG}/catalog?page=2`);

    const searchInput = page.getByPlaceholder("Search listings...");
    await expect(searchInput).toBeVisible();

    await searchInput.fill("Legacy Listing 05");
    await expect.poll(() => page.url()).toContain("query=Legacy+Listing+05");

    await page.reload();
    await expect(page).toHaveURL(/query=Legacy\+Listing\+05/);
    await expect(searchInput).toHaveValue("Legacy Listing 05");
  });
});
