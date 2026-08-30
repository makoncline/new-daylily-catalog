#!/usr/bin/env node

import { appendFileSync } from "node:fs";

function validatedOrigin(value) {
  if (!value || value !== value.trim()) return undefined;

  let url;
  try {
    url = new URL(value);
  } catch {
    return undefined;
  }

  const labels = url.hostname.split(".");
  const previewLabel = labels[0] ?? "";
  const isVercelHostname =
    labels.length === 3 &&
    labels[1] === "vercel" &&
    labels[2] === "app" &&
    previewLabel.length <= 63 &&
    /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/u.test(previewLabel);
  const isExactOrigin = value === url.origin || value === `${url.origin}/`;

  if (
    url.protocol !== "https:" ||
    !isVercelHostname ||
    !isExactOrigin ||
    url.username ||
    url.password ||
    url.port ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    return undefined;
  }
  return url.origin;
}

const rawUrl =
  process.env.DEPLOYMENT_ENVIRONMENT_URL || process.env.DEPLOYMENT_TARGET_URL;
const origin = validatedOrigin(rawUrl);
const candidateSha = process.env.DEPLOYMENT_SHA;
const isCommitSha = /^[0-9a-f]{40}$/u.test(candidateSha ?? "");

if (!origin || !isCommitSha) {
  process.stderr.write(
    "The deployment must have an exact HTTPS Vercel origin and a full commit SHA.\n",
  );
  process.exitCode = 1;
} else {
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `origin=${origin}\n`);
    appendFileSync(process.env.GITHUB_OUTPUT, `sha=${candidateSha}\n`);
  }
  process.stdout.write(`${JSON.stringify({ origin, sha: candidateSha })}\n`);
}
