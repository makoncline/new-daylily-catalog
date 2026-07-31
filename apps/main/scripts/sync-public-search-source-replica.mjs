import { writeSync } from "node:fs";
import { createClient } from "@libsql/client";

function getSourcePath(args = process.argv.slice(2)) {
  if (args.length !== 2 || args[0] !== "--source" || !args[1]) {
    throw new Error(
      "Usage: sync-public-search-source-replica.mjs --source PATH",
    );
  }

  return args[1];
}

async function syncSourceReplica() {
  const sourcePath = getSourcePath();
  const syncUrl = process.env.DATABASE_URL;
  const authToken = process.env.TURSO_DATABASE_AUTH_TOKEN;

  if (!syncUrl?.startsWith("libsql://")) {
    throw new Error("DATABASE_URL must be a libsql:// URL.");
  }
  if (!authToken) {
    throw new Error("TURSO_DATABASE_AUTH_TOKEN is required.");
  }

  const client = createClient({
    authToken,
    syncUrl,
    url: `file:${sourcePath}`,
  });
  const startedAt = performance.now();

  try {
    const syncResult = await client.sync();
    let check;
    try {
      check = await client.execute("PRAGMA quick_check;");
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      if (
        /database disk image is malformed|file is not a database|malformed database schema/i.test(
          detail,
        )
      ) {
        throw new Error(
          `Source replica post_sync_client quick_check failed: ${detail}`,
        );
      }
      throw error;
    }

    const clientQuickCheck = check.rows
      .map((row) =>
        typeof row.quick_check === "string" ? row.quick_check : "",
      )
      .filter(Boolean)
      .join("\n");

    if (clientQuickCheck !== "ok") {
      throw new Error(
        `Source replica post_sync_client quick_check failed: ${clientQuickCheck}`,
      );
    }

    return {
      clientQuickCheck,
      durationMs: Math.round(performance.now() - startedAt),
      frameNumber: syncResult?.frame_no ?? null,
      framesSynced: syncResult?.frames_synced ?? null,
      pid: process.pid,
    };
  } finally {
    client.close();
  }
}

syncSourceReplica().then(
  (result) => {
    writeSync(process.stdout.fd, `${JSON.stringify(result)}\n`);
    process.exit(0);
  },
  (error) => {
    const detail =
      error instanceof Error ? (error.stack ?? error.message) : String(error);
    writeSync(process.stderr.fd, `${detail}\n`);
    process.exit(1);
  },
);
