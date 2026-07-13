import { spawnSync } from "node:child_process";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const appRoot = path.resolve(import.meta.dirname, "..");
const guardUrl = pathToFileURL(
  path.join(appRoot, "scripts", "integration-network-guard.mjs"),
).href;
const safeEnv: NodeJS.ProcessEnv = {
  ...process.env,
  NODE_ENV: "test",
  HERMETIC_MODE: "1",
  APP_BASE_URL: "http://localhost:3200",
  DATABASE_URL: `file:${path.join(appRoot, "tests", ".tmp", "guard.sqlite")}`,
  CLERK_SECRET_KEY: "sk_test_integration",
  STRIPE_SECRET_KEY: "sk_test_integration",
};

function run(code: string) {
  return spawnSync(
    process.execPath,
    ["--import", guardUrl, "--input-type=module", "--eval", code],
    { cwd: appRoot, env: safeEnv, encoding: "utf8" },
  );
}

describe("full-app integration network boundary", () => {
  it("blocks outbound server connections before DNS", () => {
    const result = run(`
      import net from "node:net";
      net.connect({ host: "example.com", port: 443 });
    `);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(
      "Blocked outbound connection to example.com",
    );
  });

  it("blocks server fetch through the same socket boundary", () => {
    const result = run(`
      await fetch("https://example.com");
    `);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("Blocked outbound connection to example.com");
  });

  it("allows loopback connections used by the local app", () => {
    const result = run(`
      import net from "node:net";
      const socket = net.connect({ host: "127.0.0.1", port: 1 });
      socket.on("error", () => process.exit(0));
    `);

    expect(result.status, result.stderr).toBe(0);
  });

  it("refuses to activate without the safe local runtime", () => {
    const result = spawnSync(
      process.execPath,
      ["--import", guardUrl, "--input-type=module", "--eval", "true"],
      {
        cwd: appRoot,
        env: { ...safeEnv, HERMETIC_MODE: "0" },
        encoding: "utf8",
      },
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("Refusing to install");
  });
});
