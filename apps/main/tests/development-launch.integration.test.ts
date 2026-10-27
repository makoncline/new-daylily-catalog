// @vitest-environment node
import { spawn, spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createServer } from "node:net";
import { afterEach, expect, test } from "vitest";

const appRoot = path.resolve(import.meta.dirname, "..");
const directories: string[] = [];
afterEach(() => {
  for (const dir of directories.splice(0))
    rmSync(dir, { recursive: true, force: true });
});
function fixture() {
  const dir = mkdtempSync(path.join(tmpdir(), "daylily-development-"));
  directories.push(dir);
  const app = path.join(dir, "apps/main");
  mkdirSync(path.join(app, "scripts"), { recursive: true });
  mkdirSync(path.join(dir, "bin"));
  for (const name of [
    "with-1password.mjs",
    "with-env.mjs",
    "load-env.mjs",
    "development-keys.mjs",
  ])
    copyFileSync(
      path.join(appRoot, "scripts", name),
      path.join(app, "scripts", name),
    );
  writeFileSync(
    path.join(app, "scripts/1password-development.json"),
    JSON.stringify({
      environmentId: "development-fixture",
      cliVersion: "2.41.1",
    }),
  );
  symlinkSync(
    path.join(appRoot, "node_modules"),
    path.join(app, "node_modules"),
  );
  symlinkSync(
    path.resolve(appRoot, "../../node_modules"),
    path.join(dir, "node_modules"),
  );
  writeFileSync(
    path.join(dir, "package.json"),
    JSON.stringify({
      name: "trial-fixture",
      private: true,
      packageManager: "pnpm@9.12.0",
      type: "module",
      scripts: { "secrets:dev": "node apps/main/scripts/with-1password.mjs" },
    }),
  );
  writeFileSync(
    path.join(dir, "pnpm-workspace.yaml"),
    'packages:\n  - "apps/*"\n',
  );
  writeFileSync(
    path.join(app, "package.json"),
    JSON.stringify({
      name: "@daylily-catalog/main",
      type: "module",
      scripts: { probe: "node probe.mjs" },
    }),
  );
  writeFileSync(
    path.join(app, ".env.development"),
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_development\nAPP_BASE_URL=http://localhost:3450\nOP_SERVICE_ACCOUNT_TOKEN=retired-file-token\n",
  );
  writeFileSync(
    path.join(app, ".env.production"),
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_conflict\n",
  );
  writeFileSync(
    path.join(dir, ".env.development"),
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_retired_root\n",
  );
  const op = `#!${process.execPath}\nimport {spawnSync} from 'node:child_process';import fs from 'node:fs';import assert from 'node:assert/strict';
if(process.argv[2]==='--version'){console.log(process.env.FAKE_VERSION??'2.41.1');process.exit(0);}
assert.deepEqual(process.argv.slice(2,6),['run','--environment','development-fixture','--']);
fs.writeFileSync('op-called','yes');if(process.env.FAKE_FAILURE)process.exit(23);
assert.equal(process.env.OP_SERVICE_ACCOUNT_TOKEN,'dummy-bootstrap');
const result=spawnSync(process.argv[6],process.argv.slice(7),{stdio:'inherit',env:{...process.env,CLERK_SECRET_KEY:process.env.FAKE_CLERK??'sk_test_clerk',STRIPE_SECRET_KEY:'sk_test_stripe'}});process.exit(result.status??1);`;
  writeFileSync(path.join(dir, "bin/op"), op, { mode: 0o755 });
  mkdirSync(path.join(dir, ".tmp/tools"), { recursive: true });
  symlinkSync(path.join(dir, "bin/op"), path.join(dir, ".tmp/tools/op"));
  const baseEnv: NodeJS.ProcessEnv = {
    ...process.env,
    PATH: `${path.join(dir, "bin")}:${process.env.PATH}`,
    NODE_ENV: "production",
    OP_SERVICE_ACCOUNT_TOKEN: "dummy-bootstrap",
    DATABASE_URL: "file:caller-owned.sqlite",
  };
  for (const name of [
    "__NEXT_PROCESSED_ENV",
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    "CLERK_SECRET_KEY",
    "STRIPE_SECRET_KEY",
    "DAYLILY_SECRET_STAGE",
  ])
    delete baseEnv[name];
  const run = (
    args: string[],
    extra: Record<string, string | undefined> = {},
    cwd = dir,
  ) =>
    spawnSync(
      process.execPath,
      [path.join(app, "scripts/with-1password.mjs"), "--", ...args],
      { cwd, env: { ...baseEnv, ...extra }, encoding: "utf8" },
    );
  return { dir, app, run, baseEnv };
}

test("Development pairs public and secret keys in production mode, preserves arguments and caller DB, and removes the bootstrap token before Turbo", () => {
  const f = fixture();
  const direct = f.run(
    [
      process.execPath,
      "-e",
      "require('node:assert/strict').deepEqual(process.argv.slice(1), ['argument with spaces', '$literal']); console.log('DIRECT PASSED')",
      "argument with spaces",
      "$literal",
    ],
    {},
    f.app,
  );
  expect(direct.status, direct.stderr).toBe(0);
  expect(direct.stdout).toContain("DIRECT PASSED");
  const packageCommand = spawnSync(
    "pnpm",
    [
      "secrets:dev",
      "--",
      process.execPath,
      "-e",
      "console.log('PACKAGE PASSED')",
    ],
    { cwd: f.dir, env: f.baseEnv, encoding: "utf8" },
  );
  expect(packageCommand.status, packageCommand.stderr).toBe(0);
  expect(packageCommand.stdout).toContain("PACKAGE PASSED");
  const turbo = JSON.parse(
    readFileSync(path.resolve(appRoot, "../../turbo.json"), "utf8"),
  );
  turbo.tasks.probe = { cache: false };
  writeFileSync(path.join(f.dir, "turbo.json"), JSON.stringify(turbo));
  writeFileSync(
    path.join(f.app, "probe.mjs"),
    `import assert from 'node:assert/strict';
assert.equal(process.env.OP_SERVICE_ACCOUNT_TOKEN,undefined);
assert.equal(process.env.NODE_ENV,'production');
assert.equal(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,'pk_test_development');
assert.equal(process.env.CLERK_SECRET_KEY,'sk_test_clerk');
assert.equal(process.env.STRIPE_SECRET_KEY,'sk_test_stripe');
assert.equal(process.env.DATABASE_URL,'file:caller-owned.sqlite');
for(const name of ['R2_SECRET_ACCESS_KEY','OPENAI_IMAGE_MODERATION_API_KEY','SEARCH_INDEX_CANDIDATE_TOKEN','TURSO_EMBEDDED_REPLICA_URL'])assert.equal(process.env[name],'dummy-propagated');
assert.deepEqual(process.argv.slice(2),['argument with spaces','literal']);
console.log('PROBE PASSED');process.exitCode=7;`,
  );
  const result = f.run(
    [
      "pnpm",
      "exec",
      "turbo",
      "run",
      "probe",
      "--filter=@daylily-catalog/main",
      "--",
      "argument with spaces",
      "literal",
    ],
    Object.fromEntries(
      [
        "R2_SECRET_ACCESS_KEY",
        "OPENAI_IMAGE_MODERATION_API_KEY",
        "SEARCH_INDEX_CANDIDATE_TOKEN",
        "TURSO_EMBEDDED_REPLICA_URL",
      ].map((name) => [name, "dummy-propagated"]),
    ),
  );
  expect(result.stdout + result.stderr).toContain("PROBE PASSED");
  expect(result.status).toBe(7);
  const hash = (settings: Record<string, string>) => {
    const dry = spawnSync(
      "pnpm",
      [
        "exec",
        "turbo",
        "run",
        "probe",
        "--filter=@daylily-catalog/main",
        "--dry=json",
      ],
      {
        cwd: f.dir,
        env: {
          ...f.baseEnv,
          DAYLILY_SECRET_STAGE: "development",
          R2_PUBLIC_BASE_URL: "https://media-a.example.test",
          ...settings,
        },
        encoding: "utf8",
      },
    );
    expect(dry.status, dry.stderr).toBe(0);
    return JSON.parse(dry.stdout).tasks[0].hash;
  };
  const initialHash = hash({});
  expect(hash({ R2_PUBLIC_BASE_URL: "https://media-b.example.test" })).not.toBe(
    initialHash,
  );
  expect(hash({ DAYLILY_SECRET_STAGE: "other-stage" })).not.toBe(initialHash);
}, 30000);

test("failed fetch, unstable CLI, and live credentials prevent the target command", () => {
  const f = fixture();
  for (const extra of [
    { FAKE_FAILURE: "1" },
    { FAKE_VERSION: "2.41.1-beta.1" },
    { FAKE_CLERK: "sk_live_rejected" },
    { NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_live_rejected" },
  ]) {
    const result = f.run(
      [process.execPath, "-e", "console.log('TARGET STARTED')"],
      extra,
    );
    expect(result.status).not.toBe(0);
    expect(result.stdout).not.toContain("TARGET STARTED");
  }
});

test("standalone loading honors app-local overrides and test mode without contacting 1Password", () => {
  const f = fixture();
  writeFileSync(
    path.join(f.app, ".env.development.local"),
    "ORDINARY_SETTING=local\n",
  );
  writeFileSync(path.join(f.app, ".env.local"), "TEST_SETTING=must-not-load\n");
  writeFileSync(path.join(f.app, ".env.test"), "TEST_SETTING=test-default\n");
  for (const stage of ["development", "test"] as const) {
    const code =
      stage === "test"
        ? "require('node:assert/strict').equal(process.env.TEST_SETTING,'test-default')"
        : "require('node:assert/strict').equal(process.env.ORDINARY_SETTING,'local')";
    const result = spawnSync(
      process.execPath,
      [
        path.join(f.app, "scripts/with-env.mjs"),
        "--env",
        stage,
        "--",
        process.execPath,
        "-e",
        code,
      ],
      { cwd: f.app, env: { ...f.baseEnv, NODE_ENV: stage }, encoding: "utf8" },
    );
    expect(result.status, result.stderr).toBe(0);
  }
  const repeated = spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `
    import {loadAppEnv} from ${JSON.stringify(path.join(f.app, "scripts/load-env.mjs"))};
    import assert from 'node:assert/strict';
    loadAppEnv('development');
    process.env.DATABASE_URL='file:playwright-created.sqlite';
    process.env.CLERK_TESTING_TOKEN='synthetic-testing-token';
    loadAppEnv('development');
    assert.equal(process.env.DATABASE_URL,'file:playwright-created.sqlite');
    assert.equal(process.env.CLERK_TESTING_TOKEN,'synthetic-testing-token');
  `,
    ],
    {
      cwd: f.app,
      env: { ...f.baseEnv, NODE_ENV: "development" },
      encoding: "utf8",
    },
  );
  expect(repeated.status, repeated.stderr).toBe(0);
  expect(existsSync(path.join(f.dir, "op-called"))).toBe(false);
});

test("shutdown forwards the received signal and stops the owned command tree", async () => {
  const f = fixture();
  const child = spawn(
    process.execPath,
    [
      path.join(f.app, "scripts/with-1password.mjs"),
      "--",
      process.execPath,
      "-e",
      `
    const {spawn}=require('node:child_process');
    spawn(process.execPath,['-e','const server=require("node:net").createServer();server.listen(0,"127.0.0.1",()=>console.log("RUNNING "+server.address().port));'],{stdio:'inherit'});
    setInterval(()=>{},1000);
  `,
    ],
    { cwd: f.dir, env: f.baseEnv, stdio: ["ignore", "pipe", "pipe"] },
  );
  let stdout = "";
  child.stdout.on("data", (chunk) => {
    stdout += chunk.toString();
  });
  const closed = new Promise<{
    code: number | null;
    signal: NodeJS.Signals | null;
  }>((resolve) =>
    child.once("close", (code, signal) => resolve({ code, signal })),
  );
  try {
    await expect.poll(() => stdout, { timeout: 5000 }).toContain("RUNNING ");
  } finally {
    child.kill("SIGTERM");
    expect(await closed).toEqual({ code: null, signal: "SIGTERM" });
  }
  const port = Number(/RUNNING (\d+)/.exec(stdout)?.[1]);
  await expect
    .poll(
      () =>
        new Promise<boolean>((resolve) => {
          const server = createServer();
          server.once("error", () => resolve(false));
          server.listen(port, "127.0.0.1", () =>
            server.close(() => resolve(true)),
          );
        }),
      { timeout: 5000 },
    )
    .toBe(true);
});
