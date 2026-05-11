import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(SCRIPT_DIR, "..");
const DEFAULT_LOCAL_SOURCE = path.join(
  APP_ROOT,
  ".tmp/search/cultivar-search.sqlite",
);
const DEFAULT_LOCAL_TARGET = path.join(
  APP_ROOT,
  ".tmp/search/cultivar-parentage.sqlite",
);
const DEFAULT_PRODUCTION_SOURCE = "/data/search/public-search.sqlite";
const DEFAULT_PRODUCTION_TARGET = "/data/search/public-parentage.sqlite";
const SCHEMA_VERSION = "2";

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
  return process.env.NODE_ENV === "production"
    ? DEFAULT_PRODUCTION_SOURCE
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
      `Refusing remote database URL: ${input}. Parentage index builds must use local files.`,
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
    throw new Error(`Source search index does not exist: ${sourcePath}`);
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

const CHAR_VARIANT_MAP = {
  "\u0060": "'",
  "\u2019": "'",
  "\u2018": "'",
  "\u02BC": "'",
  "\uFF07": "'",
  "\u201C": '"',
  "\u201D": '"',
  "\u2033": '"',
  "\uFF02": '"',
  "\u2013": "-",
  "\u2014": "-",
  "\u2212": "-",
  "\uFE63": "-",
  "\uFF0D": "-",
  "\u00AD": "",
  "\u00A0": " ",
  "\u2007": " ",
  "\u202F": " ",
};
const CHAR_VARIANT_REGEX =
  /[\u0060\u2019\u2018\u02BC\uFF07\u201C\u201D\u2033\uFF02\u2013\u2014\u2212\uFE63\uFF0D\u00AD\u00A0\u2007\u202F]/g;
const TET_DIP_PREFIX_REGEX = /^(tet|dip|diploid|tetraploid)\.?\s+/i;
const UNKNOWN_PARENT_REGEX =
  /^(unknown|unk|sdlg|sdg|seedling|seed|unnamed|none|\?|unknown sdlg|sdlg \d+|sdg \d+|seedling \d+)\.?$/i;

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/‚Äô/g, "'")
    .replace(CHAR_VARIANT_REGEX, (character) => CHAR_VARIANT_MAP[character] ?? character)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function cleanCandidateName(value) {
  return normalizeText(value)
    .replace(/^[([{]+/, "")
    .replace(/[)\]}]+$/, "")
    .replace(TET_DIP_PREFIX_REGEX, "")
    .replace(/\s+/g, " ")
    .trim();
}

function preprocessParentage(value) {
  return String(value ?? "")
    .replace(/‚Äô/g, "'")
    .replace(/\[/g, "(")
    .replace(/\]/g, ")")
    .replace(/\s+/g, " ")
    .trim();
}

function stripOuterParens(value) {
  let output = value.trim();
  let changed = true;

  while (changed && output.startsWith("(") && output.endsWith(")")) {
    changed = false;
    let depth = 0;
    let wrapsWholeValue = true;

    for (let index = 0; index < output.length; index += 1) {
      const character = output.charAt(index);
      if (character === "(") {
        depth += 1;
      } else if (character === ")") {
        depth -= 1;
      }

      if (depth === 0 && index < output.length - 1) {
        wrapsWholeValue = false;
        break;
      }

      if (depth < 0) {
        wrapsWholeValue = false;
        break;
      }
    }

    if (wrapsWholeValue) {
      output = output.slice(1, -1).trim();
      changed = true;
    }
  }

  return output;
}

function splitTopLevelCross(value) {
  const output = stripOuterParens(value);
  const parts = [];
  let depth = 0;
  let start = 0;

  for (let index = 0; index < output.length; index += 1) {
    const character = output.charAt(index);
    if (character === "(") {
      depth += 1;
    } else if (character === ")") {
      depth -= 1;
    }

    const isAsciiTimes =
      (character === "x" || character === "X") &&
      /\s/.test(output.charAt(index - 1) || "") &&
      /\s/.test(output.charAt(index + 1) || "");
    const isTimes = character === "×" || isAsciiTimes;

    if (depth === 0 && isTimes) {
      parts.push(output.slice(start, index).trim());
      start = index + 1;
    }
  }

  parts.push(output.slice(start).trim());
  return parts.filter(Boolean);
}

function boundedDistance(left, right, maxDistance) {
  if (Math.abs(left.length - right.length) > maxDistance) {
    return maxDistance + 1;
  }

  const previous = new Array(right.length + 1);
  const current = new Array(right.length + 1);

  for (let index = 0; index <= right.length; index += 1) {
    previous[index] = index;
  }

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    current[0] = leftIndex;
    let rowMin = current[0];

    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const cost = left.charAt(leftIndex - 1) === right.charAt(rightIndex - 1) ? 0 : 1;
      current[rightIndex] = Math.min(
        previous[rightIndex] + 1,
        current[rightIndex - 1] + 1,
        previous[rightIndex - 1] + cost,
      );
      rowMin = Math.min(rowMin, current[rightIndex]);
    }

    if (rowMin > maxDistance) {
      return maxDistance + 1;
    }

    for (let index = 0; index <= right.length; index += 1) {
      previous[index] = current[index];
    }
  }

  return previous[right.length];
}

function buildReferenceMatcher(referenceRows) {
  const exact = new Map();
  const cleaned = new Map();
  const buckets = new Map();

  for (const row of referenceRows) {
    const normalizedName = normalizeText(row.normalizedName);
    const entry = {
      cultivarReferenceId: row.cultivarReferenceId,
      displayName: row.displayName,
      normalizedName: row.normalizedName,
    };

    exact.set(normalizedName, entry);
    cleaned.set(cleanCandidateName(normalizedName), entry);

    const bucketKey = normalizedName.charAt(0);
    const bucket = buckets.get(bucketKey) ?? [];
    bucket.push(entry);
    buckets.set(bucketKey, bucket);
  }

  const cache = new Map();

  return function matchReference(rawName) {
    const normalizedCandidate = normalizeText(rawName);
    const cleanedCandidate = cleanCandidateName(rawName);

    if (UNKNOWN_PARENT_REGEX.test(cleanedCandidate)) {
      return {
        confidence: null,
        matchType: "placeholder",
        normalizedCandidate: cleanedCandidate,
        nodeType: "unknown",
        reference: null,
      };
    }

    const cached = cache.get(cleanedCandidate);
    if (cached) {
      return cached;
    }

    const exactMatch = exact.get(normalizedCandidate);
    if (exactMatch) {
      const result = {
        confidence: 1,
        matchType: "exact",
        normalizedCandidate,
        nodeType: "cultivar",
        reference: exactMatch,
      };
      cache.set(cleanedCandidate, result);
      return result;
    }

    const cleanedMatch = cleaned.get(cleanedCandidate);
    if (cleanedMatch) {
      const result = {
        confidence: 0.97,
        matchType: "cleaned-exact",
        normalizedCandidate: cleanedCandidate,
        nodeType: "cultivar",
        reference: cleanedMatch,
      };
      cache.set(cleanedCandidate, result);
      return result;
    }

    const maxDistance = cleanedCandidate.length >= 14 ? 3 : 2;
    let bestDistance = maxDistance + 1;
    let bestMatches = [];

    if (cleanedCandidate.length >= 5) {
      const candidates = buckets.get(cleanedCandidate.charAt(0)) ?? [];

      for (const candidate of candidates) {
        const candidateName = normalizeText(candidate.normalizedName);
        const distance = boundedDistance(cleanedCandidate, candidateName, maxDistance);

        if (distance < bestDistance) {
          bestDistance = distance;
          bestMatches = [candidate];
        } else if (distance === bestDistance) {
          bestMatches.push(candidate);
        }
      }
    }

    if (bestMatches.length === 1 && bestDistance <= maxDistance) {
      const result = {
        confidence: Number((1 - bestDistance / Math.max(cleanedCandidate.length, bestMatches[0].normalizedName.length)).toFixed(3)),
        matchType: "fuzzy",
        normalizedCandidate: cleanedCandidate,
        nodeType: "cultivar",
        reference: bestMatches[0],
      };
      cache.set(cleanedCandidate, result);
      return result;
    }

    const result = {
      confidence: null,
      matchType:
        bestDistance <= maxDistance && bestMatches.length > 1
          ? "ambiguous"
          : "none",
      normalizedCandidate: cleanedCandidate,
      nodeType: "cultivar",
      reference: null,
    };
    cache.set(cleanedCandidate, result);
    return result;
  };
}

function parseParentageNodes({ childCultivarReferenceId, parentage, matchReference }) {
  const nodes = [];
  const root = preprocessParentage(parentage);

  function addNode({ pathValue, rawText, nodeType, match }) {
    nodes.push({
      childCultivarReferenceId,
      confidence: match?.confidence ?? null,
      matchType: match?.matchType ?? "none",
      matchedCultivarReferenceId: match?.reference?.cultivarReferenceId ?? null,
      matchedDisplayName: match?.reference?.displayName ?? null,
      matchedNormalizedName: match?.reference?.normalizedName ?? null,
      nodeType,
      normalizedCandidate: match?.normalizedCandidate ?? null,
      path: pathValue,
      rawText,
    });
  }

  function walk(rawValue, pathValue) {
    const stripped = stripOuterParens(rawValue);
    const parts = splitTopLevelCross(stripped);

    if (parts.length > 1) {
      addNode({
        match: null,
        nodeType: "cross",
        pathValue,
        rawText: stripped,
      });
      parts.forEach((part, index) => {
        walk(part, pathValue ? `${pathValue}.${index}` : String(index));
      });
      return;
    }

    const rawText = stripped.trim();
    const match = matchReference(rawText);
    addNode({
      match,
      nodeType: match.nodeType,
      pathValue,
      rawText,
    });
  }

  if (root) {
    walk(root, "");
  }

  return nodes;
}

function buildInsertSql(tableName, columns, rows) {
  if (rows.length === 0) {
    return "";
  }

  const values = rows
    .map(
      (row) =>
        `(${columns
          .map((column) => {
            const value = row[column];
            if (value === null || value === undefined) {
              return "NULL";
            }
            if (typeof value === "number") {
              return Number.isFinite(value) ? String(value) : "NULL";
            }
            return quoteSqlString(String(value));
          })
          .join(", ")})`,
    )
    .join(",\n");

  return `INSERT INTO ${tableName} (${columns.join(", ")}) VALUES\n${values};\n`;
}

function readJsonFromSqlite(dbPath, sql) {
  const output = execFileSync("sqlite3", ["-json", dbPath, sql], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });

  return JSON.parse(output || "[]");
}

function buildSchemaSql(sourcePath) {
  return `
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA temp_store = MEMORY;

CREATE TABLE ParentageIndexMeta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE CultivarParentageNode (
  id INTEGER PRIMARY KEY,
  childCultivarReferenceId TEXT NOT NULL,
  path TEXT NOT NULL,
  nodeType TEXT NOT NULL,
  rawText TEXT NOT NULL,
  normalizedCandidate TEXT,
  matchType TEXT NOT NULL,
  matchedCultivarReferenceId TEXT,
  matchedNormalizedName TEXT,
  matchedDisplayName TEXT,
  confidence REAL,
  UNIQUE(childCultivarReferenceId, path)
);

INSERT INTO ParentageIndexMeta(key, value)
VALUES
  ('schemaVersion', ${quoteSqlString(SCHEMA_VERSION)}),
  ('builtAt', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('sourcePath', ${quoteSqlString(sourcePath)});
`;
}

function buildParentageIndex(sourcePath, targetPath, targetDir) {
  const referenceRows = readJsonFromSqlite(
    sourcePath,
    `
      SELECT cultivarReferenceId, normalizedName, displayName
      FROM CultivarSearchIndex
    `,
  );
  const cultivarRows = readJsonFromSqlite(
    sourcePath,
    `
      SELECT cultivarReferenceId, normalizedName, displayName, parentage
      FROM CultivarSearchIndex
      WHERE parentage IS NOT NULL AND TRIM(parentage) <> ''
    `,
  );
  const matchReference = buildReferenceMatcher(referenceRows);
  const columns = [
    "childCultivarReferenceId",
    "path",
    "nodeType",
    "rawText",
    "normalizedCandidate",
    "matchType",
    "matchedCultivarReferenceId",
    "matchedNormalizedName",
    "matchedDisplayName",
    "confidence",
  ];
  const chunkSize = 1000;
  let nodes = [];
  let insertedNodes = 0;
  const parentageSqlPath = path.join(targetDir, "build-public-parentage-index-data.sql");
  const sqlChunks = ["BEGIN;\n"];

  function flushNodes() {
    if (nodes.length === 0) {
      return;
    }

    sqlChunks.push(buildInsertSql("CultivarParentageNode", columns, nodes));
    insertedNodes += nodes.length;
    nodes = [];
  }

  for (const row of cultivarRows) {
    nodes.push(
      ...parseParentageNodes({
        childCultivarReferenceId: row.cultivarReferenceId,
        matchReference,
        parentage: row.parentage,
      }),
    );

    if (nodes.length >= chunkSize) {
      flushNodes();
    }
  }

  flushNodes();
  sqlChunks.push(`
CREATE INDEX CultivarParentageNode_childCultivarReferenceId_idx
  ON CultivarParentageNode(childCultivarReferenceId);

CREATE INDEX CultivarParentageNode_matchedCultivarReferenceId_idx
  ON CultivarParentageNode(matchedCultivarReferenceId);

CREATE INDEX CultivarParentageNode_matchType_idx
  ON CultivarParentageNode(matchType);

ANALYZE;
COMMIT;
`);
  writeFileSync(parentageSqlPath, sqlChunks.join(""));
  execFileSync("sqlite3", [targetPath, `.read ${parentageSqlPath}`], {
    cwd: APP_ROOT,
    stdio: "inherit",
  });

  return insertedNodes;
}

function validateIndex(targetPath) {
  const output = execFileSync(
    "sqlite3",
    [
      targetPath,
      `
SELECT 'parentageNodes', COUNT(*) FROM CultivarParentageNode;
SELECT 'quickCheck', quick_check FROM pragma_quick_check;
`,
    ],
    { encoding: "utf8" },
  );

  if (!output.includes("quickCheck|ok")) {
    throw new Error(`Parentage index validation failed:\n${output}`);
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

  const schemaSqlPath = path.join(targetDir, "build-public-parentage-index-schema.sql");
  writeFileSync(schemaSqlPath, buildSchemaSql(sourcePath));

  console.log("Building public parentage index");
  console.log(`Source search DB: ${sourcePath}`);
  console.log(`Target DB: ${targetPath}`);
  console.log("Remote reads: disabled");

  execFileSync("sqlite3", [nextPath, `.read ${schemaSqlPath}`], {
    cwd: APP_ROOT,
    stdio: "inherit",
  });

  const parentageNodeCount = buildParentageIndex(sourcePath, nextPath, targetDir);
  const validation = validateIndex(nextPath);

  removeSqliteFiles(previousPath);
  if (existsSync(targetPath)) {
    renameSync(targetPath, previousPath);
  }
  renameSync(nextPath, targetPath);

  removeSqliteFiles(nextPath);

  const elapsedMs = Math.round(performance.now() - startedAt);
  console.log(`Parsed parentage nodes: ${parentageNodeCount}`);
  console.log(validation);
  console.log(`Built public parentage index in ${elapsedMs}ms`);
}

main();
