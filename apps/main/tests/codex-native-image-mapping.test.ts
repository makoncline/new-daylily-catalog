import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";

const appRoot = process.cwd();
const scriptRoot = path.join(
  appRoot,
  "scripts/image-processing/v2-ahs-image-review",
);
const temporaryRoots: string[] = [];

afterEach(() => {
  for (const temporaryRoot of temporaryRoots.splice(0)) {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

describe("Codex-native image agent mapping", () => {
  it("refuses a mismatched agent before promoting the recorded output", () => {
    const temporaryRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "codex-image-mapping-"),
    );
    temporaryRoots.push(temporaryRoot);

    const dataRoot = path.join(temporaryRoot, "data");
    const reviewRoot = path.join(dataRoot, "v2-ahs-image-review");
    const generatedRoot = path.join(temporaryRoot, "generated");
    const databasePath = path.join(reviewRoot, "review.sqlite");
    const originalPath = path.join(dataRoot, "v2-ahs-images", "cr-test.jpg");
    const correctOutput = path.join(
      generatedRoot,
      "agent-correct",
      "result.png",
    );
    const wrongOutput = path.join(generatedRoot, "agent-wrong", "result.png");

    fs.mkdirSync(path.dirname(originalPath), { recursive: true });
    fs.mkdirSync(path.dirname(correctOutput), { recursive: true });
    fs.mkdirSync(path.dirname(wrongOutput), { recursive: true });
    fs.mkdirSync(reviewRoot, { recursive: true });
    fs.writeFileSync(originalPath, "original");
    fs.writeFileSync(correctOutput, "correct-output");
    fs.writeFileSync(wrongOutput, "wrong-output");

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
        "createdAt" TEXT NOT NULL,
        "updatedAt" TEXT NOT NULL
      );
    `);
    database
      .prepare(
        `INSERT INTO "v2_image_review_queue" VALUES (?, ?, ?, NULL, 'pending', 0, NULL, NULL, ?, ?)`,
      )
      .run("cr-test", "Test cultivar", originalPath, "now", "now");
    database.close();

    const env = {
      ...process.env,
      V2_AHS_IMAGE_REVIEW_DATA_ROOT: dataRoot,
      CODEX_GENERATED_IMAGES_ROOT: generatedRoot,
    };

    execFileSync(
      process.execPath,
      [
        path.join(scriptRoot, "assign-codex-native-agent.mjs"),
        "--pair",
        "cr-test=agent-correct",
      ],
      { env },
    );

    const mismatch = spawnSync(
      process.execPath,
      [
        path.join(scriptRoot, "promote-codex-native-batch.mjs"),
        "--pair",
        "cr-test=agent-wrong",
      ],
      { env, encoding: "utf8" },
    );

    expect(mismatch.status).toBe(1);
    expect(mismatch.stdout).toContain("agent-mismatch");
    expect(fs.existsSync(path.join(reviewRoot, "edited", "cr-test.png"))).toBe(
      false,
    );

    execFileSync(
      process.execPath,
      [
        path.join(scriptRoot, "promote-codex-native-batch.mjs"),
        "--pair",
        "cr-test=agent-correct",
      ],
      { env },
    );

    expect(
      fs.readFileSync(path.join(reviewRoot, "edited", "cr-test.png"), "utf8"),
    ).toBe("correct-output");

    const verifiedDatabase = new DatabaseSync(databasePath, {
      readOnly: true,
    });
    const row = verifiedDatabase
      .prepare(
        `SELECT "status", "codexNativeAgentId" FROM "v2_image_review_queue" WHERE "id" = ?`,
      )
      .get("cr-test");
    verifiedDatabase.close();

    expect(row).toEqual({
      status: "review",
      codexNativeAgentId: "agent-correct",
    });
  });
});
