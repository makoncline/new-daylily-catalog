import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";

import {
  generateRealisticDataSnapshot,
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
      ('feature:use-v2', 'true');
  `);
  db.close();
}

describe("generateRealisticDataSnapshot", () => {
  test("resolves one output path for preparation and launch", () => {
    expect(
      resolveRealisticDataOutputPath({
        appRoot: "/app",
        configuredPath: "custom/snapshot.sqlite",
        cwd: "/workspace",
      }),
    ).toBe("/workspace/custom/snapshot.sqlite");
    expect(resolveRealisticDataOutputPath({ appRoot: "/app" })).toBe(
      "/app/local/realistic-data/realistic-data.sqlite",
    );
  });
  test("keeps realistic data while replacing every production identity binding", () => {
    const directory = mkdtempSync(
      path.join(tmpdir(), "realistic-data-snapshot-"),
    );
    const sourcePath = path.join(directory, "source.sqlite");
    const outputPath = path.join(directory, "output.sqlite");
    createSourceDatabase(sourcePath);
    const sourceBefore = readFileSync(sourcePath);

    const summary = generateRealisticDataSnapshot({
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
});
