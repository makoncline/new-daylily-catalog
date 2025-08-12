import { execSync } from "child_process";
import { randomUUID } from "crypto";
import path from "path";
import fs from "fs/promises";

import { TEST_USER as TEST_USER_CONFIG } from "@/config/test-user";

export const TEST_USER = TEST_USER_CONFIG;

export interface TestDatabaseSetup {
  databaseUrl: string;
  dbFile: string;
  cleanup: () => Promise<void>;
}

/**
 * Creates an isolated SQLite database for testing
 */
export async function createTestDatabase(): Promise<TestDatabaseSetup> {
  const testId = randomUUID();
  const dbFile = path.join(
    process.cwd(),
    "test-results",
    `test-${testId}.sqlite`,
  );
  const databaseUrl = `file:${dbFile}`;

  // Ensure test-results directory exists
  await fs.mkdir(path.dirname(dbFile), { recursive: true });

  const cleanup = async () => {
    try {
      await fs.unlink(dbFile);
    } catch (error) {
      // Ignore cleanup errors
      console.warn(`Failed to cleanup test database: ${String(error)}`);
    }
  };

  return {
    databaseUrl,
    dbFile,
    cleanup,
  };
}

/**
 * Sets up a fresh database with schema and test data
 */
export async function setupTestDatabase(databaseUrl: string): Promise<void> {
  try {
    // Push the schema to create tables
    console.log("📋 Creating database schema...");
    execSync("npx prisma db push --schema=prisma/schema.prisma", {
      env: {
        ...process.env,
        LOCAL_DATABASE_URL: databaseUrl,
        SKIP_ENV_VALIDATION: "true",
      },
      stdio: "pipe", // Suppress output unless there's an error
    });

    // Run the seed script
    console.log("🌱 Seeding test database...");
    execSync("npx tsx prisma/test-seed.ts", {
      env: {
        ...process.env,
        LOCAL_DATABASE_URL: databaseUrl,
        SKIP_ENV_VALIDATION: "true",
      },
      stdio: "pipe", // Suppress output unless there's an error
    });

    console.log("✅ Test database setup complete");
  } catch (error) {
    console.error("❌ Failed to setup test database:", error);
    throw error;
  }
}

/**
 * Waits for a server to be available
 */
export async function waitForServer(
  url: string,
  timeout = 60000,
): Promise<void> {
  const start = Date.now();

  while (Date.now() - start < timeout) {
    try {
      const response = await fetch(url, { method: "HEAD" });
      if (response.ok || response.status === 404) {
        return; // Server is responding
      }
    } catch {
      // Server not ready yet, continue waiting
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(`Server at ${url} did not respond within ${timeout}ms`);
}

/**
 * Kills any process running on the specified port
 */
export async function killProcessOnPort(port: number): Promise<void> {
  try {
    execSync(`lsof -ti:${port} | xargs kill -9`, { stdio: "ignore" });
    // Wait a bit for the process to be fully killed
    await new Promise((resolve) => setTimeout(resolve, 1000));
  } catch {
    // Ignore if no process is running on the port
  }
}
