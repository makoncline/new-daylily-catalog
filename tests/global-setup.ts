import { execSync } from "child_process";

async function globalSetup() {
  // Initialize test database before running tests
  console.log("🚀 Setting up test environment...");
  execSync("npm run env:test npm run initTestDb", { stdio: "inherit" });
}

export default globalSetup;
