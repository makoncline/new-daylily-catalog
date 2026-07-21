import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const prepareScript = path.resolve(
  import.meta.dirname,
  "../scripts/prepare-prod-like-local-smoke.mjs",
);

describe("prod-like local smoke preparer", () => {
  it("disables Sentry and uses a local Docker release", () => {
    const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "prodlike-"));
    const tempAppRoot = path.join(repoRoot, "apps", "main");

    try {
      fs.mkdirSync(path.join(tempAppRoot, "scripts"), { recursive: true });
      fs.mkdirSync(path.join(tempAppRoot, "prisma"), { recursive: true });
      fs.copyFileSync(
        prepareScript,
        path.join(tempAppRoot, "scripts", path.basename(prepareScript)),
      );
      fs.writeFileSync(
        path.join(tempAppRoot, ".env.production"),
        'APP_BASE_URL="https://example.com"\nSENTRY_AUTH_TOKEN="secret"\n',
      );
      fs.writeFileSync(
        path.join(tempAppRoot, "prisma", "local-prod-copy-daylily-catalog.db"),
        "test database",
      );

      const result = spawnSync(
        process.execPath,
        [
          "scripts/prepare-prod-like-local-smoke.mjs",
          "--skip-env-pull",
          "--skip-tunnel-config",
        ],
        { cwd: tempAppRoot, encoding: "utf8" },
      );
      expect(result.status, result.stderr).toBe(0);

      const runtimeEnv = fs.readFileSync(
        path.join(tempAppRoot, ".env.production"),
        "utf8",
      );
      expect(
        fs.readFileSync(
          path.join(tempAppRoot, "local", "compose.prod-like.override.yaml"),
          "utf8",
        ),
      ).toContain("GIT_COMMIT_SHA: prod-like-local");
      expect(runtimeEnv).toContain(
        'NEXT_PUBLIC_SENTRY_ENABLED="false"\nSENTRY_ENVIRONMENT="prod-like"',
      );
      expect(runtimeEnv).toContain('# SENTRY_AUTH_TOKEN="secret"');
      expect(
        fs.readFileSync(
          path.join(tempAppRoot, "local", ".env.production.build"),
          "utf8",
        ),
      ).toContain('SENTRY_SOURCEMAPS_DISABLED="1"');
    } finally {
      fs.rmSync(repoRoot, { recursive: true, force: true });
    }
  });
});
