import { createTestDatabase, setupTestDatabase } from "../tests/test-utils";
import { spawn } from "child_process";

async function main() {
  const { databaseUrl, cleanup } = await createTestDatabase();

  await setupTestDatabase(databaseUrl);

  const port = process.env.PORT ?? "3000";

  const server = spawn("npm", ["run", "dev"], {
    env: {
      ...process.env,
      LOCAL_DATABASE_URL: databaseUrl,
      PORT: port,
      SKIP_ENV_VALIDATION: "true",
      NODE_ENV: "test",
    },
    stdio: "inherit",
  });

  process.on("SIGINT", async () => {
    server.kill("SIGTERM");
    await cleanup();
    process.exit();
  });

  process.on("SIGTERM", async () => {
    server.kill("SIGTERM");
    await cleanup();
    process.exit();
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
