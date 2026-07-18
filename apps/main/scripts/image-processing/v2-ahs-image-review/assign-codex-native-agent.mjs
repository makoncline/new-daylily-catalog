import { REVIEW_DB_PATH, assignCodexNativeAgent } from "./review-db.mjs";

function getAllArgs(name) {
  const values = [];

  for (let index = 0; index < process.argv.length; index += 1) {
    const arg = process.argv[index];
    const prefix = `${name}=`;

    if (arg.startsWith(prefix)) {
      values.push(arg.slice(prefix.length));
    } else if (arg === name && process.argv[index + 1]) {
      values.push(process.argv[index + 1]);
      index += 1;
    }
  }

  return values;
}

function parsePair(pair) {
  const separatorIndex = pair.indexOf("=");

  if (separatorIndex < 1 || separatorIndex === pair.length - 1) {
    throw new Error(`Invalid --pair value: ${pair}`);
  }

  return {
    id: pair.slice(0, separatorIndex),
    agentId: pair.slice(separatorIndex + 1),
  };
}

const pairs = getAllArgs("--pair").map(parsePair);

if (!pairs.length) {
  console.error(
    "Usage: assign-codex-native-agent.mjs --pair <queue-id>=<subagent-id> [--pair ...]",
  );
  process.exit(1);
}

for (const { id, agentId } of pairs) {
  assignCodexNativeAgent(id, agentId);
  console.log(`[v2-image-review] assigned ${id} -> ${agentId}`);
}

console.log(`[v2-image-review] db=${REVIEW_DB_PATH}`);
