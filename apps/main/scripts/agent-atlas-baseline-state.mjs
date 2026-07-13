import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

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

/** @param {string} captures @param {string} baseline */
export function initializeAtlasBaseline(captures, baseline) {
  if (existsSync(baseline)) return false;
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

/** @param {string} captures @param {string} baseline */
export function approveAtlasBaseline(captures, baseline) {
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
