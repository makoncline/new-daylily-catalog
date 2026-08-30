#!/usr/bin/env node

import { runPublicStorefrontArtifactsTargetWorker } from "./build-public-storefront-artifacts.mjs";
import { storefrontSnapshotSchema } from "@daylily-catalog/storefront-contract";

function parseArgs(args = process.argv.slice(2)) {
  const sellerIds = [];
  let output = null;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument !== "--output" && argument !== "--seller-id") {
      throw new Error(`Unexpected argument: ${argument}`);
    }

    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for ${argument}.`);
    }
    if (argument === "--output") {
      if (output) throw new Error("--output can be specified only once.");
      output = value;
    } else {
      sellerIds.push(value);
    }
    index += 1;
  }

  if (!output) throw new Error("--output is required.");
  return { output, sellerIds };
}

async function main() {
  const result = await runPublicStorefrontArtifactsTargetWorker(
    {
      ...parseArgs(),
      input: process.stdin,
    },
    {
      validateSnapshot: (snapshot) => storefrontSnapshotSchema.parse(snapshot),
    },
  );
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

main().catch((error) => {
  process.stdin.destroy();
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
