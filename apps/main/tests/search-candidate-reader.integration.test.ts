// @vitest-environment node

import {
  mkdirSync,
  mkdtempSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { CREATE_TARGET_SCHEMA_SQL } from "../scripts/public-search-index-sql.mjs";

const mocks = vi.hoisted(() => ({
  sync: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/env", () => ({
  env: {},
  isLibsqlDatabaseUrl: () => false,
}));
vi.mock("@/server/db", () => ({ syncEmbeddedReplica: mocks.sync }));

import {
  searchCultivars,
  searchCultivarFacetValues,
} from "@/server/search/cultivar-search";
import { matchCultivarNames } from "@/server/search/cultivar-name-match";
import {
  ensurePublicSearchIndex,
  PublicSearchIndexUnavailableError,
} from "@/server/search/public-search-index";
import { ensurePublicParentageIndex } from "@/server/search/public-parentage-index";

const appRoot = process.cwd();
let directory: string;
let candidatePath: string;

function createIndex(file: string, name: string, schema = "13", ageDays = 0) {
  const db = new DatabaseSync(file);
  try {
    db.exec(CREATE_TARGET_SCHEMA_SQL);
    const insertMeta = db.prepare("INSERT INTO SearchIndexMeta VALUES (?, ?)");
    insertMeta.run("schemaVersion", schema);
    insertMeta.run(
      "builtAt",
      new Date(Date.now() - ageDays * 86400_000).toISOString(),
    );
    db.prepare(
      `INSERT INTO CultivarSearchIndex
      (cultivarReferenceId, normalizedName, displayName, displayNameSearch, hybridizer,
       hasImage, listingCount, forSaleListingCount, sourceUpdatedAt, parentage)
      VALUES (?, ?, ?, ?, ?, 0, 0, 0, ?, 'Unknown')`,
    ).run(
      name,
      name.toLowerCase(),
      name,
      name.toLowerCase(),
      name,
      "2026-09-04",
    );
    db.prepare(
      "INSERT INTO CultivarSearchFacetValue VALUES ('hybridizer', ?, ?, 1)",
    ).run(name, name.toLowerCase());
  } finally {
    db.close();
  }
}

beforeEach(() => {
  directory = mkdtempSync(path.join(tmpdir(), "candidate-reader-"));
  mkdirSync(path.join(directory, ".tmp/search"), { recursive: true });
  symlinkSync(path.join(appRoot, "scripts"), path.join(directory, "scripts"));
  vi.spyOn(process, "cwd").mockReturnValue(directory);
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("VERCEL", "");
  vi.stubEnv("RUNTIME_FEATURE_FLAGS_PATH", path.join(directory, "flags.json"));
  mocks.sync.mockReset();
  candidatePath = path.join(
    directory,
    ".tmp/search/public-search-candidate.sqlite",
  );
  createIndex(
    path.join(directory, ".tmp/search/cultivar-search.sqlite"),
    "Baseline",
  );
  createIndex(candidatePath, "Candidate");
  writeFileSync(
    path.join(directory, "flags.json"),
    JSON.stringify({ candidateSearchIndex: false }),
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  rmSync(directory, { recursive: true, force: true });
});

async function readNames() {
  const result = await searchCultivars({
    baseUrl: "https://example.test",
    includeParentageTrees: false,
    listingLimit: 0,
  });
  return result.map((row) => row.name);
}

it("reads the accepted artifact for search, facets, importer and parentage, and observes replacement without a flag", async () => {
  expect(await readNames()).toEqual(["Candidate"]);
  expect(
    await searchCultivarFacetValues({ facet: "hybridizer" }),
  ).toMatchObject([{ value: "Candidate" }]);
  expect(
    await matchCultivarNames({
      names: ["Candidate"],
      includeCandidates: false,
    }),
  ).toMatchObject([{ exactMatch: { cultivarReferenceId: "Candidate" } }]);
  await vi.waitFor(async () => {
    expect(await ensurePublicParentageIndex()).toMatchObject({
      sourcePath: candidatePath,
      status: "fresh",
    });
  });

  createIndex(`${candidatePath}.next`, "Replacement");
  renameSync(candidatePath, `${candidatePath}.previous`);
  renameSync(`${candidatePath}.next`, candidatePath);
  expect(await readNames()).toEqual(["Replacement"]);
  expect(mocks.sync).not.toHaveBeenCalled();
});

it("serves a stale artifact without a request-triggered rebuild", async () => {
  rmSync(candidatePath);
  createIndex(candidatePath, "Stale", "13", 3);
  expect(await ensurePublicSearchIndex()).toMatchObject({
    status: "stale",
    path: candidatePath,
  });
  expect(await readNames()).toEqual(["Stale"]);
  expect(mocks.sync).not.toHaveBeenCalled();
});

it("does not fall back or build when the selected candidate is absent or incompatible", async () => {
  rmSync(candidatePath);
  await expect(readNames()).rejects.toBeInstanceOf(
    PublicSearchIndexUnavailableError,
  );
  createIndex(candidatePath, "Incompatible", "12");
  await expect(readNames()).rejects.toBeInstanceOf(
    PublicSearchIndexUnavailableError,
  );
  expect(mocks.sync).not.toHaveBeenCalled();
});
