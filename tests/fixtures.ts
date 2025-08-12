import { test as base } from "@playwright/test";
import { spawn } from "child_process";
import { PrismaClient } from "@prisma/client";
import {
  createTestDatabase,
  setupTestDatabase,
  waitForServer,
  killProcessOnPort,
  TEST_USER,
} from "./test-utils";

/**
 * Custom Playwright fixtures used across the E2E test suite.
 *
 * Key goals:
 * 1. A **single** deterministic SQLite database is created **once per worker**
 *    and shared between the Next.js server and the `db` fixture. This removes
 *    the double-database bug where the UI wrote to DB #1 while assertions were
 *    performed against DB #2.
 * 2. Next.js is started **once per worker** (scope: "worker") to keep perfect
 *    isolation without paying the cost of a full boot before every individual
 *    test. If you need stricter isolation you can always switch the scope back
 *    to "test".
 */
export const test = base.extend<
  {
    /** Direct PrismaClient connected to the isolated test database. */
    db: PrismaClient;
    /** Convenience re-export of the seeded Clerk test user. */
    testUser: typeof TEST_USER;
  },
  {
    /** The SQLite connection URL of the isolated test database. */
    databaseUrl: string;
    /** Root URL of the started Next.js dev server (e.g. http://localhost:3000) */
    serverUrl: string;
  }
>({
  //--------------------------------------------------------------------------
  // databaseUrl – create the database **once per worker** and seed it
  //--------------------------------------------------------------------------
  databaseUrl: [
    async ({}, use) => {
      const { databaseUrl, cleanup } = await createTestDatabase();
      try {
        await setupTestDatabase(databaseUrl);
        await use(databaseUrl);
      } finally {
        // Always clean up the temporary SQLite file when the worker exits
        await cleanup();
      }
    },
    { scope: "worker" },
  ],

  //--------------------------------------------------------------------------
  // serverUrl – start Next.js pointing at the same database
  //--------------------------------------------------------------------------
  serverUrl: [
    async ({ databaseUrl }, use) => {
      const port = Number(process.env.PORT ?? 3000);
      const serverUrl = `http://localhost:${port}`;

      // Make sure the port is free first (especially important on CI)
      await killProcessOnPort(port);

      // Boot Next.js in dev mode without the Cloudflare tunnel
      const server = spawn("npm", ["run", "dev"], {
        env: {
          ...process.env,
          LOCAL_DATABASE_URL: databaseUrl,
          PORT: port.toString(),
          SKIP_ENV_VALIDATION: "true",
          NODE_ENV: "test",
        },
        stdio: "pipe",
      });

      // Wait for the HTTP endpoint instead of relying on logs (works better on CI)
      await waitForServer(serverUrl, 120_000);

      // ✅ The server is up – expose the URL to the test and continue
      await use(serverUrl);

      // -------------------------------------------------------------------
      // Teardown – kill the dev server and free the port
      // -------------------------------------------------------------------
      server.kill("SIGTERM");
      await new Promise((r) => setTimeout(r, 2_000));
      server.kill("SIGKILL");
      await killProcessOnPort(port);
    },
    { scope: "worker" },
  ],

  //--------------------------------------------------------------------------
  // db – lightweight Prisma client connected to the same database
  //--------------------------------------------------------------------------
  db: async ({ databaseUrl }, use) => {
    const prisma = new PrismaClient({
      datasources: { db: { url: databaseUrl } },
    });
    try {
      await use(prisma);
    } finally {
      await prisma.$disconnect();
    }
  },

  //--------------------------------------------------------------------------
  // testUser – helper to avoid importing TEST_USER everywhere
  //--------------------------------------------------------------------------
  testUser: async ({}, use) => {
    await use(TEST_USER);
  },

  //--------------------------------------------------------------------------
  // page – monkey-patch page.goto to automatically prepend the server URL so
  // tests can use relative paths like page.goto("/dashboard")
  //--------------------------------------------------------------------------
  page: async ({ page, serverUrl }, use) => {
    const originalGoto = page.goto.bind(page);
    page.goto = async (
      url: string,
      options?: Parameters<typeof page.goto>[1],
    ) => {
      const fullUrl = url.startsWith("http") ? url : `${serverUrl}${url}`;
      return originalGoto(fullUrl, options);
    };

    await use(page);
  },
});

export { expect } from "@playwright/test";
