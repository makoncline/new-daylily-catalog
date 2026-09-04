// @vitest-environment node

import { execFile, execFileSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";

const candidate = vi.hoisted(() => ({
  errors: [] as unknown[],
  env: {
    SEARCH_INDEX_CANDIDATE_TOKEN:
      "candidate-test-token-at-least-32-characters" as string | undefined,
    PUBLIC_SEARCH_INDEX_REFRESH_INTERVAL_SECONDS: "0",
  },
  sync: vi.fn(),
  ensureServing: vi.fn(() => {
    throw new Error("Candidate touched serving lifecycle");
  }),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/env", () => ({ env: candidate.env }));
vi.mock("@/server/db", () => ({ syncEmbeddedReplica: candidate.sync }));
vi.mock("@/lib/error-utils", () => ({
  reportError: ({ error }: { error: unknown }) => candidate.errors.push(error),
}));
vi.mock("@/lib/utils/getBaseUrl", () => ({
  getCanonicalBaseUrl: () => "https://example.test",
}));
vi.mock("@/server/search/public-search-index", () => ({
  ensurePublicSearchIndex: candidate.ensureServing,
  getPublicSearchIndexPath: () => {
    throw new Error("Candidate selected serving file");
  },
  isPublicSearchIndexUsable: () => true,
  PublicSearchIndexUnavailableError: class extends Error {},
}));

import { GET, POST } from "@/app/api/internal/search-candidate/route";

const execFileAsync = promisify(execFile);
const buildScriptPath = path.join(
  process.cwd(),
  "scripts/build-public-search-index.mjs",
);
const appRoot = process.cwd();

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  candidate.sync.mockReset();
  candidate.errors.length = 0;
  candidate.ensureServing.mockClear();
  candidate.env.SEARCH_INDEX_CANDIDATE_TOKEN =
    "candidate-test-token-at-least-32-characters";
  candidate.env.PUBLIC_SEARCH_INDEX_REFRESH_INTERVAL_SECONDS = "0";
});

function candidateRequest(method: string, query = "") {
  return new Request(`http://localhost/api/internal/search-candidate${query}`, {
    method,
    headers: {
      authorization: `Bearer ${candidate.env.SEARCH_INDEX_CANDIDATE_TOKEN}`,
    },
  });
}

async function runBuildScript(args: string[], env: Partial<NodeJS.ProcessEnv>) {
  try {
    await execFileAsync(process.execPath, [buildScriptPath, ...args], {
      env: {
        ...process.env,
        ...env,
      },
    });
  } catch (error) {
    return error;
  }

  throw new Error("Expected build script to fail.");
}

function createAuthoritativeFlowerShowSource(sourcePath: string) {
  const db = new DatabaseSync(sourcePath);

  db.exec(`
    CREATE TABLE "User" ("id" TEXT PRIMARY KEY, "stripeCustomerId" TEXT);
    CREATE TABLE "KeyValue" ("key" TEXT PRIMARY KEY, "value" TEXT);
    CREATE TABLE "Listing" (
      "id" TEXT PRIMARY KEY,
      "cultivarReferenceId" TEXT,
      "userId" TEXT,
      "status" TEXT,
      "price" REAL,
      "title" TEXT,
      "description" TEXT,
      "slug" TEXT,
      "updatedAt" TEXT
    );
    CREATE TABLE "ImageAsset" (
      "id" TEXT PRIMARY KEY,
      "cultivarReferenceId" TEXT,
      "kind" TEXT,
      "status" TEXT,
      "displayUrl" TEXT,
      "originalUrl" TEXT,
      "thumbUrl" TEXT,
      "blurUrl" TEXT,
      "order" INTEGER,
      "createdAt" TEXT
    );
    CREATE TABLE "CultivarReference" (
      "id" TEXT PRIMARY KEY,
      "v2AhsCultivarId" TEXT,
      "normalizedName" TEXT,
      "ahsId" TEXT,
      "updatedAt" TEXT
    );
    CREATE TABLE "V2AhsCultivar" (
      "id" TEXT PRIMARY KEY,
      "post_title" TEXT,
      "primary_hybridizer_name" TEXT,
      "hybridizer_code_legacy" TEXT,
      "introduction_date" TEXT,
      "scape_height_in" REAL,
      "bloom_size_in" REAL,
      "bud_count" INTEGER,
      "branches" INTEGER,
      "bloom_season_names" TEXT,
      "bloom_habit_names" TEXT,
      "flower_form_names" TEXT,
      "unusual_forms_names" TEXT,
      "flower_show" TEXT,
      "sculpted_type_names" TEXT,
      "seedling_number" TEXT,
      "ploidy_names" TEXT,
      "foliage_names" TEXT,
      "fragrance_names" TEXT,
      "color" TEXT,
      "parentage" TEXT,
      "rebloom" INTEGER,
      "double_percentage" REAL,
      "polymerous_percentage" REAL,
      "spider_ratio" REAL,
      "petal_length_in" REAL,
      "petal_width_in" REAL,
      "awards_json" TEXT,
      "image_url" TEXT,
      "updatedAt" TEXT
    );
    CREATE TABLE "AhsListing" ("id" TEXT PRIMARY KEY, "ahsImageUrl" TEXT);
    CREATE TABLE "Image" ("listingId" TEXT);
    CREATE TABLE "UserProfile" ("userId" TEXT, "slug" TEXT, "title" TEXT);

    INSERT INTO "CultivarReference" VALUES
      ('aerial-art', '102174', 'aerial art', NULL, '2026-07-16'),
      ('missing-flower-show', 'missing', 'missing flower show', NULL, '2026-07-16');

    INSERT INTO "V2AhsCultivar" (
      "id",
      "post_title",
      "flower_form_names",
      "unusual_forms_names",
      "flower_show",
      "sculpted_type_names",
      "updatedAt"
    ) VALUES
      (
        '102174',
        'Aerial Art',
        'Polymerous|Single|Unusual Form',
        'Crispate',
        'Unusual Form',
        'Cristate|Pleated',
        '2026-07-16'
      ),
      (
        'missing',
        'Missing Flower Show',
        'Spider|Single',
        NULL,
        NULL,
        NULL,
        '2026-07-16'
      );
  `);

  db.close();
}

function createFailingSourceCheckSqlite(binDirectory: string) {
  const sqlitePath = execFileSync("which", ["sqlite3"], {
    encoding: "utf8",
  }).trim();
  const wrapperPath = path.join(binDirectory, "sqlite3");

  writeFileSync(
    wrapperPath,
    [
      "#!/bin/sh",
      'if [ "$1" = "$FAIL_SOURCE_PATH" ] && [ "$2" = "PRAGMA quick_check;" ]; then',
      '  echo "database disk image is malformed" >&2',
      "  exit 11",
      "fi",
      `exec "${sqlitePath}" "$@"`,
      "",
    ].join("\n"),
  );
  chmodSync(wrapperPath, 0o755);
}

describe("candidate search index", () => {
  it("requires its own token and paused old refreshes before any build", async () => {
    for (const handler of [GET, POST]) {
      expect(
        (
          await handler(
            new Request("http://localhost/api/internal/search-candidate"),
          )
        ).status,
      ).toBe(401);
      candidate.env.SEARCH_INDEX_CANDIDATE_TOKEN = undefined;
      expect((await handler(candidateRequest("GET"))).status).toBe(404);
      candidate.env.SEARCH_INDEX_CANDIDATE_TOKEN =
        "candidate-test-token-at-least-32-characters";
    }
    vi.stubEnv("VERCEL", "1");
    expect((await POST(candidateRequest("POST"))).status).toBe(404);
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("NODE_ENV", "production");
    candidate.env.PUBLIC_SEARCH_INDEX_REFRESH_INTERVAL_SECONDS = "3600";
    expect((await POST(candidateRequest("POST"))).status).toBe(500);
    expect(candidate.sync).not.toHaveBeenCalled();
    expect(candidate.ensureServing).not.toHaveBeenCalled();
  });

  it("builds bounded replica pages, queries the candidate, and preserves both files on failure", async () => {
    const directory = mkdtempSync(path.join(tmpdir(), "search-candidate-"));
    const sourcePath = path.join(directory, "source.sqlite");
    const servingPath = path.join(directory, "serving.sqlite");
    const targetPath = path.join(
      directory,
      ".tmp/search/public-search-candidate.sqlite",
    );
    let source: PrismaClient | undefined;
    try {
      createAuthoritativeFlowerShowSource(sourcePath);
      const fixture = new DatabaseSync(sourcePath);
      fixture.exec(`
        WITH RECURSIVE n(value) AS (SELECT 1 UNION ALL SELECT value + 1 FROM n WHERE value < 1001)
        INSERT INTO V2AhsCultivar(id, post_title, updatedAt)
        SELECT 'page-' || printf('%04d', value), 'Page ' || value, '2026-07-16' FROM n;
        INSERT INTO CultivarReference(id, v2AhsCultivarId, normalizedName, updatedAt)
        SELECT id, id, lower(post_title), updatedAt FROM V2AhsCultivar WHERE id LIKE 'page-%';
        INSERT INTO "User" VALUES ('paid', 'customer'), ('unpaid', NULL);
        INSERT INTO KeyValue VALUES ('stripe:customer:customer', '{"status":"active"}');
        INSERT INTO Listing(id, cultivarReferenceId, userId, title, price, updatedAt, status)
        VALUES ('public', 'aerial-art', 'paid', 'Public Aerial Art', 25, '2026-07-16', NULL),
               ('hidden', 'aerial-art', 'paid', 'Hidden', 50, '2026-07-16', 'HIDDEN'),
               ('unpaid', 'aerial-art', 'unpaid', 'Unpaid', 20, '2026-07-16', NULL);
        UPDATE V2AhsCultivar SET awards_json = '[{"name":"Stout"}]' WHERE id = '102174';
      `);
      fixture.close();
      // The old builder runs only on this plain test fixture, never on a managed replica.
      await execFileAsync(process.execPath, [
        buildScriptPath,
        "--source",
        sourcePath,
        "--target",
        servingPath,
      ]);
      const originalServing = readFileSync(servingPath);
      symlinkSync(
        path.join(appRoot, "scripts"),
        path.join(directory, "scripts"),
      );
      vi.spyOn(process, "cwd").mockReturnValue(directory);
      source = new PrismaClient({
        adapter: new PrismaLibSql({ url: `file:${sourcePath}` }),
      });
      const querySource = source.$queryRawUnsafe.bind(source);
      const queries = vi
        .spyOn(source, "$queryRawUnsafe")
        .mockImplementation(querySource);
      candidate.sync.mockResolvedValue(source);

      expect((await GET(candidateRequest("GET"))).status).toBe(404);
      expect(existsSync(targetPath)).toBe(false);
      const [first, second] = await Promise.all([
        POST(candidateRequest("POST")),
        POST(candidateRequest("POST")),
      ]);
      expect(candidate.errors).toEqual([]);
      expect(first.status).toBe(200);
      expect(await first.json()).toMatchObject({
        cultivars: 1003,
        linkedListings: 1,
        quickCheck: "ok",
      });
      expect(second.status).toBe(200);
      expect(candidate.sync).toHaveBeenCalledOnce();
      expect(queries.mock.calls.length).toBeGreaterThan(3);
      expect(queries.mock.calls.every(([, , limit]) => limit === 1000)).toBe(
        true,
      );
      expect(readFileSync(servingPath)).toEqual(originalServing);
      expect(existsSync(targetPath + ".next")).toBe(false);
      const check = await GET(candidateRequest("GET", "?q=aerial"));
      expect(check.status).toBe(200);
      expect(await check.json()).toMatchObject({
        index: { exists: true, cultivars: 1003, linkedListings: 1 },
        results: [
          { name: "Aerial Art", traits: { flowerShow: "Unusual Form" } },
        ],
      });
      const awardCheck = await GET(candidateRequest("GET", "?award=stout"));
      expect(await awardCheck.json()).toMatchObject({
        results: [{ name: "Aerial Art" }],
      });
      expect(
        (await GET(candidateRequest("GET", "?path=/data/turso-replica.db")))
          .status,
      ).toBe(400);
      expect(candidate.sync).toHaveBeenCalledOnce();
      expect(candidate.ensureServing).not.toHaveBeenCalled();

      // Compare complete projected rows and facets, excluding insertion-order IDs.
      const oldIndex = new DatabaseSync(servingPath, { readOnly: true });
      const newIndex = new DatabaseSync(targetPath, { readOnly: true });
      try {
        for (const table of [
          "CultivarSearchIndex",
          "CultivarListingSearchIndex",
          "CultivarSearchFacetValue",
        ]) {
          const rows = (db: DatabaseSync) =>
            db
              .prepare(`SELECT * FROM ${table} ORDER BY 2`)
              .all()
              .map(({ id: _id, ...row }) => row);
          expect(rows(newIndex)).toEqual(rows(oldIndex));
        }
      } finally {
        oldIndex.close();
        newIndex.close();
      }

      const originalCandidate = readFileSync(targetPath);
      candidate.sync.mockRejectedValueOnce(new Error("sync failed"));
      expect((await POST(candidateRequest("POST"))).status).toBe(500);
      expect(readFileSync(targetPath)).toEqual(originalCandidate);
      queries.mockImplementation((sql, ...args: unknown[]) => {
        if (String(sql).includes("WITH listing_ids"))
          throw new Error("source stream failed");
        return querySource(sql, ...args);
      });
      expect((await POST(candidateRequest("POST"))).status).toBe(500);
      expect(readFileSync(targetPath)).toEqual(originalCandidate);
      expect(readFileSync(servingPath)).toEqual(originalServing);
      expect(existsSync(targetPath + ".next")).toBe(false);
      queries.mockImplementation(querySource);
      expect((await POST(candidateRequest("POST"))).status).toBe(200);
      expect(readFileSync(targetPath + ".previous")).toEqual(originalCandidate);
      expect(readFileSync(servingPath)).toEqual(originalServing);
      const goodCandidate = readFileSync(targetPath);
      await source.$executeRawUnsafe("DELETE FROM CultivarReference");
      expect((await POST(candidateRequest("POST"))).status).toBe(500);
      expect(readFileSync(targetPath)).toEqual(goodCandidate);
    } finally {
      await source?.$disconnect();
      rmSync(directory, { recursive: true, force: true });
    }
  }, 60_000);
});

describe("build-public-search-index source selection", () => {
  it("requires an explicit source in production", async () => {
    const error = await runBuildScript([], {
      NODE_ENV: "production",
      TURSO_EMBEDDED_REPLICA_URL: "file:/data/turso-replica.db",
    });

    expect(error).toMatchObject({
      stderr: expect.stringContaining(
        "Production search index builds require an explicit --source path",
      ),
    });
  });

  it("refuses to build from the live embedded replica path", async () => {
    const error = await runBuildScript(["--source", "/data/turso-replica.db"], {
      TURSO_EMBEDDED_REPLICA_URL: "file:/data/turso-replica.db",
    });

    expect(error).toMatchObject({
      stderr: expect.stringContaining(
        "Refusing to build search index from live Turso embedded replica",
      ),
    });
  });

  it("indexes authoritative flower_show without deriving a replacement", async () => {
    const tempDirectory = mkdtempSync(
      path.join(tmpdir(), "public-search-flower-show-"),
    );
    const sourcePath = path.join(tempDirectory, "source.sqlite");
    const targetPath = path.join(tempDirectory, "target.sqlite");

    try {
      createAuthoritativeFlowerShowSource(sourcePath);
      const { stdout } = await execFileAsync(
        process.execPath,
        [buildScriptPath, "--source", sourcePath, "--target", targetPath],
        { env: process.env },
      );
      expect(stdout).toContain("Source quick_check: ok");

      const targetDb = new DatabaseSync(targetPath, { readOnly: true });
      const rows = targetDb
        .prepare(
          `SELECT displayName, flowerShow, sculptedTypes
           FROM CultivarSearchIndex
           ORDER BY displayName`,
        )
        .all();
      expect(rows).toEqual([
        {
          displayName: "Aerial Art",
          flowerShow: "Unusual Form",
          sculptedTypes: "Cristate|Pleated",
        },
        {
          displayName: "Missing Flower Show",
          flowerShow: null,
          sculptedTypes: null,
        },
      ]);
      expect(
        targetDb
          .prepare(
            `SELECT value, count
             FROM CultivarSearchFacetValue
             WHERE facet = 'sculptedType'
             ORDER BY value`,
          )
          .all(),
      ).toEqual([
        { value: "Cristate", count: 1 },
        { value: "Pleated", count: 1 },
      ]);
      targetDb.close();
    } finally {
      rmSync(tempDirectory, { force: true, recursive: true });
    }
  });

  it("does not promote an index when the final source check fails", async () => {
    const tempDirectory = mkdtempSync(
      path.join(tmpdir(), "public-search-source-check-"),
    );
    const sourcePath = path.join(tempDirectory, "source.sqlite");
    const targetPath = path.join(tempDirectory, "target.sqlite");

    try {
      createAuthoritativeFlowerShowSource(sourcePath);
      const targetDb = new DatabaseSync(targetPath);
      targetDb.exec(
        "CREATE TABLE Marker (value TEXT); INSERT INTO Marker VALUES ('old');",
      );
      targetDb.close();
      createFailingSourceCheckSqlite(tempDirectory);

      const error = await runBuildScript(
        ["--source", sourcePath, "--target", targetPath],
        {
          FAIL_SOURCE_PATH: sourcePath,
          PATH: `${tempDirectory}:${process.env.PATH}`,
        },
      );

      expect(error).toMatchObject({
        stderr: expect.stringContaining(
          "Source replica post_build quick_check failed",
        ),
      });
      const preservedTarget = new DatabaseSync(targetPath, { readOnly: true });
      expect(preservedTarget.prepare("SELECT value FROM Marker").get()).toEqual(
        {
          value: "old",
        },
      );
      preservedTarget.close();
    } finally {
      rmSync(tempDirectory, { force: true, recursive: true });
    }
  });
});
