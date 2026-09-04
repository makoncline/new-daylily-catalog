import { runPublicSearchIndexTargetWorker } from "../src/server/search/build-public-search-index.js";

function parseArgs(args = process.argv.slice(2)) {
  const parsed = new Map();

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg !== "--target" && arg !== "--source-label") {
      throw new Error(`Unexpected argument: ${arg}`);
    }

    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for ${arg}`);
    }

    parsed.set(arg, value);
    index += 1;
  }

  const targetPath = parsed.get("--target");
  const sourceLabel = parsed.get("--source-label");
  if (!targetPath) throw new Error("--target is required.");
  if (!sourceLabel) throw new Error("--source-label is required.");

  return { sourceLabel, targetPath };
}

async function main() {
  const { sourceLabel, targetPath } = parseArgs();
  const result = await runPublicSearchIndexTargetWorker({
    input: process.stdin,
    sourceLabel,
    targetPath,
  });

  process.stdout.write(`${JSON.stringify(result)}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
