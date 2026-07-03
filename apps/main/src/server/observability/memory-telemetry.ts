import "server-only";

import v8 from "node:v8";

const MEMORY_TELEMETRY_ENABLED_ENV = "MEMORY_TELEMETRY_ENABLED";
const MEMORY_TELEMETRY_STARTED_KEY = Symbol.for(
  "daylily-catalog.memory-telemetry-started",
);
const MEMORY_TELEMETRY_INTERVAL_MS = 60_000;

type MemoryTelemetryEnv = Record<string, string | undefined>;

interface MemoryTelemetryGlobal {
  [MEMORY_TELEMETRY_STARTED_KEY]?: boolean;
}

interface MemoryTelemetryTimer {
  unref?: () => void;
}

interface MemoryTelemetryDeps {
  env?: MemoryTelemetryEnv;
  globalState?: MemoryTelemetryGlobal;
  getHeapSizeLimit?: () => number;
  getMemoryUsage?: () => NodeJS.MemoryUsage;
  getNodeVersion?: () => string;
  getPid?: () => number;
  getTimestamp?: () => string;
  getUptimeSeconds?: () => number;
  log?: (message: string) => void;
  setIntervalFn?: (
    callback: () => void,
    delayMs: number,
  ) => MemoryTelemetryTimer;
}

export function isMemoryTelemetryEnabled(env: MemoryTelemetryEnv = process.env) {
  return env[MEMORY_TELEMETRY_ENABLED_ENV] === "1";
}

export function createV8HeapLimitEvent({
  heapSizeLimit,
  nodeVersion,
  pid,
  timestamp,
}: {
  heapSizeLimit: number;
  nodeVersion: string;
  pid: number;
  timestamp: string;
}) {
  return {
    event: "v8_heap_limit",
    timestamp,
    pid,
    nodeVersion,
    heap_size_limit: heapSizeLimit,
  };
}

export function createProcessMemoryEvent({
  memoryUsage,
  pid,
  timestamp,
  uptimeSeconds,
}: {
  memoryUsage: NodeJS.MemoryUsage;
  pid: number;
  timestamp: string;
  uptimeSeconds: number;
}) {
  return {
    event: "process_memory",
    timestamp,
    pid,
    uptimeSeconds,
    rss: memoryUsage.rss,
    heapTotal: memoryUsage.heapTotal,
    heapUsed: memoryUsage.heapUsed,
    external: memoryUsage.external,
    arrayBuffers: memoryUsage.arrayBuffers,
  };
}

export function startMemoryTelemetry(deps: MemoryTelemetryDeps = {}) {
  const env = deps.env ?? process.env;
  if (!isMemoryTelemetryEnabled(env)) {
    return false;
  }

  const globalState =
    deps.globalState ?? (globalThis as unknown as MemoryTelemetryGlobal);
  if (globalState[MEMORY_TELEMETRY_STARTED_KEY]) {
    return false;
  }

  globalState[MEMORY_TELEMETRY_STARTED_KEY] = true;

  const getTimestamp = deps.getTimestamp ?? (() => new Date().toISOString());
  const getPid = deps.getPid ?? (() => process.pid);
  const log = deps.log ?? console.log;

  log(
    JSON.stringify(
      createV8HeapLimitEvent({
        heapSizeLimit:
          deps.getHeapSizeLimit?.() ?? v8.getHeapStatistics().heap_size_limit,
        nodeVersion: deps.getNodeVersion?.() ?? process.version,
        pid: getPid(),
        timestamp: getTimestamp(),
      }),
    ),
  );

  const logProcessMemory = () => {
    log(
      JSON.stringify(
        createProcessMemoryEvent({
          memoryUsage: deps.getMemoryUsage?.() ?? process.memoryUsage(),
          pid: getPid(),
          timestamp: getTimestamp(),
          uptimeSeconds: deps.getUptimeSeconds?.() ?? process.uptime(),
        }),
      ),
    );
  };

  const timer = (
    deps.setIntervalFn ??
    ((callback, delayMs) =>
      setInterval(callback, delayMs) as unknown as MemoryTelemetryTimer)
  )(logProcessMemory, MEMORY_TELEMETRY_INTERVAL_MS);

  timer.unref?.();
  return true;
}
