// @vitest-environment node

import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";

import {
  findLinkedCultivarIds,
  selectBacklogRows,
  selectCatchupRows,
} from "../scripts/image-processing/v2-ahs-image-review/queue-backlog-source-images";

const databases: DatabaseSync[] = [];

function createDatabase() {
  const database = new DatabaseSync(":memory:");
  databases.push(database);
  database.exec(`
    CREATE TABLE "CultivarReference" (
      "id" TEXT PRIMARY KEY,
      "ahsId" TEXT,
      "v2AhsCultivarId" TEXT,
      "normalizedName" TEXT
    );
    CREATE TABLE "V2AhsCultivar" (
      "id" TEXT PRIMARY KEY,
      "post_title" TEXT,
      "image_url" TEXT
    );
    CREATE TABLE "AhsListing" (
      "id" TEXT PRIMARY KEY,
      "name" TEXT,
      "ahsImageUrl" TEXT
    );
    CREATE TABLE "Listing" ("cultivarReferenceId" TEXT);
    CREATE TABLE "ImageAsset" (
      "cultivarReferenceId" TEXT,
      "kind" TEXT,
      "status" TEXT
    );
  `);
  return database;
}

afterEach(() => {
  for (const database of databases.splice(0)) database.close();
});

describe("generated cultivar image backlog selection", () => {
  it("identifies only claimable cultivars linked to listings", () => {
    const database = createDatabase();
    database.exec(`
      INSERT INTO "CultivarReference" VALUES
        ('cr-backlog', NULL, NULL, 'backlog'),
        ('cr-linked', NULL, NULL, 'linked');
      INSERT INTO "Listing" VALUES ('cr-linked');
    `);

    expect(
      findLinkedCultivarIds(database, ["cr-backlog", "cr-linked"]),
    ).toEqual(["cr-linked"]);
    expect(findLinkedCultivarIds(database, ["cr-backlog"])).toEqual([]);
  });

  it("takes the next alphabetical non-linked cultivars without ready assets or queue history", () => {
    const database = createDatabase();
    database.exec(`
      INSERT INTO "V2AhsCultivar" VALUES
        ('v2-alpha', 'Alpha Display', 'https://example.com/alpha.jpg'),
        ('v2-beta', 'Beta Display', 'https://example.com/beta.jpg'),
        ('v2-gamma', 'Gamma Display', 'https://example.com/gamma.jpg'),
        ('v2-zebra', 'Zebra Display', 'https://example.com/zebra.jpg');
      INSERT INTO "AhsListing" VALUES
        ('ahs-legacy', 'Legacy Display', 'https://example.com/legacy.jpg');
      INSERT INTO "CultivarReference" VALUES
        ('cr-alpha', NULL, 'v2-alpha', 'alpha'),
        ('cr-beta', NULL, 'v2-beta', 'beta'),
        ('cr-gamma', NULL, 'v2-gamma', 'gamma'),
        ('cr-history', 'ahs-legacy', NULL, 'aardvark'),
        ('cr-no-source', NULL, NULL, 'delta'),
        ('cr-zebra', NULL, 'v2-zebra', 'zebra');
      INSERT INTO "Listing" VALUES ('cr-beta');
      INSERT INTO "ImageAsset" VALUES ('cr-gamma', 'cultivar', 'ready');
    `);

    const rows = selectBacklogRows(database, new Set(["cr-history"]), 2);

    expect(rows).toEqual([
      {
        id: "cr-alpha",
        imageUrl: "https://example.com/alpha.jpg",
        postTitle: "Alpha Display",
        sourceKind: "v2",
      },
      {
        id: "cr-zebra",
        imageUrl: "https://example.com/zebra.jpg",
        postTitle: "Zebra Display",
        sourceKind: "v2",
      },
    ]);
  });

  it("selects every newly linked cultivar before backlog work", () => {
    const database = createDatabase();
    database.exec(`
      INSERT INTO "V2AhsCultivar" VALUES
        ('v2-new', 'New Linked', 'https://example.com/new.jpg'),
        ('v2-local', 'Already Local', 'https://example.com/local.jpg'),
        ('v2-ready', 'Already Ready', 'https://example.com/ready.jpg');
      INSERT INTO "CultivarReference" VALUES
        ('cr-new', NULL, 'v2-new', 'new linked'),
        ('cr-local', NULL, 'v2-local', 'already local'),
        ('cr-ready', NULL, 'v2-ready', 'already ready');
      INSERT INTO "Listing" VALUES
        ('cr-new'),
        ('cr-local'),
        ('cr-ready');
      INSERT INTO "ImageAsset" VALUES ('cr-ready', 'cultivar', 'ready');
    `);

    expect(selectCatchupRows(database, new Set(["cr-local"]))).toEqual([
      {
        id: "cr-new",
        imageUrl: "https://example.com/new.jpg",
        postTitle: "New Linked",
        sourceKind: "v2",
      },
    ]);
  });
});
