#!/usr/bin/env node

import { appendFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function required(environment, name) {
  const value = environment[name];
  if (!value || value !== value.trim()) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

function previewHostname(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("PREVIEW_ORIGIN is invalid.");
  }

  const labels = url.hostname.split(".");
  if (
    url.protocol !== "https:" ||
    value !== url.origin ||
    labels.length !== 3 ||
    labels[1] !== "vercel" ||
    labels[2] !== "app" ||
    !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/u.test(labels[0] ?? "") ||
    (labels[0]?.length ?? 0) > 63
  ) {
    throw new Error("PREVIEW_ORIGIN must be an exact HTTPS Vercel origin.");
  }
  return url.hostname;
}

function deploymentMismatch(deployment, expected) {
  if (deployment.projectId !== expected.projectId) return "project";
  if (deployment.ownerId !== expected.orgId) return "organization";
  if (deployment.url !== expected.hostname) return "URL";
  if (deployment.meta?.githubCommitSha !== expected.sha) return "commit";
  if (deployment.target !== null) return "target";
  if (deployment.readyState !== "READY") return "state";
  if (!/^dpl_[A-Za-z0-9]+$/u.test(deployment.id ?? "")) return "ID";
  return undefined;
}

async function jsonResponse(response, operation) {
  if (!response.ok) {
    throw new Error(`${operation} failed with HTTP ${response.status}.`);
  }
  try {
    return await response.json();
  } catch {
    throw new Error(`${operation} returned invalid JSON.`);
  }
}

export async function aliasVercelPreview({
  environment = process.env,
  fetchImplementation = fetch,
  outputPath = environment.GITHUB_OUTPUT,
} = {}) {
  const sha = required(environment, "CANDIDATE_SHA");
  if (!/^[0-9a-f]{40}$/u.test(sha)) {
    throw new Error("CANDIDATE_SHA must be a full lowercase commit SHA.");
  }

  const hostname = previewHostname(required(environment, "PREVIEW_ORIGIN"));
  const orgId = required(environment, "VERCEL_ORG_ID");
  const projectId = required(environment, "MAIN_VERCEL_PROJECT_ID");
  const token = required(environment, "VERCEL_TOKEN");
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  const deploymentQuery = new URLSearchParams({
    teamId: orgId,
    withGitRepoInfo: "true",
  });
  const deploymentResponse = await fetchImplementation(
    `https://api.vercel.com/v13/deployments/${encodeURIComponent(hostname)}?${deploymentQuery}`,
    {
      headers,
      method: "GET",
      signal: AbortSignal.timeout(15_000),
    },
  );
  const deployment = await jsonResponse(
    deploymentResponse,
    "Vercel deployment inspection",
  );
  const mismatch = deploymentMismatch(deployment, {
    hostname,
    orgId,
    projectId,
    sha,
  });
  if (mismatch) {
    throw new Error(`The Vercel preview ${mismatch} does not match.`);
  }

  const hash = sha.slice(0, 8);
  const alias = `${hash}.deploy-preview.daylilycatalog.com`;
  const teamQuery = new URLSearchParams({ teamId: orgId });
  const aliasResponse = await fetchImplementation(
    `https://api.vercel.com/v2/deployments/${encodeURIComponent(deployment.id)}/aliases?${teamQuery}`,
    {
      body: JSON.stringify({ alias, redirect: null }),
      headers,
      method: "POST",
      signal: AbortSignal.timeout(15_000),
    },
  );
  const assigned = await jsonResponse(aliasResponse, "Vercel alias assignment");
  if (assigned.alias !== alias) {
    throw new Error("Vercel returned a different alias.");
  }

  if (outputPath) {
    appendFileSync(outputPath, `preview_hash=${hash}\n`);
  }
  return { alias, deploymentId: deployment.id };
}

const isMainModule =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
  aliasVercelPreview()
    .then((result) => {
      process.stdout.write(`${JSON.stringify(result)}\n`);
    })
    .catch((error) => {
      process.stderr.write(
        `${error instanceof Error ? error.message : "Vercel alias failed."}\n`,
      );
      process.exitCode = 1;
    });
}
