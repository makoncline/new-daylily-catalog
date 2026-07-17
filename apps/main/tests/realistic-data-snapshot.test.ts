import { DatabaseSync } from "node:sqlite";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";

import {
  assertRealisticDataSeedFresh,
  createDisposableRealisticDataSnapshot,
  generateRealisticDataSnapshot,
  realisticDataSchemaFingerprint,
  resolveRealisticDataOutputPath,
} from "../scripts/realistic-data-snapshot.mjs";

function createSourceDatabase(databasePath: string) {
  const db = new DatabaseSync(databasePath);
  db.exec(`
    CREATE TABLE User (
      id TEXT PRIMARY KEY,
      clerkUserId TEXT UNIQUE,
      stripeCustomerId TEXT UNIQUE
    );
    CREATE TABLE UserProfile (
      id TEXT PRIMARY KEY,
      userId TEXT UNIQUE NOT NULL,
      slug TEXT UNIQUE
    );
    CREATE TABLE Listing (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      title TEXT NOT NULL,
      privateNote TEXT
    );
    CREATE TABLE KeyValue (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    INSERT INTO User VALUES
      ('large-user', 'prod-clerk-large', 'prod-stripe-large'),
      ('medium-user', 'prod-clerk-medium', 'prod-stripe-medium'),
      ('unmapped-user', 'prod-clerk-unmapped', 'prod-stripe-unmapped');
    INSERT INTO UserProfile VALUES
      ('large-profile', 'large-user', 'large-catalog'),
      ('medium-profile', 'medium-user', 'medium-catalog'),
      ('unmapped-profile', 'unmapped-user', 'unmapped-catalog');
    INSERT INTO Listing VALUES
      ('large-listing', 'large-user', 'Large listing', 'Keep this private note'),
      ('medium-listing', 'medium-user', 'Medium listing', 'Keep this note too');
    INSERT INTO KeyValue (key, value) VALUES
      ('clerk:user:prod-clerk-large', '{"email":"real@example.com"}'),
      ('stripe:customer:prod-stripe-large', '{"status":"active"}'),
      ('stripe:customer:prod-stripe-unmapped', '{"status":"trialing"}'),
      ('public-inquiry:inherited-limit', '{}'),
      ('feature:use-v2', 'true');
  `);
  db.close();
}

describe("generateRealisticDataSnapshot", () => {
  test("creates an isolated disposable copy for local UI automation", async () => {
    const directory = mkdtempSync(
      path.join(tmpdir(), "realistic-data-disposable-"),
    );
    const sourcePath = path.join(directory, "source.sqlite");
    createSourceDatabase(sourcePath);

    const disposable = await createDisposableRealisticDataSnapshot({
      sourcePath,
    });
    const copy = new DatabaseSync(disposable.databasePath);
    copy
      .prepare("UPDATE Listing SET title = 'Atlas-only title' WHERE id = ?")
      .run("large-listing");
    copy.close();

    const source = new DatabaseSync(sourcePath, { readOnly: true });
    expect(
      source
        .prepare("SELECT title FROM Listing WHERE id = ?")
        .get("large-listing")?.title,
    ).toBe("Large listing");
    source.close();

    disposable.cleanup();
    expect(existsSync(disposable.databasePath)).toBe(false);
  });

  test("rejects a seed manifest created for an older schema", () => {
    const directory = mkdtempSync(path.join(tmpdir(), "realistic-data-schema-"));
    const schemaPath = path.join(directory, "schema.prisma");
    const manifestPath = path.join(directory, "personas.json");
    writeFileSync(schemaPath, "model User { id String @id }\n");
    writeFileSync(
      manifestPath,
      JSON.stringify({
        schemaFingerprint: realisticDataSchemaFingerprint(schemaPath),
      }),
    );

    expect(() =>
      assertRealisticDataSeedFresh({ manifestPath, schemaPath }),
    ).not.toThrow();

    writeFileSync(
      schemaPath,
      "model User { id String @id email String? }\n",
    );
    expect(() =>
      assertRealisticDataSeedFresh({ manifestPath, schemaPath }),
    ).toThrow("Run `pnpm db:seed:prepare`");
  });

  test("resolves one output path for preparation and launch", () => {
    expect(
      resolveRealisticDataOutputPath({
        appRoot: "/app",
        configuredPath: "local/realistic-data/custom.sqlite",
        cwd: "/app",
      }),
    ).toBe("/app/local/realistic-data/custom.sqlite");
    expect(resolveRealisticDataOutputPath({ appRoot: "/app" })).toBe(
      "/app/local/realistic-data/realistic-data.sqlite",
    );
    expect(() =>
      resolveRealisticDataOutputPath({
        appRoot: "/app",
        configuredPath: "/tmp/unsafe.sqlite",
      }),
    ).toThrow("must be stored under apps/main/local/realistic-data");
  });
  test("keeps realistic data while replacing every production identity binding", async () => {
    const directory = mkdtempSync(
      path.join(tmpdir(), "realistic-data-snapshot-"),
    );
    const sourcePath = path.join(directory, "source.sqlite");
    const outputPath = path.join(directory, "output.sqlite");
    createSourceDatabase(sourcePath);
    for (const suffix of ["-journal", "-wal", "-shm"]) {
      writeFileSync(`${outputPath}${suffix}`, "stale sqlite state");
    }
    const sourceBefore = readFileSync(sourcePath);

    const summary = await generateRealisticDataSnapshot({
      sourcePath,
      outputPath,
      personas: [
        {
          key: "large",
          sourceProfileSlug: "large-catalog",
          email: "prodlike+clerk_test_large@example.com",
          clerkUserId: "stage-clerk-large",
          stripeCustomerId: "cus_stage_large",
          subscriptionStatus: "active",
        },
        {
          key: "medium",
          sourceProfileSlug: "medium-catalog",
          email: "prodlike+clerk_test_medium@example.com",
          clerkUserId: "stage-clerk-medium",
          stripeCustomerId: "cus_stage_medium",
          subscriptionStatus: "active",
        },
      ],
    });

    expect(readFileSync(sourcePath)).toEqual(sourceBefore);
    for (const suffix of ["-journal", "-wal", "-shm"]) {
      expect(existsSync(`${outputPath}${suffix}`)).toBe(false);
    }
    expect(summary.personas).toEqual([
      expect.objectContaining({ key: "large", userId: "large-user" }),
      expect.objectContaining({ key: "medium", userId: "medium-user" }),
    ]);

    const output = new DatabaseSync(outputPath, { readOnly: true });
    expect(
      output
        .prepare("SELECT privateNote FROM Listing ORDER BY id")
        .all()
        .map((row) => row.privateNote),
    ).toEqual(["Keep this private note", "Keep this note too"]);
    expect(
      output
        .prepare(
          "SELECT id, clerkUserId, stripeCustomerId FROM User ORDER BY id",
        )
        .all(),
    ).toEqual([
      {
        id: "large-user",
        clerkUserId: "stage-clerk-large",
        stripeCustomerId: "cus_stage_large",
      },
      {
        id: "medium-user",
        clerkUserId: "stage-clerk-medium",
        stripeCustomerId: "cus_stage_medium",
      },
      {
        id: "unmapped-user",
        clerkUserId: null,
        stripeCustomerId: "realistic_local_unmapped-user",
      },
    ]);
    expect(
      output.prepare("SELECT key, value FROM KeyValue ORDER BY key").all(),
    ).toEqual([
      { key: "feature:use-v2", value: "true" },
      {
        key: "stripe:customer:cus_stage_large",
        value: '{"status":"active"}',
      },
      {
        key: "stripe:customer:cus_stage_medium",
        value: '{"status":"active"}',
      },
      {
        key: "stripe:customer:realistic_local_unmapped-user",
        value: '{"status":"trialing"}',
      },
    ]);
    output.close();
  });

  test("includes committed data that still resides in the source WAL", async () => {
    const directory = mkdtempSync(
      path.join(tmpdir(), "realistic-data-wal-snapshot-"),
    );
    const sourcePath = path.join(directory, "source.sqlite");
    const outputPath = path.join(directory, "output.sqlite");
    createSourceDatabase(sourcePath);
    const source = new DatabaseSync(sourcePath);
    source.exec("PRAGMA journal_mode = WAL;");
    source.exec(`
      INSERT INTO Listing VALUES
        ('wal-listing', 'large-user', 'Committed in WAL', 'WAL note');
    `);

    await generateRealisticDataSnapshot({
      sourcePath,
      outputPath,
      personas: [
        {
          key: "large",
          sourceProfileSlug: "large-catalog",
          email: "prodlike+clerk_test_large@example.com",
          clerkUserId: "stage-clerk-large",
          stripeCustomerId: "cus_stage_large",
          subscriptionStatus: "active",
        },
      ],
    });

    const output = new DatabaseSync(outputPath, { readOnly: true });
    expect(
      output
        .prepare("SELECT title FROM Listing WHERE id = 'wal-listing'")
        .get()?.title,
    ).toBe("Committed in WAL");
    output.close();
    source.close();
  });

});
