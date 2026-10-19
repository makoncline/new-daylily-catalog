#!/usr/bin/env node
import path from "node:path";
import { pathToFileURL } from "node:url";

const requiredJobs = ["quality", "vitest", "full-app-integration"];

/**
 * @param {Record<string, string | undefined>} results
 * @param {boolean} isFork
 */
export function failedRequiredJobs(results, isFork) {
  const failures = requiredJobs.filter((job) => results[job] !== "success");
  if (results.e2e !== "success" && !(isFork && results.e2e === "skipped")) {
    failures.push("e2e");
  }
  return failures;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  const results = {
    quality: process.env.QUALITY_RESULT,
    vitest: process.env.VITEST_RESULT,
    "full-app-integration": process.env.FULL_APP_INTEGRATION_RESULT,
    e2e: process.env.E2E_RESULT,
  };
  const failures = failedRequiredJobs(
    results,
    process.env.PR_IS_FORK === "true",
  );
  for (const [job, result] of Object.entries(results)) {
    console.log(`${job}: ${result ?? "missing"}`);
  }
  if (failures.length) {
    console.error(`Required jobs did not pass: ${failures.join(", ")}`);
    process.exitCode = 1;
  }
}
