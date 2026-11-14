// @vitest-environment node
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, expect, test } from "vitest";

const appRoot = path.resolve(import.meta.dirname, "..");
const repoRoot = path.resolve(appRoot, "../..");
const directories: string[] = [];
afterEach(() => {
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

const values = {
  APP_BASE_URL: "https://example.test",
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_fixture",
  NEXT_PUBLIC_CLOUDFLARE_URL: "https://images.example.test",
  NEXT_PUBLIC_SENTRY_ENABLED: "true",
  SENTRY_ENVIRONMENT: "production",
  NEXT_PUBLIC_POSTHOG_KEY: "",
  NEXT_PUBLIC_POSTHOG_HOST: "",
  DATABASE_URL: "file:fixture.db",
  TURSO_DATABASE_AUTH_TOKEN: "fixture'with\nquotes $HOME `id` %",
  STRIPE_SECRET_KEY: "sk_test_fixture",
  SENTRY_AUTH_TOKEN: "fixture-sentry",
};

function workflowRun(event: string) {
  const current = readFileSync(
    path.join(repoRoot, ".github/workflows/pr-docker-image.yml"),
    "utf8",
  );
  return current
    .split("      - name: Write build env")[1]!
    .split("        run: |\n")[1]!
    .split("\n      - uses:")[0]!
    .replace(/^          /gm, "")
    .replaceAll("${{ github.event_name }}", event);
}

function fixture() {
  const directory = mkdtempSync(path.join(tmpdir(), "build-env-"));
  directories.push(directory);
  const fixtureApp = path.join(directory, "apps/main");
  mkdirSync(path.join(fixtureApp, "scripts"), { recursive: true });
  copyFileSync(
    path.join(appRoot, "scripts/write-build-env.mjs"),
    path.join(fixtureApp, "scripts/write-build-env.mjs"),
  );
  symlinkSync(
    path.join(appRoot, "node_modules"),
    path.join(fixtureApp, "node_modules"),
  );
  writeFileSync(path.join(fixtureApp, "package.json"), '{"type":"module"}');
  writeFileSync(
    path.join(fixtureApp, ".env.schema"),
    "# @currentEnv=$APP_ENV\n# @defaultRequired=false\n# @defaultSensitive=false\n# ---\nAPP_ENV=production\n" +
      Object.keys(values)
        .map(
          (name) =>
            `${name === "TURSO_DATABASE_AUTH_TOKEN" ? "# @sensitive\n" : ""}${name}=\n`,
        )
        .join("") +
      "EXTRA_SECRET=fixture-extra\n",
  );
  return {
    directory,
    fixtureApp,
    output: path.join(directory, "daylilycatalog-build.env"),
  };
}

test("renders only build names through varlock and preserves values when Bash sources the file", () => {
  const f = fixture();
  const summary = path.join(f.directory, "summary.md");
  const result = spawnSync("bash", ["-eu", "-c", workflowRun("push")], {
    cwd: f.directory,
    encoding: "utf8",
    env: {
      ...process.env,
      ...values,
      APP_ENV: "development",
      BUILD_ENV_FROM_1PASSWORD: "true",
      BUILD_ENVIRONMENT_NAME: "production",
      RUNNER_TEMP: f.directory,
      GITHUB_OUTPUT: path.join(f.directory, "outputs"),
      DAYLILY_OP_SERVICE_ACCOUNT_TOKEN: "fixture-token",
      GITHUB_ACTIONS: "true",
      GITHUB_STEP_SUMMARY: summary,
      BUILD_APP_BASE_URL: values.APP_BASE_URL,
      BUILD_STRIPE_SECRET_KEY: values.STRIPE_SECRET_KEY,
    },
  });
  expect(result.status, result.stderr).toBe(0);
  expect(result.stderr).toBe("");
  expect(
    result.stdout
      .split("\n")
      .filter(Boolean)
      .every((line) => line.startsWith("::add-mask::")),
  ).toBe(true);
  expect(result.stdout).toContain("::add-mask::fixture-token\n");
  expect(result.stdout).not.toContain("::add-mask::production\n");
  expect(result.stdout).toContain(
    "::add-mask::fixture'with%0Aquotes $HOME `id` %25\n",
  );
  const source = readFileSync(f.output, "utf8");
  expect(source).not.toContain("EXTRA_SECRET");
  expect(source).not.toContain("DAYLILY_OP_SERVICE_ACCOUNT_TOKEN");
  const loaded = JSON.parse(
    execFileSync(
      "bash",
      [
        "-c",
        'set -a; . "$1"; node -e \'process.stdout.write(JSON.stringify(Object.fromEntries(process.argv.slice(1).map(name => [name, process.env[name]]))))\' "${@:2}"',
        "bash",
        f.output,
        ...Object.keys(values),
      ],
      { encoding: "utf8" },
    ),
  );
  expect(loaded).toEqual(values);
  const differenceNames = readFileSync(summary, "utf8")
    .split("\n")
    .filter((line) => line.startsWith("- "));
  expect(differenceNames).toEqual(
    Object.keys(values)
      .filter(
        (name) =>
          ![
            "APP_BASE_URL",
            "STRIPE_SECRET_KEY",
            "SENTRY_ENVIRONMENT",
            "NEXT_PUBLIC_POSTHOG_KEY",
            "NEXT_PUBLIC_POSTHOG_HOST",
          ].includes(name),
      )
      .map((name) => `- ${name}`),
  );
});

test("fails before desktop auth without a token and rejects an empty SENTRY_AUTH_TOKEN", () => {
  const f = fixture();
  const run = (token: string) =>
    spawnSync(process.execPath, ["scripts/write-build-env.mjs", f.output], {
      cwd: f.fixtureApp,
      encoding: "utf8",
      env: {
        ...process.env,
        ...values,
        APP_ENV: "production",
        GITHUB_ACTIONS: "false",
        GITHUB_STEP_SUMMARY: "",
        DAYLILY_OP_SERVICE_ACCOUNT_TOKEN: token,
        SENTRY_AUTH_TOKEN: "",
      },
    });
  const noToken = run("");
  expect(noToken.status).toBe(1);
  expect(noToken.stderr).toContain(
    "DAYLILY_OP_SERVICE_ACCOUNT_TOKEN is required",
  );
  const noSentry = run("fixture-token");
  expect(noSentry.status).toBe(1);
  expect(noSentry.stderr).toContain(
    "Required build env values are empty. SENTRY_AUTH_TOKEN",
  );
  expect(noSentry.stdout).toBe("");
});

test("keeps the legacy workflow output byte-for-byte for PRs and disabled or manual builds", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "legacy-build-env-"));
  directories.push(directory);
  for (const event of ["pull_request", "push", "workflow_dispatch"]) {
    const run = workflowRun(event);
    const env = {
      ...process.env,
      RUNNER_TEMP: directory,
      GITHUB_OUTPUT: path.join(directory, "outputs"),
      BUILD_ENV_FROM_1PASSWORD: "false",
      BUILD_ENVIRONMENT_NAME:
        event === "pull_request" ? "preview" : "production",
      BUILD_APP_BASE_URL: values.APP_BASE_URL,
      BUILD_CLOUDFLARE_URL: values.NEXT_PUBLIC_CLOUDFLARE_URL,
      BUILD_CLERK_PUBLISHABLE_KEY: values.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      BUILD_NEXT_PUBLIC_SENTRY_ENABLED: "",
      BUILD_NEXT_PUBLIC_POSTHOG_KEY: "",
      BUILD_NEXT_PUBLIC_POSTHOG_HOST: "",
      BUILD_DATABASE_URL: values.DATABASE_URL,
      BUILD_TURSO_DATABASE_AUTH_TOKEN: "fixture-turso",
      BUILD_STRIPE_SECRET_KEY: values.STRIPE_SECRET_KEY,
      BUILD_SENTRY_AUTH_TOKEN: event === "pull_request" ? "" : "fixture-sentry",
    };
    const expected = [
      `APP_BASE_URL=${values.APP_BASE_URL}`,
      `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${values.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}`,
      `NEXT_PUBLIC_CLOUDFLARE_URL=${values.NEXT_PUBLIC_CLOUDFLARE_URL}`,
      "NEXT_PUBLIC_SENTRY_ENABLED=",
      `SENTRY_ENVIRONMENT=${env.BUILD_ENVIRONMENT_NAME}`,
      "NEXT_PUBLIC_POSTHOG_KEY=",
      "NEXT_PUBLIC_POSTHOG_HOST=",
      `DATABASE_URL=${values.DATABASE_URL}`,
      "TURSO_DATABASE_AUTH_TOKEN=fixture-turso",
      `STRIPE_SECRET_KEY=${values.STRIPE_SECRET_KEY}`,
      event === "pull_request"
        ? "SENTRY_SOURCEMAPS_DISABLED=1"
        : "SENTRY_AUTH_TOKEN=fixture-sentry",
      "",
    ].join("\n");
    writeFileSync(env.GITHUB_OUTPUT, "");
    execFileSync("bash", ["-eu", "-c", run], { env, cwd: repoRoot });
    expect(
      readFileSync(path.join(directory, "daylilycatalog-build.env"), "utf8"),
    ).toBe(expected);
    expect(readFileSync(env.GITHUB_OUTPUT, "utf8")).toBe(
      [
        `profile=${env.BUILD_ENVIRONMENT_NAME}`,
        `path=${path.join(directory, "daylilycatalog-build.env")}`,
        `fingerprint=${createHash("sha256").update(expected).digest("hex")}`,
        "",
      ].join("\n"),
    );
  }
});

test("loads local production defaults and keeps process env overrides and DATABASE_URL", () => {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    APP_BASE_URL: "https://override.test",
    DATABASE_URL: "file:local.db",
  };
  delete env.AWS_BUCKET_NAME;
  const result = execFileSync(
    process.execPath,
    [
      "scripts/with-env.mjs",
      "--env",
      "production",
      "--",
      process.execPath,
      "-e",
      "console.log(JSON.stringify({base:process.env.APP_BASE_URL,bucket:process.env.AWS_BUCKET_NAME,database:process.env.DATABASE_URL}))",
    ],
    { cwd: appRoot, env, encoding: "utf8" },
  );
  expect(JSON.parse(result)).toEqual({
    base: env.APP_BASE_URL,
    bucket: "daylily-catalog-images",
    database: env.DATABASE_URL,
  });
  expect(
    readFileSync(path.join(appRoot, ".env.production"), "utf8"),
  ).not.toMatch(/^DATABASE_URL=/m);
});
