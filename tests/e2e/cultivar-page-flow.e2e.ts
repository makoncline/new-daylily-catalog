import { test, expect } from "../../e2e/test-setup";
import { type E2EPrismaClient, withTempE2EDb } from "../../src/lib/test-utils/e2e-db";
import { seedAhsListing } from "./utils/ahs-listings";

const CULTIVAR_SEGMENT = "coffee-frenzy";

async function seedSubscription(
  db: E2EPrismaClient,
  stripeCustomerId: string,
  status: "active" | "none",
) {
  await db.keyValue.upsert({
    where: { key: `stripe:customer:${stripeCustomerId}` },
    update: { value: JSON.stringify({ status }) },
    create: {
      key: `stripe:customer:${stripeCustomerId}`,
      value: JSON.stringify({ status }),
    },
  });
}

async function createCatalogUser({
  db,
  clerkUserId,
  stripeCustomerId,
  slug,
  title,
  description,
  location,
  isPro,
}: {
  db: E2EPrismaClient;
  clerkUserId: string;
  stripeCustomerId: string;
  slug: string;
  title: string;
  description?: string;
  location?: string;
  isPro: boolean;
}) {
  const user = await db.user.create({
    data: {
      clerkUserId,
      stripeCustomerId,
    },
  });

  const profile = await db.userProfile.create({
    data: {
      userId: user.id,
      slug,
      title,
      description,
      location,
    },
  });

  await seedSubscription(db, stripeCustomerId, isPro ? "active" : "none");

  return { user, profile };
}

async function createCultivarListing({
  db,
  userId,
  id,
  title,
  slug,
  price,
  cultivarReferenceId,
  imageCount,
  listIds = [],
}: {
  db: E2EPrismaClient;
  userId: string;
  id: string;
  title: string;
  slug: string;
  price: number | null;
  cultivarReferenceId: string;
  imageCount: number;
  listIds?: string[];
}) {
  const listing = await db.listing.create({
    data: {
      id,
      userId,
      title,
      slug,
      price,
      cultivarReferenceId,
      lists:
        listIds.length > 0
          ? {
              connect: listIds.map((listId) => ({ id: listId })),
            }
          : undefined,
    },
  });

  for (let order = 0; order < imageCount; order += 1) {
    await db.image.create({
      data: {
        listingId: listing.id,
        order,
        url: "/assets/bouquet.png",
      },
    });
  }

  return listing;
}

async function createExtraListings({
  db,
  userId,
  count,
  prefix,
}: {
  db: E2EPrismaClient;
  userId: string;
  count: number;
  prefix: string;
}) {
  for (let index = 0; index < count; index += 1) {
    await db.listing.create({
      data: {
        id: `${prefix}-extra-${index}`,
        userId,
        title: `${prefix} Extra ${index + 1}`,
        slug: `${prefix}-extra-${index}`,
        price: 5,
      },
    });
  }
}

test.describe("cultivar guest flow @local", () => {
  test.beforeAll(async () => {
    await withTempE2EDb(async (db) => {
      const ahs = await seedAhsListing({
        db,
        id: "ahs-coffee-frenzy",
        name: "Coffee Frenzy",
        hybridizer: "Reed",
        year: "2012",
      });

      await db.ahsListing.update({
        where: { id: "ahs-coffee-frenzy" },
        data: {
          ahsImageUrl: "/assets/bouquet.png",
        },
      });

      const topCatalog = await createCatalogUser({
        db,
        clerkUserId: "clerk-top-pro",
        stripeCustomerId: "cus-top-pro",
        slug: "top-pro",
        title: "Top Pro Garden",
        description: "Top Pro Garden in Mississippi",
        location: "Picayune Mississippi",
        isPro: true,
      });

      const alphaCatalog = await createCatalogUser({
        db,
        clerkUserId: "clerk-alpha-pro",
        stripeCustomerId: "cus-alpha-pro",
        slug: "alpha-pro",
        title: "Alpha Pro Garden",
        description: "Alpha catalog description",
        location: "Alabama",
        isPro: true,
      });

      const betaCatalog = await createCatalogUser({
        db,
        clerkUserId: "clerk-beta-pro",
        stripeCustomerId: "cus-beta-pro",
        slug: "beta-pro",
        title: "Beta Pro Garden",
        description: "Beta catalog description",
        location: "Georgia",
        isPro: true,
      });

      const hobbyCatalog = await createCatalogUser({
        db,
        clerkUserId: "clerk-hobby",
        stripeCustomerId: "cus-hobby",
        slug: "hobby-grower",
        title: "Hobby Grower",
        isPro: false,
      });

      await db.image.create({
        data: {
          userProfileId: topCatalog.profile.id,
          order: 0,
          url: "/assets/bouquet.png",
        },
      });

      await db.image.create({
        data: {
          userProfileId: topCatalog.profile.id,
          order: 1,
          url: "/assets/bouquet.png",
        },
      });

      await db.image.create({
        data: {
          userProfileId: betaCatalog.profile.id,
          order: 0,
          url: "/assets/bouquet.png",
        },
      });

      const topList = await db.list.create({
        data: {
          id: "list-top-show",
          userId: topCatalog.user.id,
          title: "Show Winners",
        },
      });

      await createCultivarListing({
        db,
        userId: topCatalog.user.id,
        id: "listing-top-prime",
        title: "Coffee Frenzy Prime Fan",
        slug: "coffee-frenzy-prime-fan",
        price: 30,
        cultivarReferenceId: ahs.cultivarReferenceId,
        imageCount: 2,
        listIds: [topList.id],
      });

      await createCultivarListing({
        db,
        userId: topCatalog.user.id,
        id: "listing-top-starter",
        title: "Coffee Frenzy Starter Fan",
        slug: "coffee-frenzy-starter-fan",
        price: 20,
        cultivarReferenceId: ahs.cultivarReferenceId,
        imageCount: 1,
      });

      await createCultivarListing({
        db,
        userId: topCatalog.user.id,
        id: "listing-top-display",
        title: "Coffee Frenzy Display Clump",
        slug: "coffee-frenzy-display-clump",
        price: null,
        cultivarReferenceId: ahs.cultivarReferenceId,
        imageCount: 4,
      });

      await createCultivarListing({
        db,
        userId: alphaCatalog.user.id,
        id: "listing-alpha-sale",
        title: "Alpha Coffee Frenzy Sale",
        slug: "alpha-coffee-frenzy-sale",
        price: 28,
        cultivarReferenceId: ahs.cultivarReferenceId,
        imageCount: 2,
      });

      await createCultivarListing({
        db,
        userId: alphaCatalog.user.id,
        id: "listing-alpha-archive",
        title: "Alpha Coffee Frenzy Archive",
        slug: "alpha-coffee-frenzy-archive",
        price: null,
        cultivarReferenceId: ahs.cultivarReferenceId,
        imageCount: 2,
      });

      await createCultivarListing({
        db,
        userId: betaCatalog.user.id,
        id: "listing-beta-sale",
        title: "Beta Coffee Frenzy Sale",
        slug: "beta-coffee-frenzy-sale",
        price: 25,
        cultivarReferenceId: ahs.cultivarReferenceId,
        imageCount: 4,
      });

      await createCultivarListing({
        db,
        userId: hobbyCatalog.user.id,
        id: "listing-hobby-sale",
        title: "Hobby Coffee Frenzy Sale",
        slug: "hobby-coffee-frenzy-sale",
        price: 18,
        cultivarReferenceId: ahs.cultivarReferenceId,
        imageCount: 10,
      });

      await createExtraListings({
        db,
        userId: alphaCatalog.user.id,
        count: 6,
        prefix: "alpha",
      });

      await createExtraListings({
        db,
        userId: betaCatalog.user.id,
        count: 6,
        prefix: "beta",
      });
    });
  });

  test("catalog-centric cultivar cards render and link correctly", async ({
    page,
  }) => {
    await page.goto("/cultivar/coffee%20frenzy");
    await expect(page).toHaveURL(/\/cultivar\/coffee-frenzy$/);

    await page.goto(`/cultivar/${CULTIVAR_SEGMENT}`);

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /Coffee Frenzy/i,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("img", { name: /Coffee Frenzy AHS image/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        level: 2,
        name: "Catalogs Carrying This Cultivar",
      }),
    ).toBeVisible();

    const catalogOrder = await page
      .locator('[data-testid="cultivar-catalog-card"]')
      .evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute("data-catalog-slug")),
      );

    expect(catalogOrder).toEqual(["top-pro", "alpha-pro", "beta-pro"]);
    expect(catalogOrder).not.toContain("hobby-grower");

    const topCard = page.locator(
      '[data-testid="cultivar-catalog-card"][data-catalog-slug="top-pro"]',
    );
    const alphaCard = page.locator(
      '[data-testid="cultivar-catalog-card"][data-catalog-slug="alpha-pro"]',
    );
    const betaCard = page.locator(
      '[data-testid="cultivar-catalog-card"][data-catalog-slug="beta-pro"]',
    );

    await expect(topCard.getByRole("button", { name: /View 2 images/i })).toBeVisible();
    await expect(
      alphaCard.getByRole("button", { name: /View .*image/i }),
    ).toHaveCount(0);
    await expect(betaCard.getByRole("button", { name: /View 1 image/i })).toBeVisible();

    const topRows = topCard.locator('[data-testid="cultivar-catalog-listing-row"]');
    await expect(topRows).toHaveCount(3);
    await expect(topRows.nth(0)).toContainText("Coffee Frenzy Prime Fan");
    await expect(topRows.nth(1)).toContainText("Coffee Frenzy Starter Fan");
    await expect(topRows.nth(2)).toContainText("Coffee Frenzy Display Clump");
    await expect(topRows.nth(2)).toContainText("Not for sale");

    await expect(
      alphaCard.getByRole("link", { name: "View Catalog" }),
    ).toHaveAttribute("href", "/alpha-pro");

    await expect(topRows.nth(0).getByRole("link", { name: "View Listing" })).toHaveAttribute(
      "href",
      "/top-pro?viewing=listing-top-prime",
    );
    await expect(topRows.nth(0).getByRole("link", { name: "Show Winners" })).toHaveAttribute(
      "href",
      "/top-pro?lists=list-top-show#listings",
    );

    await alphaCard.getByRole("link", { name: "View Catalog" }).click();
    await expect(page).toHaveURL(/\/alpha-pro$/);

    await page.goto(`/cultivar/${CULTIVAR_SEGMENT}`);
    await page
      .locator('[data-testid="cultivar-catalog-card"][data-catalog-slug="top-pro"]')
      .locator('[data-testid="cultivar-catalog-listing-row"]')
      .first()
      .getByRole("link", { name: "View Listing" })
      .click();
    await expect(page).toHaveURL(/\/top-pro\?viewing=listing-top-prime$/);

    await page.goto(`/cultivar/${CULTIVAR_SEGMENT}`);
    await page
      .locator('[data-testid="cultivar-catalog-card"][data-catalog-slug="top-pro"]')
      .locator('[data-testid="cultivar-catalog-listing-row"]')
      .first()
      .getByRole("link", { name: "Show Winners" })
      .click();
    await expect(page).toHaveURL(
      /\/top-pro\?lists=(list-top-show|%22list-top-show%22)#listings$/,
    );
  });
});
