import { spawn, spawnSync } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const appRoot = path.resolve(import.meta.dirname, "..");
const backupScript = path.join(appRoot, "scripts", "db-backup.sh");

function run(command: string, args: string[], cwd: string) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
  });
  expect(result.status, result.stderr).toBe(0);
}

describe("database backup script", () => {
  it("atomically restores concurrent worktree snapshots into the primary checkout", async () => {
    const tempRoot = mkdtempSync(path.join(os.tmpdir(), "db-backup-script-"));
    const primaryCheckout = path.join(tempRoot, "primary");
    const linkedWorktrees = ["a", "b"].map((suffix) =>
      path.join(tempRoot, `worktree-${suffix}`),
    );
    const primaryApp = path.join(primaryCheckout, "apps", "main");
    const fakeBin = path.join(tempRoot, "bin");

    try {
      mkdirSync(path.join(primaryApp, "scripts"), { recursive: true });
      mkdirSync(path.join(primaryApp, "prisma"), { recursive: true });
      copyFileSync(
        backupScript,
        path.join(primaryApp, "scripts", "db-backup.sh"),
      );
      writeFileSync(path.join(primaryApp, "prisma", ".gitkeep"), "");

      run("git", ["init", "-b", "main"], primaryCheckout);
      run("git", ["add", "."], primaryCheckout);
      run(
        "git",
        [
          "-c",
          "user.name=Codex Test",
          "-c",
          "user.email=codex@example.com",
          "commit",
          "-m",
          "fixture",
        ],
        primaryCheckout,
      );
      for (const [index, linkedWorktree] of linkedWorktrees.entries()) {
        run(
          "git",
          ["worktree", "add", "-b", `linked-test-${index}`, linkedWorktree],
          primaryCheckout,
        );
      }

      mkdirSync(fakeBin);
      const fakeTurso = path.join(fakeBin, "turso");
      writeFileSync(
        fakeTurso,
        [
          "#!/bin/sh",
          "printf '%s\\n' \\",
          "  'CREATE TABLE Snapshot (value TEXT NOT NULL);' \\",
          "  \"INSERT INTO Snapshot VALUES ('from-prod');\"",
          "",
        ].join("\n"),
      );
      chmodSync(fakeTurso, 0o755);

      const realSqlite = spawnSync("which", ["sqlite3"], {
        encoding: "utf8",
      }).stdout.trim();
      const barrierPath = path.join(tempRoot, "sqlite-barrier");
      const fakeSqlite = path.join(fakeBin, "sqlite3");
      writeFileSync(
        fakeSqlite,
        [
          "#!/bin/sh",
          `printf 'x\\n' >> '${barrierPath}'`,
          `while [ "$(wc -l < '${barrierPath}')" -lt 2 ]; do sleep 0.01; done`,
          `exec '${realSqlite}' "$@"`,
          "",
        ].join("\n"),
      );
      chmodSync(fakeSqlite, 0o755);

      const env: NodeJS.ProcessEnv = {
        ...process.env,
        CI: "false",
        PATH: `${fakeBin}:${process.env.PATH}`,
        TURSO_API_TOKEN: "test-token",
      };
      delete env.TURSO_SNAPSHOT_OUTPUT_DB_PATH;

      const relativeDatabasePath = path.join(
        "apps",
        "main",
        "prisma",
        "local-prod-copy-daylily-catalog.db",
      );
      const primaryDatabase = path.join(primaryCheckout, relativeDatabasePath);
      run(
        realSqlite,
        [primaryDatabase, "CREATE TABLE PreviousSnapshot (value TEXT);"],
        primaryCheckout,
      );
      writeFileSync(`${primaryDatabase}-wal`, "stale WAL");
      writeFileSync(`${primaryDatabase}-shm`, "stale SHM");

      const results = await Promise.all(
        linkedWorktrees.map(
          (linkedWorktree) =>
            new Promise<{ code: number | null; stderr: string }>((resolve) => {
              const child = spawn("bash", ["scripts/db-backup.sh"], {
                cwd: path.join(linkedWorktree, "apps", "main"),
                env,
              });
              let stderr = "";
              child.stderr.on("data", (chunk) => {
                stderr += chunk;
              });
              child.on("close", (code) => resolve({ code, stderr }));
            }),
        ),
      );
      for (const result of results) {
        expect(result.code, result.stderr).toBe(0);
      }

      expect(existsSync(primaryDatabase)).toBe(true);
      expect(existsSync(`${primaryDatabase}.refresh.lock`)).toBe(false);
      expect(existsSync(`${primaryDatabase}-wal`)).toBe(false);
      expect(existsSync(`${primaryDatabase}-shm`)).toBe(false);
      for (const linkedWorktree of linkedWorktrees) {
        expect(
          existsSync(path.join(linkedWorktree, relativeDatabasePath)),
        ).toBe(false);
      }

      const query = spawnSync(
        "sqlite3",
        [primaryDatabase, "SELECT value FROM Snapshot;"],
        { encoding: "utf8" },
      );
      expect(query.status, query.stderr).toBe(0);
      expect(query.stdout.trim()).toBe("from-prod");
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});
