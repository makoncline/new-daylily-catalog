// @vitest-environment node
import { spawn, type ChildProcess } from "node:child_process";
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
  for (const script of ["with-env.mjs", "realistic-data-snapshot.mjs"])
    copyFileSync(
      path.join(actualAppRoot, "scripts", script),
      path.join(appRoot, "scripts", script),
    );
  symlinkSync(
    path.join(actualAppRoot, "node_modules"),
    path.join(appRoot, "node_modules"),
  );
  writeFileSync(path.join(appRoot, "package.json"), '{"type":"module"}');
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
      env: { ...process.env, DATABASE_URL: options.databaseUrl ?? "" },
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
    await expect.poll(run.stdout).toContain("TREE ");
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
