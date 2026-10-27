// @vitest-environment node
import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, expect, test } from "vitest";
import { realisticDataSchemaFingerprint } from "../scripts/realistic-data-snapshot.mjs";

const directories: string[] = [];
const children: ChildProcess[] = [];
afterEach(() => {
  for (const child of children.splice(0)) child.kill("SIGKILL");
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

function fixture() {
  const directory = realpathSync(
    mkdtempSync(path.join(tmpdir(), "realistic-launch-test-")),
  );
  directories.push(directory);
  const appRoot = path.join(directory, "apps/main");
  for (const folder of ["scripts", "prisma", "local/realistic-data"])
    mkdirSync(path.join(appRoot, folder), { recursive: true });
  const actualAppRoot = path.resolve(import.meta.dirname, "..");
  for (const script of [
    "with-env.mjs",
    "load-env.mjs",
    "realistic-data-snapshot.mjs",
  ])
    copyFileSync(
      path.join(actualAppRoot, "scripts", script),
      path.join(appRoot, "scripts", script),
    );
  symlinkSync(
    path.join(actualAppRoot, "node_modules"),
    path.join(appRoot, "node_modules"),
  );
  writeFileSync(path.join(appRoot, "package.json"), '{"type":"module"}');
  writeFileSync(
    path.join(appRoot, ".env.development"),
    "DATABASE_URL=file:file-default.sqlite\n",
  );
  const schemaPath = path.join(appRoot, "prisma/schema.prisma");
  const databasePath = path.join(appRoot, "local/realistic-data/custom.sqlite");
  writeFileSync(schemaPath, "model Listing { id String @id }\n");
  const db = new DatabaseSync(databasePath);
  db.exec(`CREATE TABLE User (id TEXT PRIMARY KEY); CREATE TABLE Listing (id TEXT PRIMARY KEY, userId TEXT REFERENCES User(id), title TEXT, privateNote TEXT);
    INSERT INTO User VALUES ('owner'); INSERT INTO Listing VALUES ('listing', 'owner', 'Original', 'Private retained note');`);
  db.close();
  writeFileSync(
    path.join(appRoot, "local/realistic-data/personas.json"),
    JSON.stringify({
      databasePath,
      schemaFingerprint: realisticDataSchemaFingerprint(schemaPath),
    }),
  );
  return { directory, appRoot, schemaPath, databasePath };
}

type Fixture = ReturnType<typeof fixture>;
function launch(
  f: Fixture,
  code: string,
  options: {
    disposable?: boolean;
    seeded?: boolean;
    databaseUrl?: string;
    command?: string;
    extraArgs?: string[];
  } = {},
) {
  const script = path.join(f.directory, "child.mjs");
  writeFileSync(script, code);
  const child = spawn(
    process.execPath,
    [
      path.join(f.appRoot, "scripts/with-env.mjs"),
      "--env",
      "development",
      ...(options.seeded === false ? [] : ["--seeded-database-default"]),
      "--",
      options.command ?? process.execPath,
      script,
      ...(options.disposable ? ["--disposable"] : []),
      ...(options.extraArgs ?? []),
    ],
    {
      cwd: f.appRoot,
      env: { ...process.env, DATABASE_URL: options.databaseUrl },
      stdio: ["pipe", "pipe", "pipe"],
    },
  );
  children.push(child);
  let stdout = "",
    stderr = "";
  child.stdout?.on("data", (chunk: Buffer) => {
    stdout += chunk.toString();
  });
  child.stderr?.on("data", (chunk: Buffer) => {
    stderr += chunk.toString();
  });
  const exited = new Promise<{
    code: number | null;
    signal: NodeJS.Signals | null;
  }>((resolve) =>
    child.once("close", (code, signal) => resolve({ code, signal })),
  );
  return {
    child,
    exited,
    stdout: () => stdout,
    stderr: () => stderr,
    databasePath: () => /Disposable realistic database: (.+)/.exec(stdout)?.[1],
  };
}

const edit = `import { DatabaseSync } from 'node:sqlite';
 const db = new DatabaseSync(process.env.DATABASE_URL.slice(5));
 console.log(JSON.stringify({before:db.prepare('SELECT title FROM Listing').get().title,linked:db.prepare('SELECT count(*) AS n FROM Listing JOIN User ON User.id=Listing.userId').get().n,note:db.prepare('SELECT privateNote FROM Listing').get().privateNote,args:process.argv.slice(2)}));
 db.exec("UPDATE Listing SET title='Edited'");db.close();`;
const fileHash = (filename: string) =>
  createHash("sha256").update(readFileSync(filename)).digest("hex");

test("default dev resolves the prepared path, persists edits across launches, and rejects stale schema before launch", async () => {
  const f = fixture();
  const first = launch(f, edit);
  expect(await first.exited, first.stderr()).toEqual({ code: 0, signal: null });
  expect(first.stdout()).toContain('"before":"Original"');
  const second = launch(f, edit);
  expect(await second.exited).toEqual({ code: 0, signal: null });
  expect(second.stdout()).toContain('"before":"Edited"');
  writeFileSync(f.schemaPath, "model Listing { id String @id title String }\n");
  const stale = launch(f, "console.log('CHILD STARTED')");
  expect((await stale.exited).code).toBe(1);
  expect(stale.stderr()).toContain("Run `pnpm db:seed:prepare`");
  expect(stale.stdout()).not.toContain("CHILD STARTED");
});

test("disposable dev preserves source relationships and notes, forwards app args, and removes its copy on normal exit", async () => {
  const f = fixture();
  const before = fileHash(f.databasePath);
  const run = launch(f, edit, {
    disposable: true,
    extraArgs: ["--port", "3333"],
  });
  expect(await run.exited, run.stderr()).toEqual({ code: 0, signal: null });
  expect(run.stdout()).toContain(
    '"linked":1,"note":"Private retained note","args":["--port","3333"]',
  );
  expect(existsSync(run.databasePath()!)).toBe(false);
  expect(fileHash(f.databasePath)).toBe(before);
});

test.each(["SIGINT", "SIGTERM"] as const)(
  "%s stops only the owned child tree before removing its database",
  async (signal) => {
    const f = fixture();
    const unrelated = spawn(
      process.execPath,
      ["-e", "setInterval(()=>{},1000)"],
      { stdio: "ignore" },
    );
    children.push(unrelated);
    const run = launch(
      f,
      `import {spawn} from 'node:child_process';
    const grandchild=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'inherit'});
    console.log('TREE '+grandchild.pid);setInterval(()=>{},1000);`,
      { disposable: true },
    );
    await expect.poll(run.stdout, { timeout: 5000 }).toContain("TREE ");
    const databasePath = run.databasePath()!;
    expect(existsSync(databasePath)).toBe(true);
    const pid = Number(/TREE (\d+)/.exec(run.stdout())?.[1]);
    run.child.kill(signal);
    expect(await run.exited, run.stderr()).toEqual({ code: null, signal });
    expect(existsSync(databasePath)).toBe(false);
    await expect
      .poll(() => {
        try {
          process.kill(pid, 0);
          return true;
        } catch {
          return false;
        }
      })
      .toBe(false);
    expect(() => process.kill(unrelated.pid!, 0)).not.toThrow();
  },
);

test("a suspended child is killed after the first shutdown signal before its database is removed", async () => {
  const f = fixture();
  const before = fileHash(f.databasePath);
  const unrelated = spawn(
    process.execPath,
    ["-e", "setInterval(()=>{},1000)"],
    {
      stdio: "ignore",
    },
  );
  children.push(unrelated);
  const run = launch(
    f,
    "process.on('SIGTERM',()=>{console.log('STOPPING');process.kill(process.pid,'SIGSTOP')});console.log('PID '+process.pid);setInterval(()=>{},1000);",
    {
      disposable: true,
    },
  );
  await expect.poll(run.stdout, { timeout: 5_000 }).toContain("PID ");
  const pid = Number(/PID (\d+)/.exec(run.stdout())?.[1]);
  const databasePath = run.databasePath()!;
  try {
    run.child.kill("SIGTERM");
    await expect.poll(run.stdout).toContain("STOPPING");
    await expect
      .poll(() =>
        execFileSync("ps", ["-o", "state=", "-p", String(pid)], {
          encoding: "utf8",
        }),
      )
      .toContain("T");
    run.child.kill("SIGINT");
    expect(existsSync(databasePath)).toBe(true);
    await expect
      .poll(() => run.child.signalCode, { timeout: 8_000 })
      .toBe("SIGTERM");
    expect(await run.exited, run.stderr()).toEqual({
      code: null,
      signal: "SIGTERM",
    });
    expect(() => process.kill(pid, 0)).toThrow();
    expect(existsSync(databasePath)).toBe(false);
    expect(fileHash(f.databasePath)).toBe(before);
    expect(() => process.kill(unrelated.pid!, 0)).not.toThrow();
  } finally {
    try {
      process.kill(-pid, "SIGKILL");
    } catch (error) {
      if (
        !(error instanceof Error && "code" in error && error.code === "ESRCH")
      )
        throw error;
    }
  }
}, 12_000);

test.each([false, true])(
  "permission-denied probes stay bounded and retain the copy when unresolved (%s)",
  async (persistent) => {
    const f = fixture();
    const helper = path.join(f.appRoot, "scripts/realistic-data-snapshot.mjs");
    writeFileSync(
      helper,
      readFileSync(helper, "utf8") +
        `
      const originalKill = process.kill;
      let denials = ${persistent ? "Infinity" : "2"};
      process.kill = function(pid, signal) {
        if (pid < 0 && signal === 0 && denials-- > 0) {
          console.log('PROBE EPERM');
          throw Object.assign(new Error('Injected permission-denied probe'), {code:'EPERM'});
        }
        return originalKill.call(process, pid, signal);
      };`,
    );
    const before = fileHash(f.databasePath);
    const run = launch(
      f,
      `${persistent ? "process.on('SIGTERM',()=>{});" : ""}console.log('PID '+process.pid);setInterval(()=>{},1000);`,
      { disposable: true },
    );
    await expect.poll(run.stdout, { timeout: 5_000 }).toContain("PID ");
    const pid = Number(/PID (\d+)/.exec(run.stdout())?.[1]);
    const databasePath = run.databasePath()!;
    try {
      const started = Date.now();
      run.child.kill("SIGTERM");
      await expect.poll(run.stdout).toContain("PROBE EPERM");
      if (persistent) {
        expect(existsSync(databasePath)).toBe(true);
        expect(() => process.kill(pid, 0)).not.toThrow();
      }
      await expect
        .poll(
          () => run.child.exitCode !== null || run.child.signalCode !== null,
          { timeout: 8_000 },
        )
        .toBe(true);
      if (persistent) {
        expect(run.child.exitCode).toBe(1);
        expect(Date.now() - started).toBeGreaterThanOrEqual(5_000);
      } else
        expect(await run.exited).toEqual({ code: null, signal: "SIGTERM" });
      expect(existsSync(databasePath)).toBe(persistent);
      if (persistent) {
        expect(run.stderr()).toContain(
          "Cannot confirm owned process group termination",
        );
        expect(() => process.kill(pid, 0)).not.toThrow();
      }
      expect(fileHash(f.databasePath)).toBe(before);
    } finally {
      try {
        process.kill(-pid, "SIGKILL");
      } catch (error) {
        if (
          !(error instanceof Error && "code" in error && error.code === "ESRCH")
        )
          throw error;
      }
      await run.exited;
      rmSync(path.dirname(databasePath), { recursive: true, force: true });
    }
  },
  12_000,
);

test("normal child exit retries transient owned-group signal denial before cleanup", async () => {
  const f = fixture();
  const helper = path.join(f.appRoot, "scripts/realistic-data-snapshot.mjs");
  writeFileSync(
    helper,
    readFileSync(helper, "utf8") +
      `
    const originalKill = process.kill;
    let denials = 2;
    process.kill = function(pid, signal) {
      if (pid < 0 && signal !== 0 && denials-- > 0) {
        console.log('SEND EPERM');
        throw Object.assign(new Error('Injected permission-denied signal'), {code:'EPERM'});
      }
      return originalKill.call(process, pid, signal);
    };`,
  );
  const before = fileHash(f.databasePath);
  const run = launch(f, edit, { disposable: true });
  try {
    expect(await run.exited, run.stderr()).toEqual({ code: 0, signal: null });
    expect(run.stdout().match(/SEND EPERM/g)).toHaveLength(2);
    expect(existsSync(run.databasePath()!)).toBe(false);
    expect(fileHash(f.databasePath)).toBe(before);
  } finally {
    if (run.databasePath())
      rmSync(path.dirname(run.databasePath()!), {
        recursive: true,
        force: true,
      });
  }
});

test("an interruption during preparation finishes and removes the copy without starting the app", async () => {
  const f = fixture();
  const helper = path.join(f.appRoot, "scripts/realistic-data-snapshot.mjs");
  writeFileSync(
    helper,
    readFileSync(helper, "utf8").replace(
      "await backup(source, databasePath);",
      `process.stdin.resume();
     console.log("PREPARING " + databasePath);
     await new Promise(resolve => process.once("SIGTERM", resolve));
     process.stdin.pause();
     await backup(source, databasePath);`,
    ),
  );
  const before = fileHash(f.databasePath);
  const run = launch(f, "console.log('APP STARTED')", { disposable: true });
  await expect.poll(run.stdout).toContain("PREPARING ");
  const preparingPath = /PREPARING (.+)/.exec(run.stdout())?.[1];
  if (!preparingPath) throw new Error("Missing preparation path.");
  expect(existsSync(path.dirname(preparingPath))).toBe(true);
  run.child.kill("SIGTERM");
  expect(await run.exited, run.stderr()).toEqual({
    code: null,
    signal: "SIGTERM",
  });
  expect(run.stdout()).not.toContain("APP STARTED");
  expect(existsSync(path.dirname(preparingPath))).toBe(false);
  expect(fileHash(f.databasePath)).toBe(before);
});

test("explicit database and non-seeded commands keep caller ownership without importing SQLite helpers", async () => {
  const f = fixture();
  rmSync(path.join(f.appRoot, "scripts/realistic-data-snapshot.mjs"));
  const code =
    "console.log(process.env.DATABASE_URL);console.log(process.argv.slice(2).join(','));process.exitCode=7;";
  const explicit = launch(f, code, { databaseUrl: "file:caller-owned.sqlite" });
  expect((await explicit.exited).code).toBe(7);
  expect(explicit.stdout()).toContain("file:caller-owned.sqlite");
  const arbitrary = launch(f, code, {
    seeded: false,
    extraArgs: ["--disposable"],
  });
  expect((await arbitrary.exited).code).toBe(7);
  expect(arbitrary.stdout()).toContain("--disposable");
  const conflict = launch(f, code, {
    databaseUrl: "file:caller-owned.sqlite",
    disposable: true,
  });
  expect((await conflict.exited).code).toBe(1);
  expect(conflict.stderr()).toContain("Unset DATABASE_URL");
});

test("failed spawn and failed app exits remove only the disposable copy", async () => {
  const f = fixture();
  const before = fileHash(f.databasePath);
  for (const options of [{ command: "daylily-command-does-not-exist" }, {}]) {
    const run = launch(f, "process.exitCode=9;", {
      ...options,
      disposable: true,
    });
    expect((await run.exited).code).not.toBe(0);
    expect(run.databasePath()).toBeTruthy();
    expect(existsSync(run.databasePath()!)).toBe(false);
    expect(fileHash(f.databasePath)).toBe(before);
  }
});
