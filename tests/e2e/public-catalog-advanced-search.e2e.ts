import { test, expect } from "../../e2e/test-setup";
import {
  type E2EPrismaClient,
  withTempE2EDb,
} from "../../src/lib/test-utils/e2e-db";
import { normalizeCultivarName } from "../../src/lib/utils/cultivar-utils";
import { setStripeSubscriptionStatus } from "./utils/stripe";

const PROFILE_SLUG = "advanced-search-farm";

async function seedCultivarReference(
  db: E2EPrismaClient,
  ahsId: string,
  cultivarName: string,
) {
  return db.cultivarReference.upsert({
    where: { ahsId },
    create: {
      id: `cr-ahs-${ahsId}`,
      ahsId,
      normalizedName: normalizeCultivarName(cultivarName),
    },
    update: {
      normalizedName: normalizeCultivarName(cultivarName),
    },
  });
}

async function createListing(args: {
  db: E2EPrismaClient;
  id: string;
  userId: string;
  title: string;
  slug: string;
  price: number | null;
  cultivarReferenceId: string;
  listIds: string[];
  imageCount: number;
}) {
  const listing = await args.db.listing.create({
    data: {
      id: args.id,
      userId: args.userId,
      title: args.title,
      slug: args.slug,
      price: args.price,
      cultivarReferenceId: args.cultivarReferenceId,
      lists:
        args.listIds.length > 0
          ? {
              connect: args.listIds.map((id) => ({ id })),
            }
          : undefined,
    },
  });

  for (let imageIndex = 0; imageIndex < args.imageCount; imageIndex += 1) {
    await args.db.image.create({
      data: {
        listingId: listing.id,
        order: imageIndex,
        url: "/assets/bouquet.png",
      },
    });
  }

  return listing;
}

test.describe("public catalog advanced search @local", () => {
  test.beforeAll(async () => {
    await withTempE2EDb(async (db) => {
      const user = await db.user.create({
        data: {
          clerkUserId: "clerk-advanced-search",
          stripeCustomerId: "cus-advanced-search",
        },
      });
      await setStripeSubscriptionStatus({
        db,
        stripeCustomerId: "cus-advanced-search",
        status: "none",
      });

      const profile = await db.userProfile.create({
        data: {
          userId: user.id,
          slug: PROFILE_SLUG,
          title: "Advanced Search Farm",
          description: "Public profile for advanced search verification",
          location: "Picayune, MS",
        },
      });

      await db.image.create({
        data: {
          userProfileId: profile.id,
          order: 0,
          url: "/assets/catalog-blooms.webp",
        },
      });

      const featuredList = await db.list.create({
        data: {
          id: "list-featured",
          userId: user.id,
          title: "Featured Picks",
        },
      });

      const gardenList = await db.list.create({
        data: {
          id: "list-garden",
          userId: user.id,
          title: "Garden Collection",
        },
      });

      const alphaAhs = await db.ahsListing.create({
        data: {
          id: "ahs-alpha",
          name: "Alpha Rose Cultivar",
          hybridizer: "Reed",
          year: "2012",
          bloomSeason: "Midseason",
          ploidy: "Tet",
          scapeHeight: "36 inches",
          color: "Rose pink",
          parentage: "(A x B)",
        },
      });

      const betaAhs = await db.ahsListing.create({
        data: {
          id: "ahs-beta",
          name: "Beta Gold Cultivar",
          hybridizer: "Stone",
          year: "2001",
          bloomSeason: "Early",
          ploidy: "Dip",
          scapeHeight: "28 inches",
          color: "Gold",
          parentage: "(C x D)",
        },
      });

      const gammaAhs = await db.ahsListing.create({
        data: {
          id: "ahs-gamma",
          name: "Gamma Peach Cultivar",
          hybridizer: "Reed",
          year: "2018",
          bloomSeason: "Late",
          ploidy: "Tet",
          scapeHeight: "40 inches",
          color: "Peach",
          parentage: "(E x F)",
        },
      });

      const alphaReference = await seedCultivarReference(
        db,
        alphaAhs.id,
        alphaAhs.name ?? "Alpha",
      );
      const betaReference = await seedCultivarReference(
        db,
        betaAhs.id,
        betaAhs.name ?? "Beta",
      );
      const gammaReference = await seedCultivarReference(
        db,
        gammaAhs.id,
        gammaAhs.name ?? "Gamma",
      );

      await createListing({
        db,
        id: "listing-alpha",
        userId: user.id,
        title: "Alpha Rose Fan",
        slug: "alpha-rose-fan",
        price: 20,
        cultivarReferenceId: alphaReference.id,
        listIds: [featuredList.id],
        imageCount: 1,
      });

      await createListing({
        db,
        id: "listing-beta",
        userId: user.id,
        title: "Beta Gold Fan",
        slug: "beta-gold-fan",
        price: null,
        cultivarReferenceId: betaReference.id,
        listIds: [gardenList.id],
        imageCount: 0,
      });

      await createListing({
        db,
        id: "listing-gamma",
        userId: user.id,
        title: "Gamma Peach Fan",
        slug: "gamma-peach-fan",
        price: 18,
        cultivarReferenceId: gammaReference.id,
        listIds: [gardenList.id],
        imageCount: 1,
      });
    });
  });

  test("guest can filter with advanced mode and keep state across reload", async ({
    page,
  }) => {
    const expectUrlParam = async (key: string, expected: string | null) => {
      await expect(page).toHaveURL((url) => url.searchParams.get(key) === expected);
    };

    await page.goto(`/${PROFILE_SLUG}/search`);

    const advancedSwitch = page.getByRole("switch", { name: /advanced/i });
    await expect(advancedSwitch).toBeVisible();
    if (!(await advancedSwitch.isChecked())) {
      await advancedSwitch.click();
    }
    await expect(advancedSwitch).toBeChecked();
    await expectUrlParam("mode", "advanced");

    const searchInput = page.getByPlaceholder("Search listings...");
    await searchInput.fill("Alpha");
    await searchInput.press("Enter");

    await expectUrlParam("query", "Alpha");
    await expect(page.getByText("Alpha Rose Fan")).toBeVisible();
    await expect(page.getByText("Beta Gold Fan")).toHaveCount(0);
    await expect(page.getByText("Gamma Peach Fan")).toHaveCount(0);

    const summaryIsInViewport = await page
      .locator("#public-search-results-summary")
      .evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return rect.bottom > 0 && rect.top < window.innerHeight;
      });
    expect(summaryIsInViewport).toBe(true);

    await searchInput.fill("");
    await expectUrlParam("query", null);

    await page.getByRole("button", { name: /for sale/i }).click();
    await page.getByRole("button", { name: /has photo/i }).click();

    await page.getByRole("button", { name: /registration/i }).click();
    await page.getByTestId("advanced-filter-hybridizer").fill("Reed");
    await page.getByTestId("advanced-filter-year-thumb-min").press("ArrowRight");

    await page
      .getByTestId("advanced-filter-lists")
      .getByRole("button", { name: /lists/i })
      .click();
    await page.locator("[cmdk-item]").filter({ hasText: "Featured Picks" }).first().click();
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: /bloom traits/i }).click();
    await page
      .getByTestId("advanced-filter-bloom-season")
      .getByRole("button", { name: /bloom season/i })
      .click();
    await page.locator("[cmdk-item]").filter({ hasText: "Midseason" }).first().click();
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: /classification & details/i }).click();
    await page
      .getByTestId("advanced-filter-ploidy")
      .getByRole("button", { name: /ploidy/i })
      .click();
    await page.locator("[cmdk-item]").filter({ hasText: "Tet" }).first().click();
    await page.keyboard.press("Escape");

    await page.getByTestId("advanced-filter-color").fill("Rose");
    await page.getByTestId("advanced-filter-parentage").fill("A x B");

    await expect(page.getByText("Alpha Rose Fan")).toBeVisible();
    await expect(page.getByText("Beta Gold Fan")).toHaveCount(0);
    await expect(page.getByText("Gamma Peach Fan")).toHaveCount(0);

    await expectUrlParam("price", "true");
    await expectUrlParam("hasPhoto", "true");
    await expectUrlParam("hybridizer", "Reed");
    await expect(page).toHaveURL((url) => url.searchParams.get("year") !== null);
    await expectUrlParam("lists", "list-featured");
    await expectUrlParam("bloomSeason", "Midseason");
    await expectUrlParam("ploidy", "Tet");
    await expectUrlParam("color", "Rose");
    await expectUrlParam("parentage", "A x B");

    await page.reload();

    await expectUrlParam("mode", "advanced");
    await expect(page.getByRole("switch", { name: /advanced/i })).toBeChecked();
    await expect(page.getByText("Alpha Rose Fan")).toBeVisible();
    await expect(page.getByText("Beta Gold Fan")).toHaveCount(0);
    await expect(page.getByText("Gamma Peach Fan")).toHaveCount(0);
  });
});
