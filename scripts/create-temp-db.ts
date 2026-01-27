import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import {
  ensureLocalTempDbSafety,
  resolveTempDbPath,
  resolveTempDbUrl,
} from "../src/lib/test-utils/e2e-db";

function getNpxCommand() {
  return process.platform === "win32" ? "npx.cmd" : "npx";
}

function runPrismaDbPush(url: string) {
  const args = ["prisma", "db", "push", "--skip-generate"];
  execFileSync(
    getNpxCommand(),
    args,
    {
      stdio: "inherit",
      env: {
        ...process.env,
        NODE_OPTIONS: "",
        LOCAL_DATABASE_URL: url,
      },
    },
  );
}

function removeSqliteFiles(dbPath: string) {
  const targets = [dbPath, `${dbPath}-wal`, `${dbPath}-shm`];
  for (const target of targets) {
    if (fs.existsSync(target)) {
      fs.rmSync(target);
    }
  }
}

function readDbArg() {
  const args = process.argv.slice(2);
  const flagIndex = args.indexOf("--db");
  if (flagIndex !== -1) {
    return args[flagIndex + 1];
  }
  return args[0];
}

async function main() {
  const arg = readDbArg();
  const url = resolveTempDbUrl(arg);
  ensureLocalTempDbSafety(url);
  const dbPath = resolveTempDbPath(arg);
  const resetFile = process.env.TEMP_DB_RESET !== "0";

  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  if (resetFile) {
    removeSqliteFiles(dbPath);
  }

  console.log(`[create-temp-db] Initializing schema at ${dbPath}`);
  runPrismaDbPush(url);
  console.log("[create-temp-db] Done");
}

main().catch((error) => {
  console.error("[create-temp-db] Failed to initialize temp DB:", error);
  process.exitCode = 1;
});
