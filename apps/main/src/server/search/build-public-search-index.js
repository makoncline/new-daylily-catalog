import {
  CREATE_TARGET_SCHEMA_SQL,
  FACET_SQL,
  INDEX_SQL,
} from "../../../scripts/public-search-index-sql.mjs";
import { existsSync, linkSync, mkdirSync, renameSync, rmSync } from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client";
import { streamToTargetWorker } from "../target-worker-stream.js";

const SOURCE_BATCH_SIZE = 1_000;
export const SEARCH_INDEX_SCHEMA_VERSION = "13";

/** @typedef {import("@libsql/client").Client} LibSqlClient */
/** @typedef {import("@libsql/client").InStatement} LibSqlStatement */
/** @typedef {import("@libsql/client").InValue} LibSqlValue */
/** @typedef {Pick<import("@prisma/client").PrismaClient, "$queryRawUnsafe">} SearchSourceClient */
/** @typedef {Record<string, unknown>} SourceRow */
/** @typedef {{cultivars: number, elapsedMs: number, linkedListings: number, quickCheck: "ok", schemaVersion: string, targetPath: string}} TargetBuildResult */

const CULTIVAR_COLUMNS = [
  "cultivarReferenceId",
  "v2AhsCultivarId",
  "normalizedName",
  "displayName",
  "displayNameSearch",
  "hybridizer",
  "hybridizerSearch",
  "yearInt",
  "seedlingNumber",
  "scapeHeightIn",
  "bloomSizeIn",
  "budCount",
  "branches",
  "bloomSeason",
  "bloomHabit",
  "form",
  "flowerShow",
  "flowerShowSearch",
  "sculptedTypes",
  "ploidy",
  "foliageType",
  "fragrance",
  "color",
  "parentage",
  "rebloom",
  "doublePercentage",
  "polymerousPercentage",
  "spiderRatio",
  "petalLengthIn",
  "petalWidthIn",
  "awardNames",
  "awardsJson",
  "imageUrl",
  "generatedImageAssetId",
  "generatedImageUrl",
  "generatedOriginalUrl",
  "generatedThumbUrl",
  "generatedBlurUrl",
  "fallbackImageUrl",
  "hasImage",
  "listingCount",
  "forSaleListingCount",
  "sourceUpdatedAt",
];

const LISTING_COLUMNS = [
  "listingId",
  "cultivarReferenceId",
  "catalogSlugOrId",
  "catalogTitle",
  "listingTitle",
  "listingTitleSearch",
  "listingDescription",
  "listingDescriptionSearch",
  "price",
  "forSale",
  "hasPhoto",
  "canonicalPath",
  "updatedAt",
];

const CULTIVAR_PAGE_SQL = `
WITH cultivar_ids AS (
  SELECT cr."id"
  FROM "CultivarReference" cr
  JOIN "V2AhsCultivar" v2 ON v2."id" = cr."v2AhsCultivarId"
  WHERE cr."id" > ?
    AND cr."normalizedName" IS NOT NULL
    AND COALESCE(NULLIF(TRIM(v2."post_title"), ''), cr."normalizedName") IS NOT NULL
  ORDER BY cr."id"
  LIMIT ?
),
active_pro_users AS (
  SELECT u."id"
  FROM "User" u
  JOIN "KeyValue" kv ON kv."key" = 'stripe:customer:' || u."stripeCustomerId"
  WHERE u."stripeCustomerId" IS NOT NULL
    AND json_extract(kv."value", '$.status') IN ('active', 'trialing')
),
listing_counts AS (
  SELECT
    l."cultivarReferenceId",
    COUNT(*) AS listingCount,
    SUM(CASE WHEN COALESCE(l."price", 0) > 0 THEN 1 ELSE 0 END) AS forSaleListingCount
  FROM cultivar_ids ids
  JOIN "Listing" l ON l."cultivarReferenceId" = ids."id"
  JOIN active_pro_users apu ON apu."id" = l."userId"
  WHERE l."status" IS NULL OR l."status" <> 'HIDDEN'
  GROUP BY l."cultivarReferenceId"
),
ranked_generated_images AS (
  SELECT
    ia."cultivarReferenceId",
    ia."id" AS generatedImageAssetId,
    COALESCE(NULLIF(TRIM(ia."displayUrl"), ''), NULLIF(TRIM(ia."originalUrl"), '')) AS generatedImageUrl,
    NULLIF(TRIM(ia."originalUrl"), '') AS generatedOriginalUrl,
    NULLIF(TRIM(ia."thumbUrl"), '') AS generatedThumbUrl,
    NULLIF(TRIM(ia."blurUrl"), '') AS generatedBlurUrl,
    ROW_NUMBER() OVER (
      PARTITION BY ia."cultivarReferenceId"
      ORDER BY ia."order" ASC, ia."createdAt" ASC
    ) AS rowNumber
  FROM cultivar_ids ids
  JOIN "ImageAsset" ia ON ia."cultivarReferenceId" = ids."id"
  WHERE ia."kind" = 'cultivar'
    AND ia."status" = 'ready'
),
generated_cultivar_images AS (
  SELECT *
  FROM ranked_generated_images
  WHERE rowNumber = 1
)
SELECT
  cr."id" AS cultivarReferenceId,
  cr."v2AhsCultivarId" AS v2AhsCultivarId,
  cr."normalizedName" AS normalizedName,
  COALESCE(NULLIF(TRIM(v2."post_title"), ''), cr."normalizedName") AS displayName,
  lower(COALESCE(NULLIF(TRIM(v2."post_title"), ''), cr."normalizedName")) AS displayNameSearch,
  COALESCE(
    NULLIF(TRIM(v2."primary_hybridizer_name"), ''),
    NULLIF(TRIM(v2."hybridizer_code_legacy"), '')
  ) AS hybridizer,
  lower(
    COALESCE(
      NULLIF(TRIM(v2."primary_hybridizer_name"), ''),
      NULLIF(TRIM(v2."hybridizer_code_legacy"), '')
    )
  ) AS hybridizerSearch,
  CASE
    WHEN v2."introduction_date" GLOB '[12][0-9][0-9][0-9]*'
      THEN CAST(substr(v2."introduction_date", 1, 4) AS INTEGER)
    ELSE NULL
  END AS yearInt,
  NULLIF(TRIM(v2."seedling_number"), '') AS seedlingNumber,
  v2."scape_height_in" AS scapeHeightIn,
  v2."bloom_size_in" AS bloomSizeIn,
  v2."bud_count" AS budCount,
  v2."branches" AS branches,
  NULLIF(TRIM(v2."bloom_season_names"), '') AS bloomSeason,
  NULLIF(TRIM(v2."bloom_habit_names"), '') AS bloomHabit,
  CASE
    WHEN NULLIF(TRIM(v2."flower_form_names"), '') IS NOT NULL
      AND NULLIF(TRIM(v2."unusual_forms_names"), '') IS NOT NULL
      THEN TRIM(v2."flower_form_names") || ', ' || TRIM(v2."unusual_forms_names")
    ELSE COALESCE(
      NULLIF(TRIM(v2."flower_form_names"), ''),
      NULLIF(TRIM(v2."unusual_forms_names"), '')
    )
  END AS form,
  NULLIF(TRIM(v2."flower_show"), '') AS flowerShow,
  lower(NULLIF(TRIM(v2."flower_show"), '')) AS flowerShowSearch,
  NULLIF(TRIM(v2."sculpted_type_names"), '') AS sculptedTypes,
  NULLIF(TRIM(v2."ploidy_names"), '') AS ploidy,
  NULLIF(TRIM(v2."foliage_names"), '') AS foliageType,
  NULLIF(TRIM(v2."fragrance_names"), '') AS fragrance,
  NULLIF(TRIM(v2."color"), '') AS color,
  NULLIF(TRIM(v2."parentage"), '') AS parentage,
  v2."rebloom" AS rebloom,
  v2."double_percentage" AS doublePercentage,
  v2."polymerous_percentage" AS polymerousPercentage,
  v2."spider_ratio" AS spiderRatio,
  v2."petal_length_in" AS petalLengthIn,
  v2."petal_width_in" AS petalWidthIn,
  (
    SELECT group_concat(awardName, '|')
    FROM (
      SELECT DISTINCT NULLIF(TRIM(json_extract(award.value, '$.name')), '') AS awardName
      FROM json_each(
        CASE
          WHEN json_valid(v2."awards_json") THEN v2."awards_json"
          ELSE '[]'
        END
      ) award
      WHERE NULLIF(TRIM(json_extract(award.value, '$.name')), '') IS NOT NULL
      ORDER BY awardName COLLATE NOCASE
    )
  ) AS awardNames,
  CASE
    WHEN json_valid(v2."awards_json") THEN v2."awards_json"
    ELSE NULL
  END AS awardsJson,
  COALESCE(
    NULLIF(TRIM(v2."image_url"), ''),
    NULLIF(TRIM(ahs."ahsImageUrl"), '')
  ) AS imageUrl,
  gci.generatedImageAssetId AS generatedImageAssetId,
  gci.generatedImageUrl AS generatedImageUrl,
  gci.generatedOriginalUrl AS generatedOriginalUrl,
  gci.generatedThumbUrl AS generatedThumbUrl,
  gci.generatedBlurUrl AS generatedBlurUrl,
  COALESCE(
    NULLIF(TRIM(v2."image_url"), ''),
    NULLIF(TRIM(ahs."ahsImageUrl"), '')
  ) AS fallbackImageUrl,
  CASE
    WHEN COALESCE(
      gci.generatedImageUrl,
      NULLIF(TRIM(v2."image_url"), ''),
      NULLIF(TRIM(ahs."ahsImageUrl"), '')
    ) IS NULL THEN 0
    ELSE 1
  END AS hasImage,
  COALESCE(lc.listingCount, 0) AS listingCount,
  COALESCE(lc.forSaleListingCount, 0) AS forSaleListingCount,
  CAST(
    MAX(
      COALESCE(cr."updatedAt", '1970-01-01'),
      COALESCE(v2."updatedAt", '1970-01-01')
    ) AS TEXT
  ) AS sourceUpdatedAt
FROM cultivar_ids ids
JOIN "CultivarReference" cr ON cr."id" = ids."id"
JOIN "V2AhsCultivar" v2 ON v2."id" = cr."v2AhsCultivarId"
LEFT JOIN "AhsListing" ahs ON ahs."id" = cr."ahsId"
LEFT JOIN listing_counts lc ON lc."cultivarReferenceId" = cr."id"
LEFT JOIN generated_cultivar_images gci ON gci."cultivarReferenceId" = cr."id"
ORDER BY cr."id"
`;

const LISTING_PAGE_SQL = `
WITH listing_ids AS (
  SELECT l."id"
  FROM "Listing" l
  JOIN "CultivarReference" cr ON cr."id" = l."cultivarReferenceId"
  JOIN "V2AhsCultivar" v2 ON v2."id" = cr."v2AhsCultivarId"
  JOIN "User" u ON u."id" = l."userId"
  JOIN "KeyValue" kv ON kv."key" = 'stripe:customer:' || u."stripeCustomerId"
  WHERE l."id" > ?
    AND u."stripeCustomerId" IS NOT NULL
    AND json_extract(kv."value", '$.status') IN ('active', 'trialing')
    AND (l."status" IS NULL OR l."status" <> 'HIDDEN')
    AND cr."normalizedName" IS NOT NULL
    AND COALESCE(NULLIF(TRIM(v2."post_title"), ''), cr."normalizedName") IS NOT NULL
  ORDER BY l."id"
  LIMIT ?
),
image_counts AS (
  SELECT i."listingId", COUNT(*) AS imageCount
  FROM listing_ids ids
  JOIN "Image" i ON i."listingId" = ids."id"
  GROUP BY i."listingId"
)
SELECT
  l."id" AS listingId,
  l."cultivarReferenceId" AS cultivarReferenceId,
  COALESCE(NULLIF(TRIM(up."slug"), ''), l."userId") AS catalogSlugOrId,
  NULLIF(TRIM(up."title"), '') AS catalogTitle,
  l."title" AS listingTitle,
  lower(l."title") AS listingTitleSearch,
  NULLIF(TRIM(l."description"), '') AS listingDescription,
  lower(NULLIF(TRIM(l."description"), '')) AS listingDescriptionSearch,
  l."price" AS price,
  CASE WHEN COALESCE(l."price", 0) > 0 THEN 1 ELSE 0 END AS forSale,
  CASE WHEN COALESCE(ic.imageCount, 0) > 0 THEN 1 ELSE 0 END AS hasPhoto,
  '/' || COALESCE(NULLIF(TRIM(up."slug"), ''), l."userId") || '/' ||
    COALESCE(NULLIF(TRIM(l."slug"), ''), l."id") AS canonicalPath,
  CAST(l."updatedAt" AS TEXT) AS updatedAt
FROM listing_ids ids
JOIN "Listing" l ON l."id" = ids."id"
LEFT JOIN "UserProfile" up ON up."userId" = l."userId"
LEFT JOIN image_counts ic ON ic."listingId" = l."id"
ORDER BY l."id"
`;

const FINALIZE_TARGET_SQL = FACET_SQL + INDEX_SQL;

/**
 * @param {string} table
 * @param {readonly string[]} columns
 */
function insertSql(table, columns) {
  return `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${columns
    .map(() => "?")
    .join(", ")})`;
}

const INSERT_CULTIVAR_SQL = insertSql("CultivarSearchIndex", CULTIVAR_COLUMNS);
const INSERT_LISTING_SQL = insertSql(
  "CultivarListingSearchIndex",
  LISTING_COLUMNS,
);

/** @param {string} dbPath */
function removeSqliteFiles(dbPath) {
  for (const suffix of ["", "-wal", "-shm", "-journal"]) {
    rmSync(`${dbPath}${suffix}`, { force: true });
  }
}

/**
 * @param {{nextPath: string, previousPath: string, targetPath: string}} paths
 */
function replaceSqliteDatabase({ nextPath, previousPath, targetPath }) {
  removeSqliteFiles(previousPath);

  if (existsSync(targetPath)) {
    linkSync(targetPath, previousPath);
  }

  renameSync(nextPath, targetPath);
  removeSqliteFiles(nextPath);
}

/**
 * @param {unknown} value
 * @returns {LibSqlValue}
 */
function toLibSqlValue(value) {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "bigint") {
    const numberValue = Number(value);
    if (!Number.isSafeInteger(numberValue)) {
      throw new Error(
        `Search index value exceeds the safe integer range: ${value}`,
      );
    }
    return numberValue;
  }
  if (value instanceof Uint8Array) return value;
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    value instanceof ArrayBuffer
  ) {
    return value;
  }

  throw new Error(`Unsupported search index value: ${String(value)}`);
}

/**
 * @param {string} sql
 * @param {readonly string[]} columns
 * @param {SourceRow} row
 * @returns {LibSqlStatement}
 */
function toInsertStatement(sql, columns, row) {
  return {
    sql,
    args: columns.map((column) => toLibSqlValue(row[column])),
  };
}

/**
 * @param {{
 *   cursorColumn: string,
 *   dataset: "cultivars" | "listings",
 *   pageSql: string,
 *   source: SearchSourceClient,
 *   writePage: (message: unknown) => Promise<void>,
 * }} options
 */
async function streamKeysetPages({
  cursorColumn,
  dataset,
  pageSql,
  source,
  writePage,
}) {
  let cursor = "";
  let count = 0;

  while (true) {
    const rows = /** @type {SourceRow[]} */ (
      await source.$queryRawUnsafe(pageSql, cursor, SOURCE_BATCH_SIZE)
    );

    if (!Array.isArray(rows)) {
      throw new Error("Search index source query did not return rows.");
    }

    if (rows.length === 0) break;
    if (rows.length > SOURCE_BATCH_SIZE) {
      throw new Error("Search index source query exceeded its batch limit.");
    }

    await writePage({ dataset, rows, type: "page" });

    const nextCursor = rows.at(-1)?.[cursorColumn];
    if (typeof nextCursor !== "string" || nextCursor <= cursor) {
      throw new Error(`Invalid ${cursorColumn} keyset cursor.`);
    }

    cursor = nextCursor;
    count += rows.length;
  }

  return count;
}

/**
 * @param {SearchSourceClient} source
 * @param {(message: unknown) => Promise<void>} writePage
 */
async function streamSourceRows(source, writePage) {
  const cultivars = await streamKeysetPages({
    cursorColumn: "cultivarReferenceId",
    dataset: "cultivars",
    pageSql: CULTIVAR_PAGE_SQL,
    source,
    writePage,
  });
  if (cultivars === 0) throw new Error("Search source contains no cultivars.");
  const linkedListings = await streamKeysetPages({
    cursorColumn: "listingId",
    dataset: "listings",
    pageSql: LISTING_PAGE_SQL,
    source,
    writePage,
  });

  return { cultivars, linkedListings };
}

/**
 * Read one NDJSON message at a time without allowing the input stream to queue
 * complete source pages while the target is still writing the current page.
 *
 * @param {import("node:stream").Readable} input
 */
async function* readNdjsonLines(input) {
  input.setEncoding("utf8");
  let buffered = "";

  for await (const chunk of input) {
    buffered += String(chunk);
    let lineEnd = buffered.indexOf("\n");

    while (lineEnd >= 0) {
      yield buffered.slice(0, lineEnd);
      buffered = buffered.slice(lineEnd + 1);
      lineEnd = buffered.indexOf("\n");
    }
  }

  if (buffered) yield buffered;
}

/** @param {LibSqlClient} client */
async function validateIndex(client) {
  const [cultivarResult, listingResult, quickCheckResult, schemaVersionResult] =
    await Promise.all([
      client.execute("SELECT COUNT(*) AS count FROM CultivarSearchIndex"),
      client.execute(
        "SELECT COUNT(*) AS count FROM CultivarListingSearchIndex",
      ),
      client.execute("PRAGMA quick_check"),
      client.execute(
        "SELECT value FROM SearchIndexMeta WHERE key = 'schemaVersion'",
      ),
    ]);
  const quickCheck = quickCheckResult.rows.map((row) =>
    String(row.quick_check ?? Object.values(row)[0] ?? ""),
  );
  const schemaVersion = String(schemaVersionResult.rows[0]?.value ?? "");

  if (quickCheck.length !== 1 || quickCheck[0] !== "ok") {
    throw new Error(
      `Search index validation failed: ${quickCheck.join("; ") || "no result"}`,
    );
  }
  if (schemaVersion !== SEARCH_INDEX_SCHEMA_VERSION) {
    throw new Error(
      `Search index validation failed: expected schema ${SEARCH_INDEX_SCHEMA_VERSION}, received ${schemaVersion || "none"}.`,
    );
  }

  return {
    cultivars: Number(cultivarResult.rows[0]?.count ?? 0),
    linkedListings: Number(listingResult.rows[0]?.count ?? 0),
    quickCheck: "ok",
    schemaVersion,
  };
}

/**
 * Build the public search index from a supplied Prisma source connection.
 * Source reads stay in this process. A target-only worker receives one bounded
 * page at a time and owns all target writes, validation, and promotion.
 *
 * @param {{
 *   sourceDb: import("@prisma/client").PrismaClient,
 *   sourceLabel: string,
 *   targetPath: string,
 *   targetWorkerPath: string,
 * }} options
 */
export async function buildPublicSearchIndex({
  sourceDb,
  sourceLabel,
  targetPath,
  targetWorkerPath,
}) {
  if (!sourceLabel) throw new Error("sourceLabel is required.");
  if (!targetWorkerPath) throw new Error("targetWorkerPath is required.");

  const startedAt = performance.now();
  const resolvedTargetPath = path.resolve(targetPath);
  const { sourceResult: copied, targetResult: validation } =
    await streamToTargetWorker({
      targetWorkerArgs: [
        "--target",
        resolvedTargetPath,
        "--source-label",
        sourceLabel,
      ],
      targetWorkerPath,
      stream: (write) => streamSourceRows(sourceDb, write),
    });

  if (
    !validation ||
    typeof validation !== "object" ||
    !("cultivars" in validation) ||
    validation.cultivars !== copied.cultivars ||
    !("linkedListings" in validation) ||
    validation.linkedListings !== copied.linkedListings ||
    !("quickCheck" in validation) ||
    validation.quickCheck !== "ok" ||
    !("schemaVersion" in validation) ||
    validation.schemaVersion !== SEARCH_INDEX_SCHEMA_VERSION
  ) {
    throw new Error("Search index target worker returned an invalid result.");
  }

  const validated = /** @type {TargetBuildResult} */ (validation);
  return {
    ...validated,
    elapsedMs: Math.round(performance.now() - startedAt),
    targetPath: resolvedTargetPath,
  };
}

/**
 * Consume NDJSON source pages and build the target database in this process.
 * This function is for the target-only child process.
 *
 * @param {{
 *   input: import("node:stream").Readable,
 *   sourceLabel: string,
 *   targetPath: string,
 * }} options
 */
export async function runPublicSearchIndexTargetWorker({
  input,
  sourceLabel,
  targetPath,
}) {
  if (!sourceLabel) throw new Error("sourceLabel is required.");

  const startedAt = performance.now();
  const resolvedTargetPath = path.resolve(targetPath);
  const nextPath = `${resolvedTargetPath}.next`;
  const previousPath = `${resolvedTargetPath}.previous`;
  mkdirSync(path.dirname(resolvedTargetPath), { recursive: true });
  removeSqliteFiles(nextPath);

  const target = createClient({ url: `file:${nextPath}` });
  let targetClosed = false;

  try {
    await target.execute("PRAGMA journal_mode = DELETE");
    await target.execute("PRAGMA synchronous = NORMAL");
    await target.execute("PRAGMA temp_store = MEMORY");
    await target.executeMultiple(CREATE_TARGET_SCHEMA_SQL);

    const inserted = { cultivars: 0, linkedListings: 0 };
    let phase = "cultivars";
    let expectedCounts = null;
    let lineNumber = 0;

    for await (const line of readNdjsonLines(input)) {
      lineNumber += 1;
      if (!line.trim()) continue;
      if (expectedCounts) {
        throw new Error("Search index input continued after completion.");
      }

      let message;
      try {
        message = JSON.parse(line);
      } catch (error) {
        throw new Error(
          `Search index input line ${lineNumber} is invalid JSON.`,
          { cause: error },
        );
      }
      if (!message || typeof message !== "object") {
        throw new Error("Search index input message is invalid.");
      }

      if (message.type === "complete") {
        const sourceResult = message.sourceResult;
        if (
          !sourceResult ||
          !Number.isInteger(sourceResult.cultivars) ||
          sourceResult.cultivars < 0 ||
          !Number.isInteger(sourceResult.linkedListings) ||
          sourceResult.linkedListings < 0
        ) {
          throw new Error("Search index completion counts are invalid.");
        }

        expectedCounts = sourceResult;
        continue;
      }

      if (
        message.type !== "page" ||
        (message.dataset !== "cultivars" && message.dataset !== "listings") ||
        !Array.isArray(message.rows) ||
        message.rows.length === 0 ||
        message.rows.length > SOURCE_BATCH_SIZE
      ) {
        throw new Error("Search index page is invalid.");
      }
      if (message.dataset === "cultivars" && phase === "listings") {
        throw new Error("Cultivar pages cannot follow listing pages.");
      }

      if (message.dataset === "listings") phase = "listings";
      const isCultivarPage = message.dataset === "cultivars";
      const rows = /** @type {SourceRow[]} */ (message.rows);
      await target.batch(
        rows.map((row) =>
          toInsertStatement(
            isCultivarPage ? INSERT_CULTIVAR_SQL : INSERT_LISTING_SQL,
            isCultivarPage ? CULTIVAR_COLUMNS : LISTING_COLUMNS,
            row,
          ),
        ),
        "write",
      );
      if (isCultivarPage) {
        inserted.cultivars += rows.length;
      } else {
        inserted.linkedListings += rows.length;
      }
    }

    if (!expectedCounts) {
      throw new Error("Search index input ended before completion.");
    }
    if (
      expectedCounts.cultivars !== inserted.cultivars ||
      expectedCounts.linkedListings !== inserted.linkedListings
    ) {
      throw new Error("Search index input counts do not match inserted rows.");
    }

    await target.executeMultiple(FINALIZE_TARGET_SQL);
    await target.execute(
      "INSERT INTO CultivarSearchFts(CultivarSearchFts, rank) VALUES ('integrity-check', 1)",
    );
    await target.batch(
      [
        {
          sql: "INSERT INTO SearchIndexMeta (key, value) VALUES (?, ?)",
          args: ["schemaVersion", SEARCH_INDEX_SCHEMA_VERSION],
        },
        {
          sql: "INSERT INTO SearchIndexMeta (key, value) VALUES (?, ?)",
          args: ["builtAt", new Date().toISOString()],
        },
        {
          sql: "INSERT INTO SearchIndexMeta (key, value) VALUES (?, ?)",
          args: ["sourceLabel", sourceLabel],
        },
      ],
      "write",
    );
    await target.execute("ANALYZE");

    const validation = await validateIndex(target);
    if (
      validation.cultivars !== expectedCounts.cultivars ||
      validation.linkedListings !== expectedCounts.linkedListings
    ) {
      throw new Error(
        "Search index validation failed: copied row counts do not match.",
      );
    }

    target.close();
    targetClosed = true;
    replaceSqliteDatabase({
      nextPath,
      previousPath,
      targetPath: resolvedTargetPath,
    });

    return {
      elapsedMs: Math.round(performance.now() - startedAt),
      targetPath: resolvedTargetPath,
      ...validation,
    };
  } catch (error) {
    if (!targetClosed) target.close();
    removeSqliteFiles(nextPath);
    throw error;
  }
}
