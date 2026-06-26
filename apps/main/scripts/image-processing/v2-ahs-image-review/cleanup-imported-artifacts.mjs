import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(SCRIPT_DIR, "../../..");
const DATA_ROOT =
  process.env.V2_AHS_IMAGE_REVIEW_DATA_ROOT ||
  path.join(os.homedir(), "daylily-catalog-image-processing");
const REVIEW_ROOT = path.join(DATA_ROOT, "v2-ahs-image-review");
const REVIEW_DB_PATH = path.join(REVIEW_ROOT, "review.sqlite");
const PROD_COPY_DB_PATH = path.join(
  APP_ROOT,
  "prisma",
  "local-prod-copy-daylily-catalog.db",
);
const CANDIDATES_DIR = path.join(REVIEW_ROOT, "codex-native-candidates");
const MANIFESTS_DIR = path.join(REVIEW_ROOT, "manifests");

function parseArgs() {
  const args = process.argv.slice(2).filter((arg) => arg !== "--");
  const options = {
    apply: false,
    includeOriginals: false,
  };

  for (const arg of args) {
    if (arg === "--apply") {
      options.apply = true;
      continue;
    }

    if (arg === "--include-originals") {
      options.includeOriginals = true;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function readCoveredIds() {
  const database = new DatabaseSync(PROD_COPY_DB_PATH, {
    open: true,
    readOnly: true,
  });

  try {
    const rows = database
      .prepare(
        `
          SELECT DISTINCT ia."cultivarReferenceId" AS "id"
          FROM "ImageAsset" ia
          WHERE ia."cultivarReferenceId" IS NOT NULL
            AND ia."kind" = 'cultivar'
            AND ia."status" = 'ready'
          UNION
          SELECT DISTINCT cr."ahsId" AS "id"
          FROM "ImageAsset" ia
          JOIN "CultivarReference" cr
            ON cr."id" = ia."cultivarReferenceId"
          WHERE cr."ahsId" IS NOT NULL
            AND ia."kind" = 'cultivar'
            AND ia."status" = 'ready'
          UNION
          SELECT DISTINCT cr."v2AhsCultivarId" AS "id"
          FROM "ImageAsset" ia
          JOIN "CultivarReference" cr
            ON cr."id" = ia."cultivarReferenceId"
          WHERE cr."v2AhsCultivarId" IS NOT NULL
            AND ia."kind" = 'cultivar'
            AND ia."status" = 'ready'
        `,
      )
      .all();

    return new Set(rows.map((row) => String(row.id)));
  } finally {
    database.close();
  }
}

function readImportedRows() {
  const database = new DatabaseSync(REVIEW_DB_PATH, {
    open: true,
    readOnly: true,
  });

  try {
    return database
      .prepare(
        `
          SELECT "id", "originalPath", "editedPath"
          FROM "v2_image_review_queue"
          WHERE "status" = 'imported'
          ORDER BY "id" ASC
        `,
      )
      .all()
      .map((row) => ({
        id: String(row.id),
        originalPath:
          typeof row.originalPath === "string" ? row.originalPath : null,
        editedPath: typeof row.editedPath === "string" ? row.editedPath : null,
      }));
  } finally {
    database.close();
  }
}

function isInsideDataRoot(filePath) {
  const resolvedRoot = path.resolve(DATA_ROOT);
  const resolvedPath = path.resolve(filePath);
  return (
    resolvedPath === resolvedRoot ||
    resolvedPath.startsWith(`${resolvedRoot}${path.sep}`)
  );
}

function collectFiles({ includeOriginals }) {
  const coveredIds = readCoveredIds();
  const importedRows = readImportedRows();
  const filesByPath = new Map();
  let skippedUncovered = 0;

  for (const row of importedRows) {
    if (!coveredIds.has(row.id)) {
      skippedUncovered += 1;
      continue;
    }

    const entries = [
      ["edited", row.editedPath],
      ["candidate", path.join(CANDIDATES_DIR, `${row.id}-codex-native.png`)],
    ];

    if (includeOriginals) {
      entries.push(["original", row.originalPath]);
    }

    for (const [kind, filePath] of entries) {
      if (!filePath || !isInsideDataRoot(filePath)) {
        continue;
      }

      const resolvedPath = path.resolve(filePath);
      if (!filesByPath.has(resolvedPath)) {
        filesByPath.set(resolvedPath, {
          id: row.id,
          kind,
          path: resolvedPath,
        });
      }
    }
  }

  return {
    files: [...filesByPath.values()],
    importedRows: importedRows.length,
    coveredImportedRows: importedRows.length - skippedUncovered,
    skippedUncovered,
  };
}

function fileSize(filePath) {
  try {
    const stat = fs.statSync(filePath);
    return stat.isFile() ? stat.size : 0;
  } catch {
    return 0;
  }
}

function humanBytes(bytes) {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function writeManifestHeader(manifestPath) {
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(manifestPath, "deletedAt\tid\tkind\tbytes\tpath\n", "utf8");
}

function appendManifestRow(manifestPath, row) {
  fs.appendFileSync(
    manifestPath,
    [row.deletedAt, row.id, row.kind, String(row.bytes), row.path].join("\t") +
      "\n",
    "utf8",
  );
}

function main() {
  const options = parseArgs();
  const { files, importedRows, coveredImportedRows, skippedUncovered } =
    collectFiles(options);
  const existingFiles = files
    .map((file) => ({ ...file, bytes: fileSize(file.path) }))
    .filter((file) => file.bytes > 0);
  const totalBytes = existingFiles.reduce((sum, file) => sum + file.bytes, 0);

  console.log(`[cleanup-imported-artifacts] reviewDb=${REVIEW_DB_PATH}`);
  console.log(`[cleanup-imported-artifacts] prodCopyDb=${PROD_COPY_DB_PATH}`);
  console.log(`[cleanup-imported-artifacts] importedRows=${importedRows}`);
  console.log(
    `[cleanup-imported-artifacts] coveredImportedRows=${coveredImportedRows}`,
  );
  console.log(
    `[cleanup-imported-artifacts] skippedUncovered=${skippedUncovered}`,
  );
  console.log(
    `[cleanup-imported-artifacts] includeOriginals=${String(options.includeOriginals)}`,
  );
  console.log(`[cleanup-imported-artifacts] files=${existingFiles.length}`);
  console.log(
    `[cleanup-imported-artifacts] reclaimable=${humanBytes(totalBytes)}`,
  );

  if (!options.apply) {
    console.log("[cleanup-imported-artifacts] dry run; pass --apply to delete");
    return;
  }

  const timestamp = new Date().toISOString().replaceAll(/[:.]/g, "-");
  const manifestPath = path.join(
    MANIFESTS_DIR,
    `cleanup-imported-artifacts-${timestamp}.tsv`,
  );
  writeManifestHeader(manifestPath);

  let deletedFiles = 0;
  let deletedBytes = 0;

  for (const file of existingFiles) {
    appendManifestRow(manifestPath, {
      deletedAt: timestamp,
      id: file.id,
      kind: file.kind,
      bytes: file.bytes,
      path: file.path,
    });
    fs.rmSync(file.path, { force: true });
    deletedFiles += 1;
    deletedBytes += file.bytes;
  }

  console.log(`[cleanup-imported-artifacts] manifest=${manifestPath}`);
  console.log(`[cleanup-imported-artifacts] deletedFiles=${deletedFiles}`);
  console.log(
    `[cleanup-imported-artifacts] deletedBytes=${humanBytes(deletedBytes)}`,
  );
}

main();
