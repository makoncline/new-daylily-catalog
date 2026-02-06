import type { E2EPrismaClient } from "../../../src/lib/test-utils/e2e-db";
import { createAuthedUser } from "../../../src/lib/test-utils/e2e-users";
import { TABLE_CONFIG } from "../../../src/config/constants";

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
const DEFAULT_PAGE_SIZE = TABLE_CONFIG.PAGINATION.LISTS_PAGE_SIZE_DEFAULT;

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

  const expectedPageCountBeforeAdd = Math.ceil(beforeAddCount / DEFAULT_PAGE_SIZE);
  const totalListListingsAfterAdd = beforeAddCount + 1;
  const expectedPageCountAfterAdd = Math.ceil(
    totalListListingsAfterAdd / DEFAULT_PAGE_SIZE,
  );
  const expectedSecondPageRowsBeforeAdd = Math.min(
    DEFAULT_PAGE_SIZE,
    Math.max(beforeAddCount - DEFAULT_PAGE_SIZE, 0),
  );
  const expectedSecondPageRowsAfterAdd = Math.min(
    DEFAULT_PAGE_SIZE,
    Math.max(totalListListingsAfterAdd - DEFAULT_PAGE_SIZE, 0),
  );

  return {
    listId: list.id,
    totalListListingsBeforeAdd: beforeAddCount,
    totalListListingsAfterAdd,
    defaultPageSize: DEFAULT_PAGE_SIZE,
    expectedPageCountBeforeAdd,
    expectedPageCountAfterAdd,
    expectedSecondPageRowsBeforeAdd,
    expectedSecondPageRowsAfterAdd,
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
