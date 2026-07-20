import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const appRoot = path.resolve(import.meta.dirname, "..");
const prepareScript = path.join(
  appRoot,
  "scripts",
  "prepare-prod-like-local-smoke.mjs",
);

function run(command: string, args: string[], cwd: string) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
  });
  expect(result.status, result.stderr).toBe(0);
  return result;
}

describe("prod-like local smoke preparer", () => {
  it("disables Sentry and uses a local Docker release", () => {
    const repoRoot = mkdtempSync(path.join(os.tmpdir(), "prod-like-smoke-"));
    const tempAppRoot = path.join(repoRoot, "apps", "main");

    try {
      mkdirSync(path.join(tempAppRoot, "scripts"), { recursive: true });
      mkdirSync(path.join(tempAppRoot, "prisma"), { recursive: true });
      copyFileSync(
        prepareScript,
        path.join(tempAppRoot, "scripts", path.basename(prepareScript)),
      );
      writeFileSync(
        path.join(tempAppRoot, ".env.production"),
        'APP_BASE_URL="https://example.com"\nSENTRY_AUTH_TOKEN="secret"\n',
      );
      writeFileSync(
        path.join(tempAppRoot, "prisma", "local-prod-copy-daylily-catalog.db"),
        "test database",
      );

      run(
        process.execPath,
        [
          "scripts/prepare-prod-like-local-smoke.mjs",
          "--skip-env-pull",
          "--skip-tunnel-config",
        ],
        tempAppRoot,
      );

      expect(
        readFileSync(
          path.join(tempAppRoot, "local", "compose.prod-like.override.yaml"),
          "utf8",
        ),
      ).toContain("GIT_COMMIT_SHA: prod-like-local");
      expect(
        readFileSync(path.join(tempAppRoot, ".env.production"), "utf8"),
      ).toContain(
        'NEXT_PUBLIC_SENTRY_ENABLED="false"\nSENTRY_ENVIRONMENT="prod-like"',
      );
      expect(
        readFileSync(path.join(tempAppRoot, ".env.production"), "utf8"),
      ).toContain('# SENTRY_AUTH_TOKEN="secret"');
      expect(
        readFileSync(
          path.join(tempAppRoot, "local", ".env.production.build"),
          "utf8",
        ),
      ).toContain('SENTRY_SOURCEMAPS_DISABLED="1"');
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });
});
