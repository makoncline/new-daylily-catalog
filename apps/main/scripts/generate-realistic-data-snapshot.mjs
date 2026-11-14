#!/usr/bin/env node

import { createClerkClient } from "@clerk/backend";
import { execFileSync } from "node:child_process";
import path from "node:path";
import Stripe from "stripe";

import { REALISTIC_DATA_PERSONAS } from "./realistic-data-personas.mjs";
import {
  generateRealisticDataSnapshot,
  resolveRealisticDataSourcePath,
} from "./realistic-data-snapshot.mjs";
import {
  finishLocalSeed,
  publishRealisticDataSeed,
  seedPaths,
} from "./realistic-data-seed-store.mjs";

const appRoot = path.resolve(import.meta.dirname, "..");
const repoRoot = path.resolve(appRoot, "../..");

function requireTestKey(name, prefix) {
  const value = process.env[name] ?? "";
  if (!value.startsWith(prefix)) {
    throw new Error(
      `${name} must be a test-mode key beginning with ${prefix}.`,
    );
  }
  return value;
}

function resolveSourcePath() {
  const gitCommonDirectory = execFileSync(
    "git",
    ["-C", repoRoot, "rev-parse", "--path-format=absolute", "--git-common-dir"],
    { encoding: "utf8" },
  ).trim();
  const primaryAppRoot = path.join(
    path.dirname(gitCommonDirectory),
    "apps",
    "main",
  );
  return resolveRealisticDataSourcePath({
    primaryAppRoot,
    configuredPath: process.env.REALISTIC_DATA_SOURCE_DB_PATH,
  });
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
  const outputPath = seedPaths.database;

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

  const summary = await generateRealisticDataSnapshot({
    sourcePath,
    outputPath,
    personas: resolvedPersonas,
  });
  console.log("Aligning realistic-data snapshot with the current schema...");
  finishLocalSeed({
    generatedAt: new Date().toISOString(),
    verificationCode: "424242",
    userCount: summary.userCount,
    listingCount: summary.listingCount,
    personas: summary.personas,
  });
  const published = await publishRealisticDataSeed();

  console.log("Published realistic-data seed:");
  console.log(
    `- R2 object: ${published.key} (${published.compressedBytes} bytes)`,
  );
  console.log(`- Database: ${outputPath}`);
  console.log(`- Users: ${summary.userCount}`);
  console.log(`- Listings: ${summary.listingCount}`);
  console.log(
    `- Production-visible subscription states preserved: ${summary.productionVisibleUserCount}`,
  );
  console.log(
    `- Fake values: ${summary.scrubbed.privateNotes} private notes, ${summary.scrubbed.profiles} profiles, ${summary.scrubbed.listings} listing descriptions, ${summary.scrubbed.lists} list descriptions`,
  );
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
