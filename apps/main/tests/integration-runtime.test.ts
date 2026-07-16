import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  FORBIDDEN_SERVICE_ENV,
  validateIntegrationRuntime,
} from "../scripts/integration-network-guard.mjs";
import { seedIntegrationData } from "../scripts/seed-integration-data.mjs";

const appRoot = path.resolve(import.meta.dirname, "..");
const guardUrl = pathToFileURL(
  path.join(appRoot, "scripts", "integration-network-guard.mjs"),
).href;
const safeDatabaseUrl = `file:${path.join(
  appRoot,
  "tests",
  ".tmp",
  "integration-runtime.sqlite",
)}`;

const safeRuntime = {
  appRoot,
  nodeEnv: "test",
  integrationMode: "1",
  appBaseUrl: "http://localhost:3210",
  databaseUrl: safeDatabaseUrl,
  env: {
    CLERK_SECRET_KEY: "sk_test_integration",
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_integration",
    STRIPE_SECRET_KEY: "sk_test_integration",
  },
};

function integrationSubprocessEnv(
  inheritedEnv: NodeJS.ProcessEnv = process.env,
) {
  const env = { ...inheritedEnv };
  for (const name of FORBIDDEN_SERVICE_ENV) delete env[name];
  return {
    ...env,
    NODE_ENV: "test",
    INTEGRATION_MODE: "1",
    INTEGRATION_NETWORK_GUARD: "1",
    APP_BASE_URL: safeRuntime.appBaseUrl,
    DATABASE_URL: safeRuntime.databaseUrl,
    CLERK_SECRET_KEY: "sk_test_integration",
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_integration",
    STRIPE_SECRET_KEY: "sk_test_integration",
  };
}

function runWithGuard(
  code: string,
  inheritedEnv: NodeJS.ProcessEnv = process.env,
) {
  return spawnSync(
    process.execPath,
    ["--import", guardUrl, "--input-type=module", "--eval", code],
    {
      cwd: appRoot,
      env: integrationSubprocessEnv(inheritedEnv),
      encoding: "utf8",
    },
  );
}

describe("offline integration runtime", () => {
  it("accepts only an explicit loopback runtime with a disposable database", () => {
    expect(() => validateIntegrationRuntime(safeRuntime)).not.toThrow();

    for (const unsafe of [
      { integrationMode: "0" },
      { nodeEnv: "production" },
      { appBaseUrl: "https://daylilycatalog.com" },
      { appBaseUrl: "http://0.0.0.0:3210" },
      { databaseUrl: "libsql://production-db.turso.io" },
      { databaseUrl: "file:/tmp/outside-integration.sqlite" },
      { env: { ...safeRuntime.env, CLERK_SECRET_KEY: "sk_live_clerk" } },
      {
        env: { ...safeRuntime.env, STRIPE_WEBHOOK_SECRET: "whsec_live" },
      },
      {
        env: {
          ...safeRuntime.env,
          TURSO_DATABASE_AUTH_TOKEN: "real-token",
        },
      },
    ]) {
      expect(() =>
        validateIntegrationRuntime({ ...safeRuntime, ...unsafe }),
      ).toThrow();
    }
  });

  it("blocks outbound server requests and names each URL", () => {
    const attempts = [
      {
        code: 'await fetch("https://example.com/fetch")',
        url: "https://example.com/fetch",
      },
      {
        code: 'import https from "node:https"; https.get("https://example.com/https")',
        url: "https://example.com/https",
      },
      {
        code: 'import https from "node:https"; https.get(new URL("https://localhost/allowed"), { hostname: "example.com", path: "/overridden" })',
        url: "https://example.com/overridden",
      },
      {
        code: 'new WebSocket("wss://example.com/socket")',
        url: "wss://example.com/socket",
      },
    ];

    for (const attempt of attempts) {
      const result = runWithGuard(attempt.code);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain(
        `Blocked outbound integration request: ${attempt.url}`,
      );
    }
  });

  it("does not inherit real-service credentials in guard subprocesses", () => {
    const result = runWithGuard('await fetch("https://example.com/fetch")', {
      ...process.env,
      AWS_ACCESS_KEY_ID: "inherited-real-credential",
      TURSO_DATABASE_AUTH_TOKEN: "inherited-real-token",
    });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(
      "Blocked outbound integration request: https://example.com/fetch",
    );
    expect(result.stderr).not.toContain("Integration mode refuses");
  });

  it("seeds the same minimal seller state into independent databases", async () => {
    const tempRoot = path.join(appRoot, "tests", ".tmp");
    const templatePath = path.join(
      tempRoot,
      `integration-seed-template-${process.pid}.sqlite`,
    );
    const databasePaths = ["a", "b"].map((suffix) =>
      path.join(tempRoot, `integration-seed-${process.pid}-${suffix}.sqlite`),
    );
    fs.mkdirSync(tempRoot, { recursive: true });
    fs.rmSync(templatePath, { force: true });

    const schemaResult = spawnSync(
      path.join(appRoot, "node_modules", ".bin", "prisma"),
      ["db", "push"],
      {
        cwd: appRoot,
        env: {
          ...process.env,
          RUST_LOG: "info",
          DATABASE_URL: `file:${templatePath}`,
        },
        encoding: "utf8",
      },
    );
    expect(schemaResult.status, schemaResult.stderr).toBe(0);

    try {
      const snapshots = [];
      for (const databasePath of databasePaths) {
        fs.copyFileSync(templatePath, databasePath);
        const databaseUrl = `file:${databasePath}`;
        await seedIntegrationData(databaseUrl);

        const db = new PrismaClient({
          adapter: new PrismaLibSql(
            { url: databaseUrl },
            { timestampFormat: "unixepoch-ms" },
          ),
        });
        try {
          snapshots.push(
            await db.$queryRawUnsafe<Array<{ value: string }>>(`
              SELECT 'user:' || id || ':' || clerkUserId AS value FROM User
              UNION ALL SELECT 'profile:' || id || ':' || slug FROM UserProfile
              UNION ALL SELECT 'cultivar:' || id || ':' || normalizedName FROM CultivarReference
              UNION ALL SELECT 'listing:' || id || ':' || title FROM Listing
              ORDER BY value
            `),
          );
        } finally {
          await db.$disconnect();
        }
      }

      expect(snapshots[0]).toEqual(snapshots[1]);
      expect(snapshots[0]?.map(({ value }) => value)).toEqual([
        "cultivar:integration-cultivar-reference:integration bloom",
        "listing:integration-existing-listing:Existing Bloom",
        "profile:integration-profile:integration-seller",
        "user:integration-user:user_integration_seller",
      ]);
    } finally {
      for (const databasePath of [templatePath, ...databasePaths]) {
        fs.rmSync(databasePath, { force: true });
      }
    }
  }, 30_000);
});
