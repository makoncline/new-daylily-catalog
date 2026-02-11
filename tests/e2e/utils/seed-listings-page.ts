import type { E2EPrismaClient } from "../../../src/lib/test-utils/e2e-db";
import { createAuthedUser } from "../../../src/lib/test-utils/e2e-users";
import { seedAhsListing } from "./ahs-listings";

interface SeedListingsPageInput {
  db: E2EPrismaClient;
}

interface SortExpectations {
  titleAscFirst: string;
  titleDescFirst: string;
  priceAscFirst: string;
  priceDescFirst: string;
  createdAscFirst: string;
  createdDescFirst: string;
  hybridizerAscFirst: string;
  hybridizerDescFirst: string;
}

export interface ListingsPageSeedMeta {
  totalListings: number;
  defaultPageSize: number;
  expectedPageCount: number;
  expectedSecondPageRows: number;
  globalSearchToken: string;
  globalSearchTitle: string;
  listFilterLabel: string;
  listFilterId: string;
  listFilterCount: number;
  listFilterRepresentativeTitle: string;
  titleFilterToken: string;
  titleFilterTitle: string;
  descriptionFilterToken: string;
  descriptionFilterTitle: string;
  privateNoteFilterToken: string;
  privateNoteFilterTitle: string;
  summaryFilterToken: string;
  summaryFilterTitle: string;
  sortToken: string;
  sortExpectations: SortExpectations;
  deleteTargetTitle: string;
}

const TOTAL_BULK_LISTINGS = 107;
const TOTAL_LISTINGS = 115;
const DEFAULT_PAGE_SIZE = 100;

function pad(value: number) {
  return String(value).padStart(3, "0");
}

export async function seedListingsPageData({
  db,
}: SeedListingsPageInput): Promise<ListingsPageSeedMeta> {
  const user = await createAuthedUser(db);

  const listFilterA = await db.list.create({
    data: {
      userId: user.id,
      title: "List Filter A",
      description: "Primary filter list for listings table tests",
    },
  });

  const listFilterB = await db.list.create({
    data: {
      userId: user.id,
      title: "List Filter B",
      description: "Secondary filter list for listings table tests",
    },
  });

  for (let i = 1; i <= TOTAL_BULK_LISTINGS; i++) {
    const number = pad(i);
    await db.listing.create({
      data: {
        userId: user.id,
        title: `Bulk Listing ${number}`,
        slug: `bulk-listing-${number}`,
        description: `Generic seeded listing ${number}`,
        price: i,
      },
    });
  }

  const sortToken = "token-sort-pack";
  const sortAlphaTitle = "Sort Alpha token-sort-pack";
  const sortBravoTitle = "Sort Bravo token-sort-pack";
  const sortCharlieTitle = "Sort Charlie token-sort-pack";

  const sortAhsAlpha = await seedAhsListing({
    db,
    id: "ahs-sort-alpha",
    name: "Sort Alpha AHS",
    hybridizer: "Zeta",
    year: "2021",
  });
  const sortAhsBravo = await seedAhsListing({
    db,
    id: "ahs-sort-bravo",
    name: "Sort Bravo AHS",
    hybridizer: "Alpha",
    year: "2020",
  });
  const sortAhsCharlie = await seedAhsListing({
    db,
    id: "ahs-sort-charlie",
    name: "Sort Charlie AHS",
    hybridizer: "Mu",
    year: "2022",
  });

  await db.listing.create({
    data: {
      userId: user.id,
      title: sortAlphaTitle,
      slug: "sort-alpha-token-pack",
      price: 30,
      description: "Sort fixture alpha",
      cultivarReferenceId: sortAhsAlpha.cultivarReferenceId,
      createdAt: new Date("2024-01-10T00:00:00.000Z"),
      updatedAt: new Date("2024-01-10T00:00:00.000Z"),
      lists: {
        connect: [{ id: listFilterA.id }],
      },
    },
  });

  await db.listing.create({
    data: {
      userId: user.id,
      title: sortBravoTitle,
      slug: "sort-bravo-token-pack",
      price: 10,
      description: "Sort fixture bravo",
      cultivarReferenceId: sortAhsBravo.cultivarReferenceId,
      createdAt: new Date("2024-02-10T00:00:00.000Z"),
      updatedAt: new Date("2024-02-10T00:00:00.000Z"),
    },
  });

  await db.listing.create({
    data: {
      userId: user.id,
      title: sortCharlieTitle,
      slug: "sort-charlie-token-pack",
      price: 20,
      description: "Sort fixture charlie",
      cultivarReferenceId: sortAhsCharlie.cultivarReferenceId,
      createdAt: new Date("2024-03-10T00:00:00.000Z"),
      updatedAt: new Date("2024-03-10T00:00:00.000Z"),
    },
  });

  const globalSearchToken = "token-global-listings";
  const globalSearchTitle = "Global Search Fixture token-global-listings";
  await db.listing.create({
    data: {
      userId: user.id,
      title: globalSearchTitle,
      slug: "global-search-fixture",
      description: "Fixture used for global search checks",
      lists: {
        connect: [{ id: listFilterA.id }],
      },
    },
  });

  const descriptionFilterToken = "token-description-listings";
  const descriptionFilterTitle = "Description Filter Fixture";
  await db.listing.create({
    data: {
      userId: user.id,
      title: descriptionFilterTitle,
      slug: "description-filter-fixture",
      description: `Description includes ${descriptionFilterToken}`,
      lists: {
        connect: [{ id: listFilterA.id }],
      },
    },
  });

  const privateNoteFilterToken = "token-private-note-listings";
  const privateNoteFilterTitle = "Private Note Filter Fixture";
  await db.listing.create({
    data: {
      userId: user.id,
      title: privateNoteFilterTitle,
      slug: "private-note-filter-fixture",
      privateNote: `Private note includes ${privateNoteFilterToken}`,
      lists: {
        connect: [{ id: listFilterB.id }],
      },
    },
  });

  const summaryFilterToken = "token-summary-listings";
  const summaryFilterTitle = "Summary Filter Fixture";
  const summaryAhs = await seedAhsListing({
    db,
    id: "ahs-summary-fixture",
    name: `Summary Name ${summaryFilterToken}`,
    hybridizer: "Summary Breeder",
    year: "2019",
    color: "Orange",
    bloomSeason: "M",
  });
  await db.listing.create({
    data: {
      userId: user.id,
      title: summaryFilterTitle,
      slug: "summary-filter-fixture",
      cultivarReferenceId: summaryAhs.cultivarReferenceId,
    },
  });

  const deleteTargetTitle = "Delete Row Fixture";
  await db.listing.create({
    data: {
      userId: user.id,
      title: deleteTargetTitle,
      slug: "delete-row-fixture",
      description: "Fixture used for delete row action checks",
      lists: {
        connect: [{ id: listFilterB.id }],
      },
    },
  });

  const count = await db.listing.count({
    where: { userId: user.id },
  });
  if (count !== TOTAL_LISTINGS) {
    throw new Error(
      `Expected ${TOTAL_LISTINGS} listings in seed, but found ${count}`,
    );
  }

  return {
    totalListings: TOTAL_LISTINGS,
    defaultPageSize: DEFAULT_PAGE_SIZE,
    expectedPageCount: 2,
    expectedSecondPageRows: TOTAL_LISTINGS - DEFAULT_PAGE_SIZE,
    globalSearchToken,
    globalSearchTitle,
    listFilterLabel: listFilterA.title,
    listFilterId: listFilterA.id,
    listFilterCount: 3,
    listFilterRepresentativeTitle: globalSearchTitle,
    titleFilterToken: globalSearchToken,
    titleFilterTitle: globalSearchTitle,
    descriptionFilterToken,
    descriptionFilterTitle,
    privateNoteFilterToken,
    privateNoteFilterTitle,
    summaryFilterToken,
    summaryFilterTitle,
    sortToken,
    sortExpectations: {
      titleAscFirst: sortAlphaTitle,
      titleDescFirst: sortCharlieTitle,
      priceAscFirst: sortBravoTitle,
      priceDescFirst: sortAlphaTitle,
      createdAscFirst: sortAlphaTitle,
      createdDescFirst: sortCharlieTitle,
      hybridizerAscFirst: sortBravoTitle,
      hybridizerDescFirst: sortAlphaTitle,
    },
    deleteTargetTitle,
  };
}
