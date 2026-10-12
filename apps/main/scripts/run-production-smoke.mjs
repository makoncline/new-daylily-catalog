#!/usr/bin/env node
import {
  productionSmokeConfig,
  productionSmokePassword,
  SmokePrerequisite,
} from "./production-smoke-config.mjs";

try {
  if (process.argv.length !== 2) {
    throw new SmokePrerequisite(
      "Use pnpm smoke:production without arguments. Keep credentials in private runtime inputs.",
    );
  }
  const config = productionSmokeConfig(process.env);
  const password = productionSmokePassword(process.env);
  delete process.env.DAYLILY_SMOKE_PASSWORD;
  const { runProductionSmoke } = await import(
    "../tests/production/browser-smoke.js"
  );
  await runProductionSmoke(config, password);
} catch (error) {
  console.error(
    error instanceof SmokePrerequisite
      ? error.message
      : "Production smoke stopped. No raw browser error or credential output was saved.",
  );
  process.exitCode = 1;
}
