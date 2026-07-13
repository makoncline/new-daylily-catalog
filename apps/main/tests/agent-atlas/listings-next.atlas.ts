import { captureCheckpoint, expect, test } from "./atlas-test";

test.setTimeout(180_000);

const hermetic = process.env.HERMETIC_MODE === "1";
const representative = hermetic
  ? {
      query: "Daylily 05",
      editListingId: "hermetic-listing-pro-primary-5",
      imageListingId: "hermetic-listing-pro-primary-1",
      listId: "hermetic-list-pro-primary-featured",
      listName: "Featured Flowers",
    }
  : {
      query: "Rolling Oaks",
      editListingId: "3506",
      imageListingId: "4259",
      listId: "5",
      listName: "General Listing",
    };

const states = [
  {
    name: "listings-next-default",
    query: "",
    description: "Default listings management page.",
  },
  {
    name: "listings-next-query-filter",
    query: `query=${encodeURIComponent(representative.query)}`,
    description: "Listings filtered by a shareable text query.",
  },
  {
    name: "listings-next-search-collapsed",
    query: "search=collapsed",
    description: "Listings with search controls collapsed.",
  },
  {
    name: "listings-next-advanced-filters",
    query: "advanced=1",
    description: "Expanded advanced catalog filters.",
  },
  {
    name: "listings-next-for-sale-filter",
    query: "price=true",
    description: "Only listings currently offered for sale.",
  },
  {
    name: "listings-next-has-photo-filter",
    query: "hasPhoto=true",
    description: "Only listings with at least one photo.",
  },
  {
    name: "listings-next-list-filter",
    query: `lists=${representative.listId}`,
    description: `Listings belonging to the ${representative.listName} list.`,
  },
  {
    name: "listings-next-title-sort",
    query: "sort=title.desc",
    description: "Listings sorted by title descending.",
  },
  {
    name: "listings-next-pagination",
    query: "page=2&size=20",
    description: "Second page using a shareable page size.",
  },
  {
    name: "listings-next-edit-dialog",
    query: `editing=${representative.editListingId}`,
    description: "A specific listing open in the existing edit dialog.",
  },
  {
    name: "listings-next-edit-images",
    query: `editing=${representative.imageListingId}&section=images`,
    description: "A specific listing editor positioned at image management.",
  },
  {
    name: "listings-next-create-dialog",
    query: "creating=1",
    description: "The empty Create Listing dialog.",
  },
  {
    name: "listings-next-empty-results",
    query: "query=no-such-listing",
    description: "The no-results state for an unmatched query.",
  },
] as const;

test("listings URL state matrix", async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name !== "rolling-oaks",
    "One representative pro catalog covers the listings state matrix.",
  );

  for (const state of states) {
    const route = `/dashboard/listings-next${state.query ? `?${state.query}` : ""}`;
    await page.goto(route);
    await expect(page.locator("h1", { hasText: "Listings" })).toBeVisible({
      timeout: 30_000,
    });

    if (state.query.includes("creating=1")) {
      await expect(
        page.getByRole("heading", { name: "Create New Listing" }),
      ).toBeVisible();
    } else if (state.query.includes("editing=")) {
      await expect(
        page.getByRole("heading", { name: "Edit Listing" }),
      ).toBeVisible({ timeout: 30_000 });
      if (state.query.includes("section=images")) {
        await expect(
          page.locator('[data-listing-editor-section="images"]'),
        ).toBeVisible();
      }
    } else {
      await expect(page.getByTestId("listing-table")).toBeVisible({
        timeout: 30_000,
      });
    }

    if (state.query.includes("advanced=1")) {
      await expect(
        page.getByText("Bloom Traits", { exact: true }),
      ).toBeVisible();
    }
    if (state.query.includes("search=collapsed")) {
      await expect(page.getByPlaceholder(/search listings/i)).toHaveCount(0);
    }
    if (state.query.includes("no-such-listing")) {
      await expect(page.getByText("No listings found")).toBeVisible();
    }

    await captureCheckpoint(page, testInfo, state.name, state.description);
  }
});
