import type { E2EPrismaClient } from "../../../src/lib/test-utils/e2e-db";
import { createAuthedUser } from "../../../src/lib/test-utils/e2e-users";

interface SeedManageListPageInput {
  db: E2EPrismaClient;
}

interface SortExpectations {
  titleAscFirst: string;
  titleDescFirst: string;
  priceAscFirst: string;
  priceDescFirst: string;
}

export interface ManageListPageSeedMeta {
  listId: string;
  totalListListingsBeforeAdd: number;
  totalListListingsAfterAdd: number;
  defaultPageSize: number;
  expectedPageCountBeforeAdd: number;
  expectedPageCountAfterAdd: number;
  expectedSecondPageRowsBeforeAdd: number;
  expectedSecondPageRowsAfterAdd: number;
  addableListingTitle: string;
  addableListingToken: string;
  sortToken: string;
  sortExpectations: SortExpectations;
  titleFilterToken: string;
  updatedListTitle: string;
  updatedListDescription: string;
}

const TOTAL_LINKED_LISTINGS = 102;
const DEFAULT_PAGE_SIZE = 100;

function pad(value: number) {
  return String(value).padStart(3, "0");
}

export async function seedManageListPageData({
  db,
}: SeedManageListPageInput): Promise<ManageListPageSeedMeta> {
  const user = await createAuthedUser(db);

  const list = await db.list.create({
    data: {
      userId: user.id,
      title: "Manage List Fixture",
      description: "Fixture list for manage list page tests",
    },
  });

  for (let i = 1; i <= TOTAL_LINKED_LISTINGS - 3; i++) {
    const number = pad(i);
    await db.listing.create({
      data: {
        userId: user.id,
        title: `List Listing ${number}`,
        slug: `list-listing-${number}`,
        price: i,
        lists: {
          connect: [{ id: list.id }],
        },
      },
    });
  }

  const sortToken = "token-manage-sort";
  const sortAlphaTitle = "Sort Alpha token-manage-sort";
  const sortBravoTitle = "Sort Bravo token-manage-sort";
  const sortCharlieTitle = "Sort Charlie token-manage-sort";

  await db.listing.create({
    data: {
      userId: user.id,
      title: sortAlphaTitle,
      slug: "manage-sort-alpha",
      price: 30,
      createdAt: new Date("2024-01-10T00:00:00.000Z"),
      updatedAt: new Date("2024-01-10T00:00:00.000Z"),
      lists: {
        connect: [{ id: list.id }],
      },
    },
  });

  await db.listing.create({
    data: {
      userId: user.id,
      title: sortBravoTitle,
      slug: "manage-sort-bravo",
      price: 10,
      createdAt: new Date("2024-02-10T00:00:00.000Z"),
      updatedAt: new Date("2024-02-10T00:00:00.000Z"),
      lists: {
        connect: [{ id: list.id }],
      },
    },
  });

  await db.listing.create({
    data: {
      userId: user.id,
      title: sortCharlieTitle,
      slug: "manage-sort-charlie",
      price: 20,
      createdAt: new Date("2024-03-10T00:00:00.000Z"),
      updatedAt: new Date("2024-03-10T00:00:00.000Z"),
      lists: {
        connect: [{ id: list.id }],
      },
    },
  });

  const addableListingToken = "token-addable-listing";
  const addableListingTitle = "Addable Listing token-addable-listing";
  await db.listing.create({
    data: {
      userId: user.id,
      title: addableListingTitle,
      slug: "addable-listing-token",
      description: "Listing seeded outside list for add flow",
    },
  });

  const titleFilterToken = "token-title-filter-manage";
  await db.listing.create({
    data: {
      userId: user.id,
      title: `Title Filter Fixture ${titleFilterToken}`,
      slug: "title-filter-manage",
      lists: {
        connect: [{ id: list.id }],
      },
    },
  });

  const beforeAddCount = await db.listing.count({
    where: {
      userId: user.id,
      lists: {
        some: {
          id: list.id,
        },
      },
    },
  });

  return {
    listId: list.id,
    totalListListingsBeforeAdd: beforeAddCount,
    totalListListingsAfterAdd: beforeAddCount + 1,
    defaultPageSize: DEFAULT_PAGE_SIZE,
    expectedPageCountBeforeAdd: 2,
    expectedPageCountAfterAdd: 2,
    expectedSecondPageRowsBeforeAdd: beforeAddCount - DEFAULT_PAGE_SIZE,
    expectedSecondPageRowsAfterAdd: beforeAddCount + 1 - DEFAULT_PAGE_SIZE,
    addableListingTitle,
    addableListingToken,
    sortToken,
    sortExpectations: {
      titleAscFirst: sortAlphaTitle,
      titleDescFirst: sortCharlieTitle,
      priceAscFirst: sortBravoTitle,
      priceDescFirst: sortAlphaTitle,
    },
    titleFilterToken,
    updatedListTitle: "Manage List Fixture Updated",
    updatedListDescription: "Updated manage list description",
  };
}
