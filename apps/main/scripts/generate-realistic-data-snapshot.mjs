#!/usr/bin/env node

import { createClerkClient } from "@clerk/backend";
import * as dotenv from "dotenv";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import Stripe from "stripe";

import { REALISTIC_DATA_PERSONAS } from "./realistic-data-personas.mjs";
import { generateRealisticDataSnapshot } from "./realistic-data-snapshot.mjs";

const appRoot = path.resolve(import.meta.dirname, "..");
const repoRoot = path.resolve(appRoot, "../..");
const outputDirectory = path.join(appRoot, "local", "realistic-data");
const defaultOutputPath = path.join(outputDirectory, "realistic-data.sqlite");
const defaultManifestPath = path.join(outputDirectory, "personas.json");
const sourceCandidates = [
  path.join(appRoot, "prisma", "local-prod-copy-daylily-catalog.db"),
  path.join(
    os.homedir(),
    "dev",
    "new-daylily-catalog",
    "apps",
    "main",
    "prisma",
    "local-prod-copy-daylily-catalog.db",
  ),
];

for (const envPath of [
  path.join(repoRoot, ".env.development"),
  path.join(appRoot, ".env.development"),
]) {
  if (existsSync(envPath)) dotenv.config({ path: envPath, quiet: true });
}

function requireTestKey(name, prefix) {
  const value = process.env[name] ?? "";
  if (!value.startsWith(prefix)) {
    throw new Error(`${name} must be a test-mode key beginning with ${prefix}.`);
  }
  return value;
}

function resolveSourcePath() {
  if (process.env.REALISTIC_DATA_SOURCE_DB_PATH) {
    return path.resolve(process.env.REALISTIC_DATA_SOURCE_DB_PATH);
  }
  const sourcePath = sourceCandidates.find((candidate) => existsSync(candidate));
  if (!sourcePath) {
    throw new Error(
      "No production snapshot found. Set REALISTIC_DATA_SOURCE_DB_PATH or create local-prod-copy-daylily-catalog.db.",
    );
  }
  return sourcePath;
}

async function findOrCreateClerkUser(clerk, persona) {
  const users = await clerk.users.getUserList({
    emailAddress: [persona.email],
    limit: 10,
  });
  const existing = users.data.find((user) =>
    user.emailAddresses.some(
      (address) => address.emailAddress.toLowerCase() === persona.email,
    ),
  );
  if (existing) return existing;

  return clerk.users.createUser({
    externalId: `daylily-prodlike:${persona.key}`,
    emailAddress: [persona.email],
    firstName: persona.firstName,
    lastName: "Prod-like",
    skipPasswordRequirement: true,
    skipLegalChecks: true,
    publicMetadata: {
      prodlikePersona: persona.key,
      sourceProfileSlug: persona.sourceProfileSlug,
    },
  });
}

async function findOrCreateStripeCustomer(stripe, persona) {
  const customers = await stripe.customers.list({
    email: persona.email,
    limit: 100,
  });
  const existing = customers.data.find(
    (customer) =>
      !customer.deleted && customer.metadata.prodlikePersona === persona.key,
  );
  if (existing && !existing.deleted) return existing;

  return stripe.customers.create({
    email: persona.email,
    name: `${persona.firstName} Prod-like`,
    metadata: {
      prodlikePersona: persona.key,
      sourceProfileSlug: persona.sourceProfileSlug,
      localOnly: "true",
    },
  });
}

async function main() {
  const clerkSecretKey = requireTestKey("CLERK_SECRET_KEY", "sk_test_");
  requireTestKey("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "pk_test_");
  const stripeSecretKey = requireTestKey("STRIPE_SECRET_KEY", "sk_test_");
  const sourcePath = resolveSourcePath();
  const outputPath = process.env.REALISTIC_DATA_OUTPUT_DB_PATH
    ? path.resolve(process.env.REALISTIC_DATA_OUTPUT_DB_PATH)
    : defaultOutputPath;

  const clerk = createClerkClient({ secretKey: clerkSecretKey });
  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: "2025-08-27.basil",
  });
  const resolvedPersonas = [];

  console.log("Provisioning realistic-data stage identities...");
  for (const persona of REALISTIC_DATA_PERSONAS) {
    console.log(`- ${persona.key}`);
    const [clerkUser, stripeCustomer] = await Promise.all([
      findOrCreateClerkUser(clerk, persona),
      findOrCreateStripeCustomer(stripe, persona),
    ]);
    resolvedPersonas.push({
      ...persona,
      clerkUserId: clerkUser.id,
      stripeCustomerId: stripeCustomer.id,
    });
  }

  const summary = generateRealisticDataSnapshot({
    sourcePath,
    outputPath,
    personas: resolvedPersonas,
  });
  const manifest = {
    generatedAt: new Date().toISOString(),
    databasePath: outputPath,
    verificationCode: "424242",
    ...summary,
  };
  mkdirSync(outputDirectory, { recursive: true });
  writeFileSync(defaultManifestPath, `${JSON.stringify(manifest, null, 2)}\n`, {
    mode: 0o600,
  });

  console.log("Generated realistic-data local snapshot:");
  console.log(`- Database: ${outputPath}`);
  console.log(`- Users: ${summary.userCount}`);
  console.log(`- Listings: ${summary.listingCount}`);
  console.log(
    `- Production-visible subscription states preserved: ${summary.productionVisibleUserCount}`,
  );
  console.log(`- Listings with private notes: ${summary.privateNoteCount}`);
  console.log("- Verification code: 424242");
  for (const persona of summary.personas) {
    console.log(
      `- ${persona.key}: ${persona.email} -> /${persona.sourceProfileSlug}`,
    );
  }
}

try {
  await main();
} catch (error) {
  console.error("Failed to generate realistic-data snapshot:", error);
  process.exitCode = 1;
}
