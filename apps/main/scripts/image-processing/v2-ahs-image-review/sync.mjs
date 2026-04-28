import {
  ORIGINALS_DIR,
  REVIEW_DB_PATH,
  REVIEW_EDITED_DIR,
  syncQueue,
} from "./review-db.mjs";

const result = syncQueue();

console.log(`[v2-image-review] originals=${ORIGINALS_DIR}`);
console.log(`[v2-image-review] edited=${REVIEW_EDITED_DIR}`);
console.log(`[v2-image-review] db=${REVIEW_DB_PATH}`);
console.log(`[v2-image-review] totalSourceRows=${result.totalSourceRows}`);
console.log(`[v2-image-review] queuedRows=${result.queuedRows}`);
console.log(`[v2-image-review] insertedRows=${result.insertedRows}`);
console.log(`[v2-image-review] updatedRows=${result.updatedRows}`);
console.log(
  `[v2-image-review] missingOriginalRows=${result.missingOriginalRows}`,
);
