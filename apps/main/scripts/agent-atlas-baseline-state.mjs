import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

/** @typedef {{ key?: unknown, status?: unknown }} ComparisonResult */

/** @param {string} captures @param {string | undefined} comparisonPath */
function removeApprovedDeletions(captures, comparisonPath) {
  if (!comparisonPath || !existsSync(comparisonPath)) return 0;
  const comparison = /** @type {{ results?: ComparisonResult[] }} */ (
    JSON.parse(readFileSync(comparisonPath, "utf8"))
  );
  const removed = Array.isArray(comparison.results)
    ? comparison.results.filter((item) => item?.status === "removed")
    : [];
  for (const item of removed) {
    if (typeof item.key !== "string") continue;
    rmSync(path.join(captures, `${item.key}.png`), { force: true });
    rmSync(path.join(captures, `${item.key}.json`), { force: true });
  }
  return removed.length;
}

/** @param {string} captures @param {string} baseline */
function copyCaptures(captures, baseline) {
  if (!existsSync(captures)) {
    throw new Error(
      "No atlas captures found. Run node scripts/run-agent-atlas-full.mjs first.",
    );
  }
  rmSync(baseline, { recursive: true, force: true });
  mkdirSync(baseline, { recursive: true });
  cpSync(captures, baseline, { recursive: true });
  return readdirSync(baseline).filter((file) => file.endsWith(".png")).length;
}

/**
 * @param {string} captures
 * @param {string} baseline
 * @param {{ fullCapture?: boolean }} options
 */
export function initializeAtlasBaseline(
  captures,
  baseline,
  { fullCapture = false } = {},
) {
  if (existsSync(baseline)) return false;
  if (!fullCapture) {
    throw new Error(
      "No complete Atlas baseline exists. Run node scripts/agent-loop.mjs --full --ui-only first.",
    );
  }
  const count = copyCaptures(captures, baseline);
  writeFileSync(
    path.join(baseline, "baseline.json"),
    `${JSON.stringify(
      {
        version: 1,
        initializedAt: new Date().toISOString(),
        source: "first-full-capture",
        approved: false,
        count,
      },
      null,
      2,
    )}\n`,
  );
  return true;
}

/** @param {string} baseline */
export function isAtlasBaselineApproved(baseline) {
  const metadataPath = path.join(baseline, "baseline.json");
  if (!existsSync(metadataPath)) return false;
  try {
    return JSON.parse(readFileSync(metadataPath, "utf8")).approved === true;
  } catch {
    return false;
  }
}

/** @param {string} captures @param {string} baseline @param {{ comparisonPath?: string }} [options] */
export function approveAtlasBaseline(captures, baseline, options = {}) {
  removeApprovedDeletions(captures, options.comparisonPath);
  const count = copyCaptures(captures, baseline);
  writeFileSync(
    path.join(baseline, "baseline.json"),
    `${JSON.stringify(
      {
        version: 1,
        approvedAt: new Date().toISOString(),
        approved: true,
        count,
      },
      null,
      2,
    )}\n`,
  );
  return count;
}
