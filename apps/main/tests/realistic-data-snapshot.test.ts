import { DatabaseSync } from "node:sqlite";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";

import {
  createDisposableRealisticDataSnapshot,
  generateRealisticDataSnapshot,
  resolveRealisticDataSourcePath,
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
      slug TEXT UNIQUE,
      title TEXT,
      description TEXT,
      content TEXT,
      location TEXT
    );
    CREATE TABLE Listing (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      title TEXT NOT NULL,
      status TEXT,
      description TEXT,
      privateNote TEXT
    );
    CREATE TABLE List (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      status TEXT,
      description TEXT
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
      ('unmapped-user', 'prod-clerk-unmapped', 'prod-stripe-unmapped'),
      ('free-user', 'prod-clerk-free', NULL);
    INSERT INTO UserProfile VALUES
      ('large-profile', 'large-user', 'large-catalog', 'Large Gardens', 'Email grower@realgarden.com or call 615-555-1234. Visit https://realgarden.com/shop.', NULL, 'Hillsboro, KS'),
      ('medium-profile', 'medium-user', 'medium-catalog', 'Medium Gardens', NULL, NULL, NULL),
      ('unmapped-profile', 'unmapped-user', 'unmapped-catalog', 'Unmapped Gardens', NULL, NULL, NULL),
      ('free-profile', 'free-user', 'free-catalog', 'Real Family Farm', 'Private bio', '{"blocks":[]}', 'Smalltown, KS');
    INSERT INTO Listing VALUES
      ('large-listing', 'large-user', 'Large listing', NULL, 'Public description', 'Keep this private note'),
      ('medium-listing', 'medium-user', 'Medium listing', 'HIDDEN', 'Hidden description', 'Keep this note too'),
      ('free-listing', 'free-user', 'Free listing', NULL, 'Unpublished description', NULL);
    INSERT INTO List VALUES
      ('large-list', 'large-user', NULL, 'See https://daylilycatalog.com/large-catalog'),
      ('free-list', 'free-user', NULL, 'Private list notes');
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

  test("uses the primary checkout snapshot as the realistic seed source", () => {
    const directory = mkdtempSync(
      path.join(tmpdir(), "realistic-data-source-"),
    );
    const primaryAppRoot = path.join(directory, "primary", "apps", "main");
    const sourcePath = path.join(
      primaryAppRoot,
      "prisma",
      "local-prod-copy-daylily-catalog.db",
    );
    mkdirSync(path.dirname(sourcePath), { recursive: true });
    writeFileSync(sourcePath, "primary snapshot");

    expect(resolveRealisticDataSourcePath({ primaryAppRoot })).toBe(sourcePath);
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
        .prepare(
          "SELECT id, clerkUserId, stripeCustomerId FROM User ORDER BY id",
        )
        .all(),
    ).toEqual([
      { id: "free-user", clerkUserId: null, stripeCustomerId: null },
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

  test("replaces private values with repeatable fake values and keeps public values", async () => {
    const directory = mkdtempSync(path.join(tmpdir(), "realistic-data-scrub-"));
    const sourcePath = path.join(directory, "source.sqlite");
    createSourceDatabase(sourcePath);
    const generate = async (name: string) => {
      const outputPath = path.join(directory, name);
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
      const db = new DatabaseSync(outputPath, { readOnly: true });
      const read = (sql: string) => db.prepare(sql).all();
      const result = {
        listings: read(
          "SELECT id, description, privateNote FROM Listing ORDER BY id",
        ),
        profiles: read(
          "SELECT id, slug, title, description, content, location FROM UserProfile ORDER BY id",
        ),
        lists: read("SELECT id, description FROM List ORDER BY id"),
      };
      db.close();
      return result;
    };

    const first = await generate("first.sqlite");
    expect(await generate("second.sqlite")).toEqual(first);

    const listing = (id: string) =>
      first.listings.find((row) => row.id === id)!;
    expect(listing("large-listing").description).toBe("Public description");
    expect(listing("medium-listing").description).not.toBe(
      "Hidden description",
    );
    expect(listing("free-listing").description).not.toBe(
      "Unpublished description",
    );
    for (const id of ["large-listing", "medium-listing"]) {
      expect(listing(id).privateNote).toEqual(expect.any(String));
      expect(listing(id).privateNote).not.toMatch(/^Keep this/);
    }
    expect(listing("free-listing").privateNote).toBeNull();

    const profile = (id: string) =>
      first.profiles.find((row) => row.id === id)!;
    expect(profile("large-profile")).toMatchObject({
      slug: "large-catalog",
      title: "Large Gardens",
    });
    expect(profile("large-profile").description).not.toMatch(
      /realgarden|615-555-1234/,
    );
    expect(profile("large-profile").description).toMatch(/@example\.com/);
    expect(profile("large-profile").location).not.toBe("Hillsboro, KS");
    expect(profile("free-profile").slug).not.toBe("free-catalog");
    expect(profile("free-profile").title).not.toBe("Real Family Farm");
    expect(profile("free-profile").description).not.toBe("Private bio");
    expect(
      JSON.parse(String(profile("free-profile").content)).blocks[0].type,
    ).toBe("paragraph");

    expect(first.lists).toEqual([
      {
        id: "free-list",
        description: expect.not.stringMatching(/Private list notes/),
      },
      {
        id: "large-list",
        description: "See https://daylilycatalog.com/large-catalog",
      },
    ]);
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
      INSERT INTO Listing (id, userId, title, privateNote) VALUES
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
      output.prepare("SELECT title FROM Listing WHERE id = 'wal-listing'").get()
        ?.title,
    ).toBe("Committed in WAL");
    output.close();
    source.close();
  });
});
