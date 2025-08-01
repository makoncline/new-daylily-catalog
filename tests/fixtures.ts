import { test as base, expect } from "@playwright/test";
import { spawn } from "child_process";
import { PrismaClient } from "@prisma/client";
import { createTestDatabase, setupTestDatabase, waitForServer, killProcessOnPort, TEST_USER } from "./test-utils";

export const test = base.extend<{ 
  db: PrismaClient; 
  serverUrl: string;
  testUser: typeof TEST_USER;
}>({
  serverUrl: [
    async ({}, use, testInfo) => {
      const port = 3000;
      const serverUrl = `http://localhost:${port}`;
      
      // Create isolated test database
      const { databaseUrl, cleanup } = await createTestDatabase();
      
      try {
        // Kill any existing process on port
        await killProcessOnPort(port);
        
        // Setup database with schema and seed data
        await setupTestDatabase(databaseUrl);
        
        // Start the development server with test database
        const server = spawn("npm", ["run", "dev:no-tunnel"], {
          env: {
            ...process.env,
            LOCAL_DATABASE_URL: databaseUrl,
            PORT: port.toString(),
            SKIP_ENV_VALIDATION: "true",
            // Disable tunnel for tests
            NODE_ENV: "test",
          },
          stdio: "pipe",
        });
        
        // Wait for Next.js to be ready
        let serverReady = false;
        server.stdout?.on("data", (data: Buffer) => {
          const output = data.toString();
          if (output.includes("Local:") || output.includes("Ready") || output.includes("started server")) {
            serverReady = true;
          }
        });
        
        server.stderr?.on("data", (data: Buffer) => {
          const output = data.toString();
          if (output.includes("Local:") || output.includes("Ready") || output.includes("started server")) {
            serverReady = true;
          }
        });
        
        // Wait for server to be ready
        const start = Date.now();
        while (!serverReady && Date.now() - start < 60000) {
          await new Promise((r) => setTimeout(r, 500));
        }
        
        if (!serverReady) {
          throw new Error("Server failed to start within timeout");
        }
        
        // Additional check that server is responding
        await waitForServer(serverUrl);
        
        await use(serverUrl);
        
        // Clean up server
        server.kill("SIGTERM");
        await new Promise((r) => setTimeout(r, 2000));
        server.kill("SIGKILL");
        await killProcessOnPort(port);
        
      } finally {
        await cleanup();
      }
    },
    { scope: "test" },
  ],

  db: async ({ serverUrl }, use) => {
    // This will use the same database as the server
    // We'll create a separate client for direct database access in tests
    const { databaseUrl, cleanup } = await createTestDatabase();
    await setupTestDatabase(databaseUrl);
    
    const prisma = new PrismaClient({
      datasources: { db: { url: databaseUrl } },
    });
    
    try {
      await use(prisma);
    } finally {
      await prisma.$disconnect();
      await cleanup();
    }
  },

  testUser: async ({}, use) => {
    await use(TEST_USER);
  },
  
  page: async ({ page, serverUrl }, use) => {
    // Override the page's goto method to use the dynamic server URL
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