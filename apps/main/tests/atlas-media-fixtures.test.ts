// @vitest-environment node
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, expect, test } from "vitest";
import {
  ATLAS_MEDIA_IMAGE_URLS,
  ATLAS_MEDIA_POPULATED_TITLE,
  ATLAS_MEDIA_EMPTY_TITLE,
  createAtlasMediaSnapshot,
} from "../scripts/atlas-media-fixtures.mjs";

const appRoot = path.resolve(import.meta.dirname, "..");
const directories: string[] = [];
afterEach(() =>
  directories
    .splice(0)
    .forEach((directory) =>
      rmSync(directory, { recursive: true, force: true }),
    ),
);

function createSource(profileImageCount: number, listingImageCount: number) {
  const directory = mkdtempSync(path.join(tmpdir(), "atlas-media-test-"));
  directories.push(directory);
  const sourcePath = path.join(directory, "source.sqlite");
  const db = new DatabaseSync(sourcePath);
  const migrations = path.join(appRoot, "prisma/migrations");
  for (const name of readdirSync(migrations).sort()) {
    const migration = path.join(migrations, name, "migration.sql");
    if (existsSync(migration)) db.exec(readFileSync(migration, "utf8"));
  }
  db.exec(`
    PRAGMA foreign_keys = ON;
    INSERT INTO User (id, updatedAt) VALUES ('owner', 1), ('other', 1);
    INSERT INTO UserProfile (id, userId, title, slug, content, updatedAt)
      VALUES ('profile', 'owner', 'Realistic Garden', 'rollingoaksdaylilies', 'Keep this story', 1),
             ('other-profile', 'other', 'Other Garden', 'other-garden', 'Other story', 1);
    INSERT INTO Listing (id, userId, title, slug, privateNote, updatedAt)
      VALUES ('source-listing', 'owner', '18-33', '18-33', 'Keep this note', 1);
    INSERT INTO Image (id, url, userProfileId, updatedAt)
      VALUES ('other-image', '/assets/catalog-blooms.webp', 'other-profile', 1);
    INSERT INTO ImageAsset (id, kind, userProfileId, updatedAt)
      VALUES ('other-asset', 'profile', 'other-profile', 1),
             ('source-profile-asset', 'profile', 'profile', 1);
  `);
  const insert = db.prepare(
    "INSERT INTO Image (id, url, listingId, userProfileId, updatedAt) VALUES (?, ?, ?, ?, 1)",
  );
  for (let index = 0; index < profileImageCount; index++)
    insert.run(`source-profile-${index}`, "/source-photo.jpg", null, "profile");
  for (let index = 0; index < listingImageCount; index++)
    insert.run(
      `source-listing-${index}`,
      "/source-photo.jpg",
      "source-listing",
      null,
    );
  db.close();
  return sourcePath;
}

test.each([
  [5, 1],
  [1, 4],
])(
  "owns media states with source counts profile=%i listing=%i",
  async (profileCount, listingCount) => {
    const sourcePath = createSource(profileCount, listingCount);
    const before = readFileSync(sourcePath);
    const snapshot = await createAtlasMediaSnapshot({
      sourcePath,
      flowIds: ["listing-media", "profile-management"],
    });
    try {
      const db = new DatabaseSync(snapshot.databasePath, { readOnly: true });
      try {
        expect(
          db
            .prepare(
              "SELECT title, COUNT(Image.id) AS images FROM Listing LEFT JOIN Image ON Image.listingId = Listing.id GROUP BY Listing.id ORDER BY Listing.id",
            )
            .all(),
        ).toEqual([
          { title: ATLAS_MEDIA_EMPTY_TITLE, images: 0 },
          { title: ATLAS_MEDIA_POPULATED_TITLE, images: 9 },
          { title: "18-33", images: listingCount },
        ]);
        expect(
          db
            .prepare(
              'SELECT url, "order" FROM Image WHERE userProfileId = ? ORDER BY "order"',
            )
            .all("profile"),
        ).toEqual(
          ATLAS_MEDIA_IMAGE_URLS.slice(0, 5).map((url, order) => ({
            url,
            order,
          })),
        );
        expect(
          db
            .prepare(
              'SELECT url, "order" FROM Image WHERE listingId = ? ORDER BY "order"',
            )
            .all("atlas-media-populated"),
        ).toEqual(ATLAS_MEDIA_IMAGE_URLS.map((url, order) => ({ url, order })));
        expect(
          db
            .prepare("SELECT content FROM UserProfile WHERE id = 'profile'")
            .get()?.content,
        ).toBe("Keep this story");
        expect(
          db
            .prepare(
              "SELECT privateNote FROM Listing WHERE id = 'source-listing'",
            )
            .get()?.privateNote,
        ).toBe("Keep this note");
        expect(
          db.prepare("SELECT id FROM ImageAsset ORDER BY id").all(),
        ).toEqual([{ id: "other-asset" }]);
        expect(
          db
            .prepare(
              "SELECT id FROM Image WHERE userProfileId = 'other-profile'",
            )
            .all(),
        ).toEqual([{ id: "other-image" }]);
        expect(db.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
        for (const url of ATLAS_MEDIA_IMAGE_URLS)
          expect(existsSync(path.join(appRoot, "public", url))).toBe(true);
      } finally {
        db.close();
      }
      expect(readFileSync(sourcePath)).toEqual(before);
    } finally {
      snapshot.cleanup();
    }
    expect(existsSync(snapshot.databasePath)).toBe(false);
  },
);

test.each(["listing-media", "profile-management"])(
  "changes only the requested %s fixture",
  async (flowId) => {
    const sourcePath = createSource(2, 3);
    const snapshot = await createAtlasMediaSnapshot({
      sourcePath,
      flowIds: [flowId],
    });
    const db = new DatabaseSync(snapshot.databasePath, { readOnly: true });
    try {
      expect(
        db.prepare("SELECT COUNT(*) AS count FROM Listing").get()?.count,
      ).toBe(flowId === "listing-media" ? 3 : 1);
      expect(
        db
          .prepare(
            "SELECT COUNT(*) AS count FROM Image WHERE userProfileId = 'profile'",
          )
          .get()?.count,
      ).toBe(flowId === "listing-media" ? 2 : 5);
      expect(
        db
          .prepare(
            "SELECT COUNT(*) AS count FROM Image WHERE listingId = 'source-listing'",
          )
          .get()?.count,
      ).toBe(3);
    } finally {
      db.close();
      snapshot.cleanup();
    }
  },
);

test("refuses attach and explicit database media runs before changing files or contacting a server", () => {
  const sourcePath = createSource(2, 3);
  const before = readFileSync(sourcePath);
  const output = path.join(path.dirname(sourcePath), "output");
  writeFileSync(output, "Keep existing output");
  for (const flowId of ["listing-media", "profile-management", "all"]) {
    for (const setting of ["BASE_URL", "DATABASE_URL", "ATLAS_DATABASE_URL"]) {
      const result = spawnSync(
        process.execPath,
        [
          path.join(appRoot, "scripts/run-atlas-flow.mjs"),
          flowId,
          `--output=${output}`,
        ],
        {
          cwd: appRoot,
          encoding: "utf8",
          env: {
            ...process.env,
            BASE_URL: "",
            DATABASE_URL: "",
            ATLAS_DATABASE_URL: "",
            [setting]:
              setting === "BASE_URL"
                ? "http://127.0.0.1:1"
                : `file:${sourcePath}`,
          },
        },
      );
      expect(result.status).toBe(1);
      expect(result.stderr).toContain(
        "Atlas media fixtures require a managed disposable database",
      );
      expect(readFileSync(output, "utf8")).toBe("Keep existing output");
      expect(readFileSync(sourcePath)).toEqual(before);
    }
  }
}, 30000);
