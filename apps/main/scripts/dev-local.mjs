import { createServer } from "node:net";
import path from "node:path";
import { createIntegrationRuntime, appRoot } from "./integration-runtime.mjs";
import { assertAtlasAppReady } from "./atlas-app-readiness.mjs";

async function freePort(port = 0, host = "localhost") {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, resolve);
  });
  const selected = server.address().port;
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  return selected;
}
const args = process.argv.slice(2).filter((arg) => arg !== "--");
let requestedPort = Number(process.env.INTEGRATION_PORT ?? 3000);
for (let i = 0; i < args.length; i += 2) {
  if (args[i] === "--port") requestedPort = Number(args[i + 1]);
  else throw new Error("Usage: pnpm dev:local [--port <port>]");
}
if (
  !Number.isInteger(requestedPort) ||
  requestedPort < 1 ||
  requestedPort >= 65535
)
  throw new Error("The local app port must be from 1 to 65534.");
const appPort = await freePort(requestedPort);
const providerPort = await freePort(0, "127.0.0.1");
const runtime = createIntegrationRuntime({ appPort, providerPort });
let stopped = false;
let forwardedSignal;
const handlers = new Map();
for (const signal of ["SIGINT", "SIGTERM"]) {
  const handler = () => {
    stopped = true;
    forwardedSignal ??= signal;
    runtime.signalChildren(signal);
  };
  handlers.set(signal, handler);
  process.on(signal, handler);
}
async function ready(check, label) {
  const deadline = Date.now() + 120000;
  while (!stopped && Date.now() < deadline) {
    try {
      await check();
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  if (!stopped) throw new Error(`${label} did not become ready.`);
}
try {
  await runtime.prepare();
  if (!stopped) {
    const provider = runtime.run(
      process.execPath,
      [path.join(appRoot, "scripts/run-integration-provider-server.mjs")],
      true,
    );
    provider.then(
      () => {
        stopped = true;
      },
      () => {
        stopped = true;
      },
    );
    await ready(async () => {
      const response = await fetch(`${runtime.providerUrl}/__health`, {
        signal: AbortSignal.timeout(2000),
      });
      if (!response.ok) throw new Error("Provider not ready.");
    }, "Local providers");
    if (!stopped) {
      const app = runtime.run(
        process.execPath,
        [
          path.join(appRoot, "node_modules/next/dist/bin/next"),
          "dev",
          "--hostname",
          "localhost",
          "--port",
          String(appPort),
        ],
        true,
      );
      app.then(
        () => {
          stopped = true;
        },
        () => {
          stopped = true;
        },
      );
      await ready(() => assertAtlasAppReady(runtime.appBaseUrl), "Local app");
      if (!stopped) {
        console.log(`Local app ready: ${runtime.appBaseUrl}`);
        console.log(
          "Synthetic fixture: Integration Seller. Data is removed on shutdown.",
        );
      }
      const code = await Promise.race([app, provider]);
      if (!forwardedSignal) process.exitCode = code || 1;
    } else if (!forwardedSignal) process.exitCode = 1;
  }
} catch (error) {
  if (!forwardedSignal) throw error;
} finally {
  stopped = true;
  await runtime.cleanup();
  for (const [signal, handler] of handlers) process.off(signal, handler);
}
if (forwardedSignal) process.kill(process.pid, forwardedSignal);
