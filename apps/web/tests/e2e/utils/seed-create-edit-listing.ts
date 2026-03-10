import type { E2EPrismaClient } from "../../../src/lib/test-utils/e2e-db";
import { createAuthedUser } from "../../../src/lib/test-utils/e2e-users";
import { seedAhsListing } from "./ahs-listings";

interface SeedCreateEditListingInput {
  db: E2EPrismaClient;
}

export interface CreateEditListingSeedMeta {
  createAhsName: string;
  createAhsSearch: string;
  relinkAhsName: string;
  relinkAhsSearch: string;
  extraAhsName: string;
  extraAhsSearch: string;
  existingListId: string;
  existingListTitle: string;
  listAName: string;
  listBName: string;
  createCustomTitle: string;
  editedTitle: string;
  descriptionToken: string;
  privateNoteToken: string;
  pendingPrivateNoteToken: string;
}

export async function seedCreateEditListingData({
  db,
}: SeedCreateEditListingInput): Promise<CreateEditListingSeedMeta> {
  const user = await createAuthedUser(db);

  const existingList = await db.list.create({
    data: {
      userId: user.id,
      title: "Existing Seed List",
      description: "Pre-seeded list for create/edit listing tests",
    },
  });

  const createAhsName = "AHS Create Bloom 1001";
  const relinkAhsName = "AHS Relink Bloom 2002";
  const extraAhsName = "AHS Spare Bloom 3003";

  await seedAhsListing({
    db,
    id: "ahs-create-flow-1001",
    name: createAhsName,
    hybridizer: "CreateHybridizer",
    year: "2011",
    color: "Yellow",
  });

  await seedAhsListing({
    db,
    id: "ahs-relink-flow-2002",
    name: relinkAhsName,
    hybridizer: "RelinkHybridizer",
    year: "2018",
    color: "Purple",
  });

  await seedAhsListing({
    db,
    id: "ahs-extra-flow-3003",
    name: extraAhsName,
    hybridizer: "SpareHybridizer",
    year: "2020",
    color: "Orange",
  });

  return {
    createAhsName,
    createAhsSearch: "AHS Create",
    relinkAhsName,
    relinkAhsSearch: "AHS Relink",
    extraAhsName,
    extraAhsSearch: "AHS Spare",
    existingListId: existingList.id,
    existingListTitle: existingList.title,
    listAName: "Flow List A",
    listBName: "Flow List B",
    createCustomTitle: "Create Flow Custom Listing token-create-flow",
    editedTitle: "Edit Flow Title token-edit-title",
    descriptionToken: "token-edit-description",
    privateNoteToken: "token-edit-private-note",
    pendingPrivateNoteToken: "token-pending-close-save",
  };
}
