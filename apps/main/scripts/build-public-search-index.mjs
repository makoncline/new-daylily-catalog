import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(SCRIPT_DIR, "..");
const DEFAULT_LOCAL_SOURCE = path.join(
  APP_ROOT,
  "prisma/local-prod-copy-daylily-catalog.db",
);
const DEFAULT_LOCAL_TARGET = path.join(
  APP_ROOT,
  ".tmp/search/cultivar-search.sqlite",
);
const DEFAULT_PRODUCTION_REPLICA_SOURCE = "/data/daylilycatalog-replica.sqlite";
const DEFAULT_PRODUCTION_TARGET = "/data/search/public-search.sqlite";

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = new Map();

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (!arg.startsWith("--")) {
      throw new Error(`Unexpected argument: ${arg}`);
    }

    const key = arg.slice(2);
    const value = args[index + 1];

    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }

    parsed.set(key, value);
    index += 1;
  }

  return {
    source: parsed.get("source") ?? getDefaultSource(),
    target: parsed.get("target") ?? getDefaultTarget(),
  };
}

function getDefaultSource() {
  const embeddedReplicaUrl = process.env.TURSO_EMBEDDED_REPLICA_URL;
  if (embeddedReplicaUrl?.startsWith("file:")) {
    return embeddedReplicaUrl;
  }

  return process.env.NODE_ENV === "production"
    ? DEFAULT_PRODUCTION_REPLICA_SOURCE
    : DEFAULT_LOCAL_SOURCE;
}

function getDefaultTarget() {
  return process.env.NODE_ENV === "production"
    ? DEFAULT_PRODUCTION_TARGET
    : DEFAULT_LOCAL_TARGET;
}

function normalizeLocalPath(input) {
  if (input.includes("://") && !input.startsWith("file:")) {
    throw new Error(
      `Refusing remote database URL: ${input}. Search index builds must use local files.`,
    );
  }

  const withoutScheme = input.startsWith("file:") ? input.slice(5) : input;
  if (withoutScheme.length === 0) {
    throw new Error("Database path cannot be empty.");
  }

  return path.resolve(APP_ROOT, withoutScheme);
}

function quoteSqlString(value) {
  return `'${value.replaceAll("'", "''")}'`;
}

function assertSafePaths(sourcePath, targetPath) {
  if (!existsSync(sourcePath)) {
    throw new Error(`Source database does not exist: ${sourcePath}`);
  }

  if (sourcePath === targetPath) {
    throw new Error("Source and target database paths must be different.");
  }

  if (
    process.env.NODE_ENV === "production" &&
    !targetPath.startsWith("/data/search/")
  ) {
    throw new Error(
      `Production target must be under /data/search. Received: ${targetPath}`,
    );
  }
}

function removeSqliteFiles(dbPath) {
  for (const suffix of ["", "-wal", "-shm"]) {
    rmSync(`${dbPath}${suffix}`, { force: true });
  }
}

function replaceSqliteDatabase({ nextPath, previousPath, targetPath }) {
  removeSqliteFiles(previousPath);

  if (existsSync(targetPath)) {
    renameSync(targetPath, previousPath);
  }

  removeSqliteFiles(targetPath);
  renameSync(nextPath, targetPath);
  removeSqliteFiles(nextPath);
}

function buildSql(sourcePath) {
  return `
PRAGMA journal_mode = DELETE;
PRAGMA synchronous = NORMAL;
PRAGMA temp_store = MEMORY;

ATTACH DATABASE ${quoteSqlString(sourcePath)} AS source;

DROP TABLE IF EXISTS SearchIndexMeta;
DROP TABLE IF EXISTS CultivarSearchIndex;
DROP TABLE IF EXISTS CultivarListingSearchIndex;
DROP TABLE IF EXISTS CultivarSearchFts;

CREATE TABLE SearchIndexMeta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE CultivarSearchIndex (
  id INTEGER PRIMARY KEY,
  cultivarReferenceId TEXT NOT NULL UNIQUE,
  v2AhsCultivarId TEXT,
  normalizedName TEXT NOT NULL,
  displayName TEXT NOT NULL,
  displayNameSearch TEXT NOT NULL,
  hybridizer TEXT,
  hybridizerSearch TEXT,
  yearInt INTEGER,
  scapeHeightIn REAL,
  bloomSizeIn REAL,
  budCount INTEGER,
  branches INTEGER,
  bloomSeason TEXT,
  bloomHabit TEXT,
  form TEXT,
  ploidy TEXT,
  foliageType TEXT,
  fragrance TEXT,
  color TEXT,
  parentage TEXT,
  rebloom INTEGER,
  imageUrl TEXT,
  hasImage INTEGER NOT NULL,
  listingCount INTEGER NOT NULL,
  forSaleListingCount INTEGER NOT NULL,
  sourceUpdatedAt TEXT NOT NULL
);

CREATE TABLE CultivarListingSearchIndex (
  id INTEGER PRIMARY KEY,
  listingId TEXT NOT NULL UNIQUE,
  cultivarReferenceId TEXT NOT NULL,
  catalogSlugOrId TEXT NOT NULL,
  catalogTitle TEXT,
  listingTitle TEXT NOT NULL,
  listingTitleSearch TEXT NOT NULL,
  listingDescription TEXT,
  listingDescriptionSearch TEXT,
  price REAL,
  forSale INTEGER NOT NULL,
  hasPhoto INTEGER NOT NULL,
  canonicalPath TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

WITH active_pro_users AS (
  SELECT u."id"
  FROM source."User" u
  JOIN source."KeyValue" kv ON kv."key" = 'stripe:customer:' || u."stripeCustomerId"
  WHERE u."stripeCustomerId" IS NOT NULL
    AND json_extract(kv."value", '$.status') IN ('active', 'trialing')
),
listing_counts AS (
  SELECT
    l."cultivarReferenceId",
    COUNT(*) AS listingCount,
    SUM(CASE WHEN COALESCE(l."price", 0) > 0 THEN 1 ELSE 0 END) AS forSaleListingCount
  FROM source."Listing" l
  JOIN active_pro_users apu ON apu."id" = l."userId"
  WHERE l."cultivarReferenceId" IS NOT NULL
    AND (l."status" IS NULL OR l."status" <> 'HIDDEN')
  GROUP BY l."cultivarReferenceId"
)
INSERT INTO CultivarSearchIndex (
  cultivarReferenceId,
  v2AhsCultivarId,
  normalizedName,
  displayName,
  displayNameSearch,
  hybridizer,
  hybridizerSearch,
  yearInt,
  scapeHeightIn,
  bloomSizeIn,
  budCount,
  branches,
  bloomSeason,
  bloomHabit,
  form,
  ploidy,
  foliageType,
  fragrance,
  color,
  parentage,
  rebloom,
  imageUrl,
  hasImage,
  listingCount,
  forSaleListingCount,
  sourceUpdatedAt
)
SELECT
  cr."id",
  cr."v2AhsCultivarId",
  cr."normalizedName",
  COALESCE(NULLIF(TRIM(v2."post_title"), ''), cr."normalizedName"),
  lower(COALESCE(NULLIF(TRIM(v2."post_title"), ''), cr."normalizedName")),
  COALESCE(
    NULLIF(TRIM(v2."primary_hybridizer_name"), ''),
    NULLIF(TRIM(v2."hybridizer_code_legacy"), '')
  ),
  lower(
    COALESCE(
      NULLIF(TRIM(v2."primary_hybridizer_name"), ''),
      NULLIF(TRIM(v2."hybridizer_code_legacy"), '')
    )
  ),
  CASE
    WHEN v2."introduction_date" GLOB '[12][0-9][0-9][0-9]*' THEN CAST(substr(v2."introduction_date", 1, 4) AS INTEGER)
    ELSE NULL
  END,
  v2."scape_height_in",
  v2."bloom_size_in",
  v2."bud_count",
  v2."branches",
  NULLIF(TRIM(v2."bloom_season_names"), ''),
  NULLIF(TRIM(v2."bloom_habit_names"), ''),
  CASE
    WHEN NULLIF(TRIM(v2."flower_form_names"), '') IS NOT NULL
      AND NULLIF(TRIM(v2."unusual_forms_names"), '') IS NOT NULL
      THEN TRIM(v2."flower_form_names") || ', ' || TRIM(v2."unusual_forms_names")
    ELSE COALESCE(
      NULLIF(TRIM(v2."flower_form_names"), ''),
      NULLIF(TRIM(v2."unusual_forms_names"), '')
    )
  END,
  NULLIF(TRIM(v2."ploidy_names"), ''),
  NULLIF(TRIM(v2."foliage_names"), ''),
  NULLIF(TRIM(v2."fragrance_names"), ''),
  NULLIF(TRIM(v2."color"), ''),
  NULLIF(TRIM(v2."parentage"), ''),
  v2."rebloom",
  NULLIF(TRIM(v2."image_url"), ''),
  CASE
    WHEN NULLIF(TRIM(v2."image_url"), '') IS NULL THEN 0
    ELSE 1
  END,
  COALESCE(lc.listingCount, 0),
  COALESCE(lc.forSaleListingCount, 0),
  MAX(
    COALESCE(cr."updatedAt", '1970-01-01'),
    COALESCE(v2."updatedAt", '1970-01-01')
  )
FROM source."CultivarReference" cr
JOIN source."V2AhsCultivar" v2 ON v2."id" = cr."v2AhsCultivarId"
LEFT JOIN listing_counts lc ON lc."cultivarReferenceId" = cr."id"
WHERE cr."normalizedName" IS NOT NULL
  AND COALESCE(NULLIF(TRIM(v2."post_title"), ''), cr."normalizedName") IS NOT NULL;

WITH active_pro_users AS (
  SELECT u."id"
  FROM source."User" u
  JOIN source."KeyValue" kv ON kv."key" = 'stripe:customer:' || u."stripeCustomerId"
  WHERE u."stripeCustomerId" IS NOT NULL
    AND json_extract(kv."value", '$.status') IN ('active', 'trialing')
),
image_counts AS (
  SELECT
    "listingId",
    COUNT(*) AS imageCount
  FROM source."Image"
  WHERE "listingId" IS NOT NULL
  GROUP BY "listingId"
)
INSERT INTO CultivarListingSearchIndex (
  listingId,
  cultivarReferenceId,
  catalogSlugOrId,
  catalogTitle,
  listingTitle,
  listingTitleSearch,
  listingDescription,
  listingDescriptionSearch,
  price,
  forSale,
  hasPhoto,
  canonicalPath,
  updatedAt
)
SELECT
  l."id",
  l."cultivarReferenceId",
  COALESCE(NULLIF(TRIM(up."slug"), ''), l."userId"),
  NULLIF(TRIM(up."title"), ''),
  l."title",
  lower(l."title"),
  NULLIF(TRIM(l."description"), ''),
  lower(NULLIF(TRIM(l."description"), '')),
  l."price",
  CASE WHEN COALESCE(l."price", 0) > 0 THEN 1 ELSE 0 END,
  CASE WHEN COALESCE(ic.imageCount, 0) > 0 THEN 1 ELSE 0 END,
  '/' || COALESCE(NULLIF(TRIM(up."slug"), ''), l."userId") || '/' || COALESCE(NULLIF(TRIM(l."slug"), ''), l."id"),
  l."updatedAt"
FROM source."Listing" l
JOIN CultivarSearchIndex csi ON csi.cultivarReferenceId = l."cultivarReferenceId"
JOIN active_pro_users apu ON apu."id" = l."userId"
LEFT JOIN source."UserProfile" up ON up."userId" = l."userId"
LEFT JOIN image_counts ic ON ic."listingId" = l."id"
WHERE l."cultivarReferenceId" IS NOT NULL
  AND (l."status" IS NULL OR l."status" <> 'HIDDEN');

CREATE VIRTUAL TABLE CultivarSearchFts USING fts5(
  displayName,
  normalizedName,
  hybridizer,
  color,
  parentage,
  content='CultivarSearchIndex',
  content_rowid='id',
  tokenize='unicode61 remove_diacritics 2'
);

INSERT INTO CultivarSearchFts(rowid, displayName, normalizedName, hybridizer, color, parentage)
SELECT id, displayName, normalizedName, hybridizer, color, parentage
FROM CultivarSearchIndex;

CREATE INDEX CultivarSearchIndex_yearInt_idx
  ON CultivarSearchIndex(yearInt);

CREATE INDEX CultivarSearchIndex_bloomSizeIn_idx
  ON CultivarSearchIndex(bloomSizeIn);

CREATE INDEX CultivarSearchIndex_scapeHeightIn_idx
  ON CultivarSearchIndex(scapeHeightIn);

CREATE INDEX CultivarSearchIndex_budCount_idx
  ON CultivarSearchIndex(budCount);

CREATE INDEX CultivarSearchIndex_branches_idx
  ON CultivarSearchIndex(branches);

CREATE INDEX CultivarSearchIndex_hasImage_idx
  ON CultivarSearchIndex(hasImage);

CREATE INDEX CultivarSearchIndex_listingCount_idx
  ON CultivarSearchIndex(listingCount);

CREATE INDEX CultivarSearchIndex_forSaleListingCount_idx
  ON CultivarSearchIndex(forSaleListingCount);

CREATE INDEX CultivarListingSearchIndex_cultivarReferenceId_idx
  ON CultivarListingSearchIndex(cultivarReferenceId);

CREATE INDEX CultivarListingSearchIndex_catalogSlugOrId_idx
  ON CultivarListingSearchIndex(catalogSlugOrId);

CREATE INDEX CultivarListingSearchIndex_price_idx
  ON CultivarListingSearchIndex(price);

CREATE INDEX CultivarListingSearchIndex_forSale_idx
  ON CultivarListingSearchIndex(forSale);

CREATE INDEX CultivarListingSearchIndex_hasPhoto_idx
  ON CultivarListingSearchIndex(hasPhoto);

INSERT INTO SearchIndexMeta(key, value)
VALUES
  ('schemaVersion', '5'),
  ('builtAt', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('sourcePath', ${quoteSqlString(sourcePath)});
ANALYZE;
`;
}

function validateIndex(targetPath) {
  const output = execFileSync(
    "sqlite3",
    [
      targetPath,
      `
SELECT 'cultivars', COUNT(*) FROM CultivarSearchIndex;
SELECT 'linkedListings', COUNT(*) FROM CultivarListingSearchIndex;
SELECT 'quickCheck', quick_check FROM pragma_quick_check;
`,
    ],
    { encoding: "utf8" },
  );

  if (!output.includes("quickCheck|ok")) {
    throw new Error(`Search index validation failed:\n${output}`);
  }

  return output.trim();
}

function main() {
  const startedAt = performance.now();
  const args = parseArgs();
  const sourcePath = normalizeLocalPath(args.source);
  const targetPath = normalizeLocalPath(args.target);
  const targetDir = path.dirname(targetPath);
  const nextPath = `${targetPath}.next`;
  const previousPath = `${targetPath}.previous`;

  assertSafePaths(sourcePath, targetPath);
  mkdirSync(targetDir, { recursive: true });
  removeSqliteFiles(nextPath);

  const sqlPath = path.join(targetDir, "build-public-search-index.sql");
  writeFileSync(sqlPath, buildSql(sourcePath));

  console.log("Building public search index");
  console.log(`Source DB: ${sourcePath}`);
  console.log(`Target DB: ${targetPath}`);
  console.log("Remote reads: disabled");

  execFileSync("sqlite3", [nextPath, `.read ${sqlPath}`], {
    cwd: APP_ROOT,
    stdio: "inherit",
  });

  const validation = validateIndex(nextPath);

  replaceSqliteDatabase({ nextPath, previousPath, targetPath });

  const elapsedMs = Math.round(performance.now() - startedAt);
  console.log(validation);
  console.log(`Built public search index in ${elapsedMs}ms`);
}

main();
