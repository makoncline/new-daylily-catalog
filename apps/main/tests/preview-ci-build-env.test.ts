import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, test } from "vitest";

test("preview build uses only scoped test credentials and rejects other databases", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "preview-build-"));
  const script = path.resolve("scripts/write-preview-ci-build-env.mjs");
  const env = {
    ...process.env,
    RUNNER_TEMP: dir,
    BUILD_APP_BASE_URL: "https://preview.example",
    BUILD_CLOUDFLARE_URL: "https://images.example",
    BUILD_CLERK_PUBLISHABLE_KEY: "pk_test_example",
    BUILD_DATABASE_URL:
      "libsql://seeded-daylily-catalog-makoncline.aws-us-east-1.turso.io",
    STRIPE_SECRET_KEY: "sk_test_example",
    PREVIEW_SEED_TURSO_AUTH_TOKEN: "preview_token",
    OP_SERVICE_ACCOUNT_TOKEN: "bootstrap",
  };
  try {
    expect(spawnSync(process.execPath, [script], { env }).status).toBe(0);
    const output = path.join(dir, "daylilycatalog-build.env");
    const contents = readFileSync(output, "utf8");
    expect(contents).toContain("TURSO_DATABASE_AUTH_TOKEN=preview_token");
    expect(contents).not.toContain("bootstrap");
    expect(statSync(output).mode & 0o777).toBe(0o600);
    rmSync(output);
    expect(
      spawnSync(process.execPath, [script], {
        env: { ...env, BUILD_DATABASE_URL: "libsql://wrong.example" },
      }).status,
    ).not.toBe(0);
    expect(
      spawnSync(process.execPath, [script], {
        env: { ...env, STRIPE_SECRET_KEY: "sk_live_example" },
      }).status,
    ).not.toBe(0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
