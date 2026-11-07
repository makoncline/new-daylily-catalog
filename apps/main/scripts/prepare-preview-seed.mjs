import { createClient } from "@libsql/client";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  linkSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { copyPreviewSeed } from "./copy-preview-seed.mjs";
import { realisticDataSchemaFingerprint } from "./realistic-data-snapshot.mjs";

const appRoot = path.resolve(import.meta.dirname, "..");
const seedDir = path.join(appRoot, "local/realistic-data");
const databasePath = path.join(seedDir, "realistic-data.sqlite");
const manifestPath = path.join(seedDir, "personas.json");
const searchPath = path.join(
  appRoot,
  ".tmp/search/public-search-candidate.sqlite",
);
const token = process.env.PREVIEW_SEED_TURSO_AUTH_TOKEN;
if (!token) throw new Error("Preview seed read credential is missing.");
if ([databasePath, manifestPath, searchPath].some(existsSync))
  throw new Error(
    "Seed or search artifact already exists; refusing to overwrite it.",
  );
mkdirSync(seedDir, { recursive: true, mode: 0o700 });
mkdirSync(path.dirname(searchPath), { recursive: true, mode: 0o700 });
const staging = mkdtempSync(path.join(seedDir, ".prepare-preview-"));
const stagedDb = path.join(staging, "seed.sqlite");
const stagedSearch = path.join(staging, "search.sqlite");
const stagedManifest = path.join(staging, "personas.json");
const published = [];
let source;
try {
  source = createClient({
    url: "libsql://seeded-daylily-catalog-makoncline.aws-us-east-1.turso.io",
    authToken: token,
    intMode: "bigint",
  });
  await copyPreviewSeed(source, stagedDb);
  // Neither child receives the preview token or 1Password bootstrap token.
  const env = Object.fromEntries(
    ["PATH", "HOME", "TMPDIR", "TEMP", "TMP"]
      .filter((key) => process.env[key] !== undefined)
      .map((key) => [key, process.env[key]]),
  );
  const schemaPath = path.join(appRoot, "prisma/schema.prisma");
  const diff = spawnSync(
    "pnpm",
    [
      "exec",
      "prisma",
      "migrate",
      "diff",
      "--from-config-datasource",
      "--to-schema",
      schemaPath,
      "--exit-code",
    ],
    {
      cwd: appRoot,
      env: { ...env, DATABASE_URL: `file:${stagedDb}` },
      encoding: "utf8",
    },
  );
  if (diff.status !== 0)
    throw new Error(
      "Preview schema differs from this checkout or could not be checked. No seed was installed.",
    );
  const search = spawnSync(
    process.execPath,
    [
      path.join(appRoot, "scripts/build-public-search-index.mjs"),
      "--source",
      stagedDb,
      "--target",
      stagedSearch,
    ],
    {
      cwd: appRoot,
      env: { ...env, NODE_ENV: "development" },
      stdio: "inherit",
    },
  );
  if (search.status !== 0)
    throw new Error(
      "Could not build the local search index. No seed was installed.",
    );
  chmodSync(stagedSearch, 0o600);
  writeFileSync(
    stagedManifest,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        databasePath,
        searchIndexPath: searchPath,
        schemaFingerprint: realisticDataSchemaFingerprint(schemaPath),
        source: "preview-snapshot",
      },
      null,
      2,
    ) + "\n",
    { mode: 0o600, flag: "wx" },
  );
  // Hard links fail if another process has created a destination. Publish the manifest last.
  for (const [from, to] of [
    [stagedDb, databasePath],
    [stagedSearch, searchPath],
    [stagedManifest, manifestPath],
  ]) {
    linkSync(from, to);
    const stat = statSync(to);
    published.push({ path: to, dev: stat.dev, ino: stat.ino });
  }
  console.log("Preview seed is ready as an isolated local SQLite database.");
} catch (error) {
  for (const file of published) {
    try {
      const stat = statSync(file.path);
      if (stat.dev === file.dev && stat.ino === file.ino) rmSync(file.path);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  throw error;
} finally {
  source?.close();
  rmSync(staging, { recursive: true, force: true });
}
