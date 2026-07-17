import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const temporaryRoots: string[] = [];

afterEach(() => {
  delete process.env.V2_AHS_IMAGE_REVIEW_DATA_ROOT;
  for (const temporaryRoot of temporaryRoots.splice(0)) {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

describe("image review bulk approval", () => {
  it("approves only the review rows included in the confirmation snapshot", async () => {
    const temporaryRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "image-review-bulk-approval-"),
    );
    temporaryRoots.push(temporaryRoot);
    process.env.V2_AHS_IMAGE_REVIEW_DATA_ROOT = temporaryRoot;

    const moduleUrl = pathToFileURL(
      path.join(
        process.cwd(),
        "scripts/image-processing/v2-ahs-image-review/review-db.mjs",
      ),
    );
    moduleUrl.searchParams.set("test", String(Date.now()));
    const reviewDb = await import(moduleUrl.href);
    const database = reviewDb.openQueueDb();
    reviewDb.ensureSchema(database);

    const insert = database.prepare(`
      INSERT INTO "v2_image_review_queue" (
        "id", "postTitle", "originalPath", "editedPath", "status",
        "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    for (const [id, status] of [
      ["review-1", "review"],
      ["review-2", "review"],
      ["pending-1", "pending"],
      ["processing-1", "processing"],
      ["approved-1", "approved"],
    ]) {
      insert.run(
        id,
        id,
        `/originals/${id}.jpg`,
        status === "review" ? `/edited/${id}.png` : null,
        status,
        "2026-01-01",
        "2026-01-01",
      );
    }
    database.close();

    expect(reviewDb.approveReviewItems(["review-1"])).toBe(1);
    expect(reviewDb.getCounts()).toMatchObject({
      approved: 2,
      pending: 1,
      processing: 1,
      review: 1,
    });
  });
});
