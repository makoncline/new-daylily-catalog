import { test, expect } from "../../e2e/test-setup";
import { type E2EPrismaClient, withTempE2EDb } from "../../src/lib/test-utils/e2e-db";
import { normalizeCultivarName } from "../../src/lib/utils/cultivar-utils";
import { seedAhsListing } from "./utils/ahs-listings";

const CULTIVAR_SEGMENT = "coffee-frenzy";
let topCatalogUserId = "";

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

async function seedCultivarReference(db: E2EPrismaClient, ahsId: string, name: string) {
  return db.cultivarReference.upsert({
    where: { ahsId },
    create: {
      id: `cr-ahs-${ahsId}`,
      ahsId,
      normalizedName: normalizeCultivarName(name),
    },
    update: {
      normalizedName: normalizeCultivarName(name),
    },
  });
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
  updatedAt,
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
  updatedAt?: Date;
}) {
  const listing = await db.listing.create({
    data: {
      id,
      userId,
      title,
      slug,
      price,
      cultivarReferenceId,
      updatedAt,
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

async function seedRelatedCultivar({
  db,
  id,
  name,
  year,
  color,
  bloomSeason,
  imageUrl,
  userId,
}: {
  db: E2EPrismaClient;
  id: string;
  name: string;
  year: string;
  color: string;
  bloomSeason: string;
  imageUrl: string;
  userId: string;
}) {
  const ahs = await db.ahsListing.create({
    data: {
      id,
      name,
      hybridizer: "Reed",
      year,
      color,
      bloomSeason,
      ahsImageUrl: imageUrl,
    },
  });

  const cultivarReference = await seedCultivarReference(db, ahs.id, name);

  await createCultivarListing({
    db,
    userId,
    id: `listing-${id}`,
    title: `${name} Seed Listing`,
    slug: `${normalizeCultivarName(name)}-seed-listing`,
    price: 20,
    cultivarReferenceId: cultivarReference.id,
    imageCount: 1,
  });
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
          ahsImageUrl: "/assets/catalog-blooms.webp",
          scapeHeight: "36 inches",
          bloomSize: "6 inches",
          bloomSeason: "Midseason",
          form: "Single",
          ploidy: "Tet",
          foliageType: "Dormant",
          bloomHabit: "Diurnal",
          budcount: "24",
          branches: "5",
          sculpting: "Ruffled",
          foliage: "Green",
          flower: "Cocoa brown with gold throat",
          fragrance: "Light",
          parentage: "(A x B)",
          color: "Coffee brown",
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
      topCatalogUserId = topCatalog.user.id;

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
          url: "/assets/hero-garden.webp",
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
        updatedAt: new Date("2026-01-11T00:00:00.000Z"),
      });

      await createCultivarListing({
        db,
        userId: topCatalog.user.id,
        id: "listing-top-display",
        title: "Coffee Frenzy Display Clump",
        slug: "coffee-frenzy-display-clump",
        price: null,
        cultivarReferenceId: ahs.cultivarReferenceId,
        imageCount: 1,
        updatedAt: new Date("2026-01-15T00:00:00.000Z"),
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
        updatedAt: new Date("2026-01-09T00:00:00.000Z"),
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
        updatedAt: new Date("2026-01-08T00:00:00.000Z"),
      });

      await createCultivarListing({
        db,
        userId: hobbyCatalog.user.id,
        id: "listing-hobby-sale",
        title: "Hobby Coffee Frenzy Sale",
        slug: "hobby-coffee-frenzy-sale",
        price: 18,
        cultivarReferenceId: ahs.cultivarReferenceId,
        imageCount: 5,
        updatedAt: new Date("2026-01-20T00:00:00.000Z"),
      });

      await seedRelatedCultivar({
        db,
        id: "ahs-isle-of-wight",
        name: "Isle of Wight",
        year: "2007",
        color: "Peach",
        bloomSeason: "Early",
        imageUrl: "/assets/hero-garden.webp",
        userId: topCatalog.user.id,
      });

      await seedRelatedCultivar({
        db,
        id: "ahs-goldenzelle",
        name: "Goldenzelle",
        year: "2002",
        color: "Apricot",
        bloomSeason: "Mid",
        imageUrl: "/assets/bouquet.png",
        userId: topCatalog.user.id,
      });
    });
  });

  test("conversion-first cultivar page renders and deep links correctly", async ({
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
    await expect(page.getByRole("navigation").getByText("Cultivars")).toBeVisible();

    await expect(page.getByText("Quick Specs")).toBeVisible();
    await expect(page.getByText("Scape Height")).toBeVisible();

    await expect(
      page.getByRole("heading", { level: 2, name: "Photos in Catalogs" }),
    ).toBeVisible();
    await expect(page.getByText(/add a photo/i)).toHaveCount(0);

    await expect(
      page.getByRole("heading", { level: 2, name: "Available in Catalogs" }),
    ).toBeVisible();

    const gardenOrder = await page
      .locator('[data-testid="cultivar-offer-garden-card"]')
      .evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute("data-garden-slug")),
      );

    expect(gardenOrder).toEqual(["beta-pro", "top-pro", "alpha-pro"]);
    expect(gardenOrder).not.toContain("hobby-grower");

    const topCard = page.locator(
      '[data-testid="cultivar-offer-garden-card"][data-garden-slug="top-pro"]',
    );

    await expect(topCard.getByRole("button", { name: /View 2 images/i })).toBeVisible();

    const topRows = topCard.locator('[data-testid="cultivar-offer-row"]');
    await expect(topRows).toHaveCount(2);
    await expect(topRows.nth(0)).toContainText("Coffee Frenzy Prime Fan");
    await expect(topRows.nth(1)).toContainText("Not for sale");

    await expect(topRows.nth(0).getByRole("link", { name: "View Details" })).toHaveAttribute(
      "href",
      "/top-pro?viewing=listing-top-prime",
    );
    await expect(topRows.nth(0).getByRole("link", { name: "Show Winners" })).toHaveAttribute(
      "href",
      "/top-pro?lists=list-top-show#listings",
    );

    await page.getByRole("button", { name: "For sale" }).click();
    await expect(page).toHaveURL(/offerForSale=1/);

    await page.getByRole("button", { name: "Has photo" }).click();
    await expect(page).toHaveURL(/offerHasPhoto=1/);

    await page.getByRole("combobox", { name: "Sort offers" }).click();
    await page.getByRole("option", { name: "Price: Low to High" }).click();
    await expect(page).toHaveURL(/offerSort=price-asc/);

    await page
      .locator('[data-testid="cultivar-offer-garden-card"][data-garden-slug="alpha-pro"]')
      .getByRole("link", { name: "View Catalog" })
      .click();
    await expect(page).toHaveURL(/\/alpha-pro(\?.*)?$/);

    await page.goto(`/cultivar/${CULTIVAR_SEGMENT}`);
    await expect(
      page.getByRole("heading", {
        level: 2,
        name: /Other cultivars from this hybridizer/i,
      }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /Isle of Wight/i })).toHaveAttribute(
      "href",
      "/cultivar/isle-of-wight",
    );

    await page.goto("/top-pro/listing-top-prime");
    await expect(page).toHaveURL(/\/top-pro\?viewing=listing-top-prime$/);

    await page.goto("/top-pro/coffee-frenzy-prime-fan");
    await expect(page).toHaveURL(/\/top-pro\?viewing=listing-top-prime$/);

    await page.goto(`/${topCatalogUserId}/listing-top-prime`);
    await expect(page).toHaveURL(/\/top-pro\?viewing=listing-top-prime$/);

    await page.goto(`/${topCatalogUserId}/coffee-frenzy-prime-fan`);
    await expect(page).toHaveURL(/\/top-pro\?viewing=listing-top-prime$/);

    await page.goto(
      `/${topCatalogUserId}?viewing=listing-top-prime&utm_source=e2e-test`,
    );
    await expect(page).toHaveURL(
      (url) =>
        url.pathname === "/top-pro" &&
        url.searchParams.get("viewing") === null &&
        url.searchParams.get("utm_source") === null,
    );
  });
});
