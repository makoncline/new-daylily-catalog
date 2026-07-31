import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

export function createWorkerFixture(prefix: string) {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  const dataRoot = path.join(temporaryRoot, "data");
  const reviewRoot = path.join(dataRoot, "v2-ahs-image-review");
  const originalsRoot = path.join(dataRoot, "v2-ahs-images");

  fs.mkdirSync(reviewRoot, { recursive: true });
  fs.mkdirSync(originalsRoot, { recursive: true });

  return {
    dataRoot,
    databasePath: path.join(reviewRoot, "review.sqlite"),
    fakeBacklogPath: path.join(temporaryRoot, "fake-backlog.mjs"),
    fakeCodexPath: path.join(temporaryRoot, "fake-codex.mjs"),
    generatedRoot: path.join(temporaryRoot, "generated"),
    originalsRoot,
    reviewRoot,
    temporaryRoot,
  };
}

export function createQueueDatabase(databasePath: string) {
  const database = new DatabaseSync(databasePath);
  database.exec(`
    CREATE TABLE "v2_image_review_queue" (
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
  `);
  return database;
}
