import type { E2EPrismaClient } from "../../../src/lib/test-utils/e2e-db";
import { createAuthedUser } from "../../../src/lib/test-utils/e2e-users";

interface SeedListsPageInput {
  db: E2EPrismaClient;
}

interface SortExpectations {
  titleAscFirst: string;
  titleDescFirst: string;
  descriptionAscFirst: string;
  descriptionDescFirst: string;
  listingsAscFirst: string;
  listingsDescFirst: string;
  createdAscFirst: string;
  createdDescFirst: string;
  updatedAscFirst: string;
  updatedDescFirst: string;
}

export interface ListsPageSeedMeta {
  totalLists: number;
  defaultPageSize: number;
  expectedPageCount: number;
  expectedSecondPageRows: number;
  globalSearchToken: string;
  globalSearchTitle: string;
  sortToken: string;
  sortExpectations: SortExpectations;
  editTargetTitle: string;
  editTargetUpdatedTitle: string;
  editTargetUpdatedDescriptionToken: string;
  deleteTargetTitle: string;
}

const TOTAL_BULK_LISTS = 107;
const TOTAL_LISTS = 115;
const DEFAULT_PAGE_SIZE = 20;

function pad(value: number) {
  return String(value).padStart(3, "0");
}

export async function seedListsPageData({
  db,
}: SeedListsPageInput): Promise<ListsPageSeedMeta> {
  const user = await createAuthedUser(db);

  for (let i = 1; i <= TOTAL_BULK_LISTS; i++) {
    const number = pad(i);
    await db.list.create({
      data: {
        userId: user.id,
        title: `Bulk List ${number}`,
        description: `Generic seeded list ${number}`,
      },
    });
  }

  const listCountListing1 = await db.listing.create({
    data: {
      userId: user.id,
      title: "Count Fixture Listing 1",
      slug: "count-fixture-listing-1",
    },
  });
  const listCountListing2 = await db.listing.create({
    data: {
      userId: user.id,
      title: "Count Fixture Listing 2",
      slug: "count-fixture-listing-2",
    },
  });

  const sortToken = "token-sort-pack-lists";
  const sortAlphaTitle = "Sort Alpha token-sort-pack-lists";
  const sortBravoTitle = "Sort Bravo token-sort-pack-lists";
  const sortCharlieTitle = "Sort Charlie token-sort-pack-lists";

  await db.list.create({
    data: {
      userId: user.id,
      title: sortAlphaTitle,
      description: "Zulu description token-sort-pack-lists",
      createdAt: new Date("2024-01-10T00:00:00.000Z"),
      updatedAt: new Date("2024-03-10T00:00:00.000Z"),
      listings: {
        connect: [{ id: listCountListing1.id }, { id: listCountListing2.id }],
      },
    },
  });

  await db.list.create({
    data: {
      userId: user.id,
      title: sortBravoTitle,
      description: "Alpha description token-sort-pack-lists",
      createdAt: new Date("2024-02-10T00:00:00.000Z"),
      updatedAt: new Date("2024-01-10T00:00:00.000Z"),
    },
  });

  await db.list.create({
    data: {
      userId: user.id,
      title: sortCharlieTitle,
      description: "Mike description token-sort-pack-lists",
      createdAt: new Date("2024-03-10T00:00:00.000Z"),
      updatedAt: new Date("2024-02-10T00:00:00.000Z"),
      listings: {
        connect: [{ id: listCountListing1.id }],
      },
    },
  });

  const globalSearchToken = "token-global-lists";
  const globalSearchTitle = "Global Search Fixture token-global-lists";
  await db.list.create({
    data: {
      userId: user.id,
      title: globalSearchTitle,
      description: "Fixture used for lists global search checks",
    },
  });

  const editTargetTitle = "Edit Row Fixture";
  await db.list.create({
    data: {
      userId: user.id,
      title: editTargetTitle,
      description: "Fixture used for edit row action checks",
    },
  });

  const deleteTargetTitle = "Delete Row Fixture";
  await db.list.create({
    data: {
      userId: user.id,
      title: deleteTargetTitle,
      description: "Fixture used for delete row action checks",
    },
  });

  await db.list.create({
    data: {
      userId: user.id,
      title: "Undeletable Row Fixture",
      description: "Has linked listings and cannot be deleted",
      listings: {
        connect: [{ id: listCountListing2.id }],
      },
    },
  });

  await db.list.create({
    data: {
      userId: user.id,
      title: "Pagination Difference Fixture",
      description: "Ensures last page differs from first",
    },
  });

  const count = await db.list.count({
    where: { userId: user.id },
  });
  if (count !== TOTAL_LISTS) {
    throw new Error(`Expected ${TOTAL_LISTS} lists in seed, but found ${count}`);
  }

  return {
    totalLists: TOTAL_LISTS,
    defaultPageSize: DEFAULT_PAGE_SIZE,
    expectedPageCount: Math.ceil(TOTAL_LISTS / DEFAULT_PAGE_SIZE),
    expectedSecondPageRows: DEFAULT_PAGE_SIZE,
    globalSearchToken,
    globalSearchTitle,
    sortToken,
    sortExpectations: {
      titleAscFirst: sortAlphaTitle,
      titleDescFirst: sortCharlieTitle,
      descriptionAscFirst: sortBravoTitle,
      descriptionDescFirst: sortAlphaTitle,
      listingsAscFirst: sortBravoTitle,
      listingsDescFirst: sortAlphaTitle,
      createdAscFirst: sortAlphaTitle,
      createdDescFirst: sortCharlieTitle,
      updatedAscFirst: sortBravoTitle,
      updatedDescFirst: sortAlphaTitle,
    },
    editTargetTitle,
    editTargetUpdatedTitle: "Edited Row Fixture",
    editTargetUpdatedDescriptionToken: "token-edited-description-lists",
    deleteTargetTitle,
  };
}
