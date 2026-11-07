import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, test } from "vitest";
import { applyAdditivePreviewSchema } from "../scripts/apply-additive-preview-schema.mjs";

test("only applies additive column and index changes to the snapshot", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "preview-schema-"));
  const file = path.join(dir, "data.sqlite");
  let db = new DatabaseSync(file);
  db.exec(
    'CREATE TABLE "Listing" ("id" INTEGER PRIMARY KEY, "note" TEXT); INSERT INTO "Listing" VALUES (1, \'private\')',
  );
  db.close();
  try {
    applyAdditivePreviewSchema(
      file,
      '-- AlterTable\nALTER TABLE "Listing" ADD COLUMN "importKey" TEXT;\nCREATE INDEX "Listing_importKey_idx" ON "Listing"("importKey");',
    );
    expect(() =>
      applyAdditivePreviewSchema(
        file,
        'ALTER TABLE "Listing" ADD COLUMN "extra" TEXT; DROP TABLE "Listing";',
      ),
    ).toThrow(/unsupported/);
    db = new DatabaseSync(file);
    expect(db.prepare('SELECT note FROM "Listing"').get()?.note).toBe(
      "private",
    );
    expect(
      db
        .prepare('PRAGMA table_info("Listing")')
        .all()
        .map((row) => row.name),
    ).toEqual(["id", "note", "importKey"]);
    db.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
