import { createIntegrationRuntime } from "./integration-runtime.mjs";
import { startEvidence } from "./integration-evidence.mjs";
import path from "node:path";

const appRoot = path.resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
const recording = args[0] === "--evidence";
const specs = recording ? args.slice(1) : args;
const runtime = createIntegrationRuntime({
  appPort: Number(process.env.INTEGRATION_PORT ?? "3210"),
});
const evidence = recording ? startEvidence(appRoot, specs) : null;
if (evidence) {
  runtime.env.INTEGRATION_EVIDENCE_DIR = evidence.directory;
  console.log(`Evidence: ${evidence.directory}`);
} else delete runtime.env.INTEGRATION_EVIDENCE_DIR;
let forwardedSignal;
const handlers = new Map();
for (const signal of ["SIGINT", "SIGTERM"]) {
  const handler = () => {
    forwardedSignal ??= signal;
    runtime.signalChildren(signal);
  };
  handlers.set(signal, handler);
  process.on(signal, handler);
}
let exitCode = 1;
try {
  await runtime.prepare();
  if (!forwardedSignal)
    exitCode = await runtime.run(
      path.join(appRoot, "node_modules/.bin/playwright"),
      ["test", "--config", "playwright.integration.config.ts", ...specs],
    );
} catch (error) {
  console.error(error);
} finally {
  await runtime.cleanup();
  for (const [signal, handler] of handlers) process.off(signal, handler);
  if (evidence?.finish(exitCode, forwardedSignal)) {
    console.error("Source changed during recording. Evidence is invalid.");
    exitCode = 1;
  }
}
if (forwardedSignal) process.kill(process.pid, forwardedSignal);
else process.exitCode = exitCode;
