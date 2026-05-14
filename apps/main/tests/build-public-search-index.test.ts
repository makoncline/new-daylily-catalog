// @vitest-environment node

import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const buildScriptPath = path.join(
  process.cwd(),
  "scripts/build-public-search-index.mjs",
);

async function runBuildScript(args: string[], env: Partial<NodeJS.ProcessEnv>) {
  try {
    await execFileAsync(process.execPath, [buildScriptPath, ...args], {
      env: {
        ...process.env,
        ...env,
      },
    });
  } catch (error) {
    return error;
  }

  throw new Error("Expected build script to fail.");
}

describe("build-public-search-index source selection", () => {
  it("requires an explicit source in production", async () => {
    const error = await runBuildScript([], {
      NODE_ENV: "production",
      TURSO_EMBEDDED_REPLICA_URL: "file:/data/turso-replica.db",
    });

    expect(error).toMatchObject({
      stderr: expect.stringContaining(
        "Production search index builds require an explicit --source path",
      ),
    });
  });

  it("refuses to build from the live embedded replica path", async () => {
    const error = await runBuildScript(["--source", "/data/turso-replica.db"], {
      TURSO_EMBEDDED_REPLICA_URL: "file:/data/turso-replica.db",
    });

    expect(error).toMatchObject({
      stderr: expect.stringContaining(
        "Refusing to build search index from live Turso embedded replica",
      ),
    });
  });
});
