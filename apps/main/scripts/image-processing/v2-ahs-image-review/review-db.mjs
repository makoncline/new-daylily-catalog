// @ts-nocheck

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
export const APP_ROOT = path.resolve(SCRIPT_DIR, "../../..");
export const DATA_ROOT = path.resolve(
  process.env.V2_AHS_IMAGE_REVIEW_DATA_ROOT ||
    path.join(os.homedir(), "daylily-catalog-image-processing"),
);
export const LOCAL_RUNTIME_ROOT = path.join(
  DATA_ROOT,
  "v2-ahs-image-review",
  "local",
);
export const REVIEW_ROOT = path.join(DATA_ROOT, "v2-ahs-image-review");
export const REVIEW_DB_PATH = path.join(REVIEW_ROOT, "review.sqlite");
export const REVIEW_EDITED_DIR = path.join(REVIEW_ROOT, "edited");
export const ORIGINALS_DIR = path.join(DATA_ROOT, "v2-ahs-images");
export const PROD_COPY_DB_PATH = path.resolve(
  process.env.V2_AHS_PROD_COPY_DB_PATH ||
    path.join(APP_ROOT, "prisma", "local-prod-copy-daylily-catalog.db"),
);

function nowIso() {
  return new Date().toISOString();
}

function mapFilesByStem(dirPath) {
  const fileMap = new Map();

  if (!fs.existsSync(dirPath)) {
    return fileMap;
  }

  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    if (!entry.isFile()) {
      continue;
    }

    if (entry.name.startsWith("_") || entry.name.endsWith(".part")) {
      continue;
    }

    fileMap.set(path.parse(entry.name).name, path.join(dirPath, entry.name));
  }

  return fileMap;
}

export function ensureStorage() {
  fs.mkdirSync(REVIEW_ROOT, { recursive: true });
  fs.mkdirSync(REVIEW_EDITED_DIR, { recursive: true });
}

export function openQueueDb() {
  ensureStorage();
  const database = new DatabaseSync(REVIEW_DB_PATH);
  database.exec("PRAGMA busy_timeout = 30000");
  return database;
}

export function prepareQueueDbForConcurrentWrites() {
  const database = openQueueDb();

  try {
    database.prepare("PRAGMA journal_mode = WAL").get();
    database.exec("PRAGMA synchronous = NORMAL");
  } finally {
    database.close();
  }
}

export function ensureSchema(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS "v2_image_review_queue" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "postTitle" TEXT,
      "originalPath" TEXT NOT NULL,
      "editedPath" TEXT,
      "status" TEXT NOT NULL,
      "attempts" INTEGER NOT NULL DEFAULT 0,
      "lastError" TEXT,
      "promptVersion" TEXT,
      "codexNativeAgentId" TEXT,
      "createdAt" TEXT NOT NULL,
      "updatedAt" TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS "v2_image_review_queue_status_updated_idx"
      ON "v2_image_review_queue"("status", "updatedAt");
  `);

  const columns = database
    .prepare(`PRAGMA table_info("v2_image_review_queue")`)
    .all();

  if (!columns.some((column) => column.name === "codexNativeAgentId")) {
    database.exec(
      `ALTER TABLE "v2_image_review_queue" ADD COLUMN "codexNativeAgentId" TEXT`,
    );
  }
}

function readQueueItem(database, id) {
  const row = database
    .prepare(
      `
      SELECT
        "id",
        "postTitle",
        "originalPath",
        "editedPath",
        "status",
        "attempts",
        "lastError",
        "promptVersion",
        "codexNativeAgentId",
        "createdAt",
        "updatedAt"
      FROM "v2_image_review_queue"
      WHERE "id" = ?
    `,
    )
    .get(id);

  if (!row) {
    return null;
  }

  return {
    id: String(row.id),
    postTitle: typeof row.postTitle === "string" ? row.postTitle : null,
    originalPath: String(row.originalPath),
    editedPath: typeof row.editedPath === "string" ? row.editedPath : null,
    status: String(row.status),
    attempts: Number(row.attempts ?? 0),
    lastError: typeof row.lastError === "string" ? row.lastError : null,
    promptVersion:
      typeof row.promptVersion === "string" ? row.promptVersion : null,
    codexNativeAgentId:
      typeof row.codexNativeAgentId === "string"
        ? row.codexNativeAgentId
        : null,
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

export function syncQueue() {
  ensureStorage();

  const originalFiles = mapFilesByStem(ORIGINALS_DIR);
  const editedFiles = mapFilesByStem(REVIEW_EDITED_DIR);
  const prodDb = new DatabaseSync(PROD_COPY_DB_PATH, {
    open: true,
    readOnly: true,
  });
  const queueDb = openQueueDb();

  try {
    ensureSchema(queueDb);

    const sourceRows = prodDb
      .prepare(
        `
        SELECT
          cr."id",
          COALESCE(
            NULLIF(v2."post_title", ''),
            NULLIF(ahs."name", ''),
            MIN(NULLIF(l."title", ''))
          ) AS "post_title"
        FROM "CultivarReference" cr
        JOIN "Listing" l
          ON l."cultivarReferenceId" = cr."id"
        LEFT JOIN "V2AhsCultivar" v2
          ON v2."id" = cr."v2AhsCultivarId"
        LEFT JOIN "AhsListing" ahs
          ON ahs."id" = cr."ahsId"
        WHERE NOT EXISTS (
            SELECT 1
            FROM "ImageAsset" ia
            WHERE ia."cultivarReferenceId" = cr."id"
              AND ia."kind" = 'cultivar'
              AND ia."status" = 'ready'
          )
          AND (
            NULLIF(v2."image_url", '') IS NOT NULL
            OR NULLIF(ahs."ahsImageUrl", '') IS NOT NULL
          )
        GROUP BY
          cr."id",
          v2."post_title",
          ahs."name",
          v2."introduction_date",
          ahs."year"
        ORDER BY
          COALESCE(v2."introduction_date", ahs."year", '') DESC,
          cr."id" ASC
      `,
      )
      .all();

    const existingStmt = queueDb.prepare(`
      SELECT
        "id",
        "status",
        "attempts",
        "promptVersion",
        "createdAt",
        "lastError"
      FROM "v2_image_review_queue"
      WHERE "id" = ?
    `);

    const upsertStmt = queueDb.prepare(`
      INSERT INTO "v2_image_review_queue" (
        "id",
        "postTitle",
        "originalPath",
        "editedPath",
        "status",
        "attempts",
        "lastError",
        "promptVersion",
        "createdAt",
        "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT("id") DO UPDATE SET
        "postTitle" = excluded."postTitle",
        "originalPath" = excluded."originalPath",
        "editedPath" = excluded."editedPath",
        "status" = excluded."status",
        "attempts" = excluded."attempts",
        "lastError" = excluded."lastError",
        "promptVersion" = excluded."promptVersion",
        "updatedAt" = excluded."updatedAt"
    `);
    const importedRows = prodDb
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
    const markImportedStmt = queueDb.prepare(`
      UPDATE "v2_image_review_queue"
      SET
        "status" = 'imported',
        "lastError" = NULL,
        "updatedAt" = ?
      WHERE "id" = ?
        AND "status" <> 'imported'
    `);
    const markLegacyStmt = queueDb.prepare(`
      UPDATE "v2_image_review_queue"
      SET
        "status" = 'legacy',
        "updatedAt" = ?
      WHERE "id" NOT LIKE 'cr-%'
        AND "status" IN ('review', 'approved')
    `);

    let insertedRows = 0;
    let updatedRows = 0;
    let missingOriginalRows = 0;
    let queuedRows = 0;
    let importedRowsMarked = 0;
    let legacyRowsMarked = 0;
    const updatedAt = nowIso();

    queueDb.exec("BEGIN TRANSACTION");

    for (const importedRow of importedRows) {
      const result = markImportedStmt.run(updatedAt, String(importedRow.id));
      importedRowsMarked += Number(result.changes ?? 0);
    }
    legacyRowsMarked += Number(markLegacyStmt.run(updatedAt).changes ?? 0);

    for (const sourceRow of sourceRows) {
      const id = String(sourceRow.id);
      const originalPath = originalFiles.get(id);

      if (!originalPath) {
        missingOriginalRows += 1;
        continue;
      }

      const existing = existingStmt.get(id);
      const editedPath = editedFiles.get(id) ?? null;
      let nextStatus = editedPath ? "review" : "pending";

      if (
        existing?.status === "approved" ||
        existing?.status === "rejected" ||
        existing?.status === "failed"
      ) {
        nextStatus = String(existing.status);
      }

      if (existing?.status === "processing") {
        nextStatus = editedPath ? "review" : "pending";
      }

      if (existing?.status === "review" && !editedPath) {
        nextStatus = "pending";
      }

      upsertStmt.run(
        id,
        typeof sourceRow.post_title === "string" ? sourceRow.post_title : null,
        originalPath,
        editedPath,
        nextStatus,
        typeof existing?.attempts === "number" ? existing.attempts : 0,
        typeof existing?.lastError === "string" ? existing.lastError : null,
        typeof existing?.promptVersion === "string"
          ? existing.promptVersion
          : null,
        typeof existing?.createdAt === "string"
          ? existing.createdAt
          : updatedAt,
        updatedAt,
      );

      if (existing) {
        updatedRows += 1;
      } else {
        insertedRows += 1;
      }

      queuedRows += 1;
    }

    queueDb.exec("COMMIT");

    return {
      totalSourceRows: sourceRows.length,
      queuedRows,
      insertedRows,
      updatedRows,
      missingOriginalRows,
      importedRowsMarked,
      legacyRowsMarked,
    };
  } catch (error) {
    try {
      queueDb.exec("ROLLBACK");
    } catch {}
    throw error;
  } finally {
    prodDb.close();
    queueDb.close();
  }
}

export function getCounts() {
  const database = openQueueDb();

  try {
    ensureSchema(database);
    const rows = database
      .prepare(
        `
        SELECT "status", COUNT(*) AS "count"
        FROM "v2_image_review_queue"
        GROUP BY "status"
      `,
      )
      .all();

    const result = {
      total: 0,
      pending: 0,
      processing: 0,
      review: 0,
      approved: 0,
      imported: 0,
      legacy: 0,
      rejected: 0,
      failed: 0,
    };

    for (const row of rows) {
      const status = String(row.status);
      const count = Number(row.count ?? 0);
      result.total += count;

      if (status === "pending") result.pending = count;
      if (status === "processing") result.processing = count;
      if (status === "review") result.review = count;
      if (status === "approved") result.approved = count;
      if (status === "imported") result.imported = count;
      if (status === "legacy") result.legacy = count;
      if (status === "rejected") result.rejected = count;
      if (status === "failed") result.failed = count;
    }

    return result;
  } finally {
    database.close();
  }
}

export function getItem(preferredId = null) {
  const database = openQueueDb();

  try {
    ensureSchema(database);

    if (preferredId) {
      return readQueueItem(database, preferredId);
    }

    const row = database
      .prepare(
        `
        SELECT "id"
        FROM "v2_image_review_queue"
        ORDER BY
          CASE "status"
            WHEN 'review' THEN 0
            WHEN 'failed' THEN 1
            WHEN 'processing' THEN 2
            WHEN 'pending' THEN 3
            WHEN 'rejected' THEN 4
            WHEN 'approved' THEN 5
            WHEN 'imported' THEN 6
            WHEN 'legacy' THEN 7
            ELSE 8
          END,
          "updatedAt" ASC,
          "id" ASC
        LIMIT 1
      `,
      )
      .get();

    return row?.id ? readQueueItem(database, String(row.id)) : null;
  } finally {
    database.close();
  }
}

export function getItems() {
  const database = openQueueDb();

  try {
    ensureSchema(database);

    const rows = database
      .prepare(
        `
        SELECT
          "id",
          "postTitle",
          "originalPath",
          "editedPath",
          "status",
          "attempts",
          "lastError",
          "promptVersion",
          "createdAt",
          "updatedAt"
        FROM "v2_image_review_queue"
        WHERE "status" = 'review'
          AND "originalPath" IS NOT NULL
          AND "editedPath" IS NOT NULL
        ORDER BY
          "updatedAt" ASC,
          "id" ASC
      `,
      )
      .all();

    return rows.map((row) => ({
      id: String(row.id),
      postTitle: typeof row.postTitle === "string" ? row.postTitle : null,
      originalPath: String(row.originalPath),
      editedPath: typeof row.editedPath === "string" ? row.editedPath : null,
      status: String(row.status),
      attempts: Number(row.attempts ?? 0),
      lastError: typeof row.lastError === "string" ? row.lastError : null,
      promptVersion:
        typeof row.promptVersion === "string" ? row.promptVersion : null,
      createdAt: String(row.createdAt),
      updatedAt: String(row.updatedAt),
    }));
  } finally {
    database.close();
  }
}

export function getEditedItems() {
  const database = openQueueDb();

  try {
    ensureSchema(database);

    const rows = database
      .prepare(
        `
        SELECT
          "id",
          "postTitle",
          "editedPath",
          "status",
          "promptVersion",
          "updatedAt"
        FROM "v2_image_review_queue"
        WHERE "editedPath" IS NOT NULL
          AND "editedPath" <> ''
        ORDER BY datetime("updatedAt") DESC, "id" DESC
      `,
      )
      .all();

    return rows.map((row) => ({
      id: String(row.id),
      postTitle: typeof row.postTitle === "string" ? row.postTitle : null,
      editedPath: typeof row.editedPath === "string" ? row.editedPath : null,
      status: String(row.status),
      promptVersion:
        typeof row.promptVersion === "string" ? row.promptVersion : null,
      updatedAt: String(row.updatedAt),
    }));
  } finally {
    database.close();
  }
}

export function updateStatus(id, status, options = {}) {
  const database = openQueueDb();

  try {
    ensureSchema(database);
    const item = readQueueItem(database, id);

    if (!item) {
      return false;
    }

    database
      .prepare(
        `
        UPDATE "v2_image_review_queue"
        SET
          "status" = ?,
          "lastError" = ?,
          "editedPath" = ?,
          "promptVersion" = ?,
          "codexNativeAgentId" = ?,
          "attempts" = ?,
          "updatedAt" = ?
        WHERE "id" = ?
      `,
      )
      .run(
        status,
        Object.hasOwn(options, "lastError")
          ? options.lastError
          : item.lastError,
        Object.hasOwn(options, "editedPath")
          ? options.editedPath
          : item.editedPath,
        Object.hasOwn(options, "promptVersion")
          ? options.promptVersion
          : item.promptVersion,
        Object.hasOwn(options, "codexNativeAgentId")
          ? options.codexNativeAgentId
          : ["pending", "failed", "rejected"].includes(status)
            ? null
            : item.codexNativeAgentId,
        options.incrementAttempts ? item.attempts + 1 : item.attempts,
        nowIso(),
        id,
      );

    return true;
  } finally {
    database.close();
  }
}

export function approveReviewItems(ids) {
  const uniqueIds = [...new Set(ids)];
  if (uniqueIds.length === 0) return 0;

  const database = openQueueDb();

  try {
    ensureSchema(database);
    database.exec("BEGIN IMMEDIATE TRANSACTION");
    let approved = 0;

    for (let offset = 0; offset < uniqueIds.length; offset += 1_000) {
      const chunk = uniqueIds.slice(offset, offset + 1_000);
      const placeholders = chunk.map(() => "?").join(", ");
      const result = database
        .prepare(
          `
          UPDATE "v2_image_review_queue"
          SET
            "status" = 'approved',
            "updatedAt" = ?
          WHERE "status" = 'review'
            AND "id" IN (${placeholders})
        `,
        )
        .run(nowIso(), ...chunk);
      approved += Number(result.changes);
    }

    database.exec("COMMIT");
    return approved;
  } catch (error) {
    try {
      database.exec("ROLLBACK");
    } catch {}
    throw error;
  } finally {
    database.close();
  }
}

export function assignCodexNativeAgent(id, agentId) {
  const database = openQueueDb();

  try {
    ensureSchema(database);
    database.exec("BEGIN IMMEDIATE TRANSACTION");

    const row = database
      .prepare(
        `
          SELECT "status", "codexNativeAgentId"
          FROM "v2_image_review_queue"
          WHERE "id" = ?
        `,
      )
      .get(id);

    if (!row) {
      throw new Error(`Queue row does not exist: ${id}`);
    }

    const canAssign =
      ["pending", "failed", "rejected"].includes(String(row.status)) ||
      (row.status === "processing" &&
        (!row.codexNativeAgentId || row.codexNativeAgentId === agentId));

    if (!canAssign) {
      throw new Error(
        `Queue row ${id} cannot be assigned from status ${row.status}`,
      );
    }

    database
      .prepare(
        `
          UPDATE "v2_image_review_queue"
          SET
            "status" = 'processing',
            "codexNativeAgentId" = ?,
            "lastError" = NULL,
            "attempts" = CASE
              WHEN "status" IN ('pending', 'failed', 'rejected')
                THEN "attempts" + 1
              ELSE "attempts"
            END,
            "updatedAt" = ?
          WHERE "id" = ?
        `,
      )
      .run(agentId, nowIso(), id);

    database.exec("COMMIT");
  } catch (error) {
    try {
      database.exec("ROLLBACK");
    } catch {}
    throw error;
  } finally {
    database.close();
  }
}

export function claimNextPendingItem(preferredId = null) {
  const database = openQueueDb();

  try {
    ensureSchema(database);
    database.exec("BEGIN IMMEDIATE TRANSACTION");

    const row = preferredId
      ? database
          .prepare(
            `
            SELECT "id"
            FROM "v2_image_review_queue"
            WHERE "id" = ?
              AND "status" IN ('pending', 'failed', 'rejected')
            LIMIT 1
          `,
          )
          .get(preferredId)
      : database
          .prepare(
            `
            SELECT "id"
            FROM "v2_image_review_queue"
            WHERE "status" IN ('pending', 'failed', 'rejected')
            ORDER BY
              CASE "status"
                WHEN 'failed' THEN 0
                WHEN 'rejected' THEN 1
                ELSE 2
              END,
              "updatedAt" ASC,
              "id" ASC
            LIMIT 1
          `,
          )
          .get();

    if (!row?.id) {
      database.exec("COMMIT");
      return null;
    }

    const item = readQueueItem(database, String(row.id));

    if (!item) {
      database.exec("COMMIT");
      return null;
    }

    database
      .prepare(
        `
        UPDATE "v2_image_review_queue"
        SET
          "status" = 'processing',
          "codexNativeAgentId" = NULL,
          "lastError" = NULL,
          "attempts" = "attempts" + 1,
          "updatedAt" = ?
        WHERE "id" = ?
      `,
      )
      .run(nowIso(), item.id);

    database.exec("COMMIT");

    return {
      ...item,
      status: "processing",
      attempts: item.attempts + 1,
      lastError: null,
    };
  } catch (error) {
    try {
      database.exec("ROLLBACK");
    } catch {}
    throw error;
  } finally {
    database.close();
  }
}

export function getFilePath(id, variant) {
  const item = getItem(id);

  if (!item) {
    return null;
  }

  return variant === "edited" ? item.editedPath : item.originalPath;
}
