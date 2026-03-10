import { existsSync, rmSync } from "node:fs";
import path from "node:path";
import { execFileSync, spawn } from "node:child_process";

function getPortListeners(port) {
  try {
    const output = execFileSync("lsof", ["-tiTCP:" + port, "-sTCP:LISTEN"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();

    return output ? output.split(/\s+/u).map(Number) : [];
  } catch {
    return [];
  }
}

async function killPortListeners(port) {
  const listenerPids = getPortListeners(port);
  if (listenerPids.length === 0) {
    return;
  }

  for (const pid of listenerPids) {
    process.kill(pid, "SIGTERM");
  }

  await new Promise((resolve) => setTimeout(resolve, 500));

  for (const pid of getPortListeners(port)) {
    process.kill(pid, "SIGKILL");
  }
}

function removeDevLock() {
  const lockPath = path.join(process.cwd(), ".next", "dev", "lock");
  if (existsSync(lockPath)) {
    rmSync(lockPath, { force: true });
  }
}

if (!process.env.BASE_URL) {
  await killPortListeners(process.env.E2E_PORT ?? "3100");
  removeDevLock();
}

const child = spawn("playwright", ["test", ...process.argv.slice(2)], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});

child.on("error", (error) => {
  console.error(error);
  process.exit(1);
});
