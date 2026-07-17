// @vitest-environment node

import { execFile } from "node:child_process";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterAll, describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const flagsPath = join(
  tmpdir(),
  `daylily-set-feature-flag-${process.pid}.json`,
);
const scriptPath = join(process.cwd(), "scripts/set-feature-flag.mjs");
const runtimeConfigUrl = `data:application/json,${encodeURIComponent(
  JSON.stringify({
    features: {
      publicCultivarSearch: true,
    },
  }),
)}`;

describe("set-feature-flag script", () => {
  afterAll(() => {
    rmSync(flagsPath, { force: true });
  });

  it("atomically updates an allowlisted flag and reports effective state", async () => {
    writeFileSync(flagsPath, '{"publicCultivarSearch":false,"unchanged":true}');

    const { stdout } = await execFileAsync(
      process.execPath,
      [scriptPath, "publicCultivarSearch", "true"],
      {
        env: {
          ...process.env,
          RUNTIME_CONFIG_URL: runtimeConfigUrl,
          RUNTIME_FEATURE_FLAGS_PATH: flagsPath,
        },
      },
    );

    expect(JSON.parse(readFileSync(flagsPath, "utf8"))).toEqual({
      publicCultivarSearch: true,
      unchanged: true,
    });
    expect(JSON.parse(stdout)).toEqual({
      name: "publicCultivarSearch",
      previousConfigured: false,
      configured: true,
      effective: true,
    });
  });
});
