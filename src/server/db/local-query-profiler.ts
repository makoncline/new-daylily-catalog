import fs from "node:fs";
import path from "node:path";
import { type Prisma } from "../../../prisma/generated/sqlite-client/index.js";

const DEFAULT_QUERY_PROFILER_OUTPUT_PATH =
  "tests/.tmp/query-profiler/prisma-query-events.jsonl";

const TRUTHY_ENV_VALUES = new Set(["1", "true", "yes", "on"]);

export interface PrismaQueryProfilerEvent {
  eventType: "sql" | "operation";
  timestamp: string;
  durationMs: number;
  query: string;
  params: string;
  target: string;
  pid: number;
}

interface QueryProfilerContext {
  useTursoDb: boolean;
  databaseUrl: string;
}

interface QueryProfilerState {
  outputPath: string;
  writer: fs.WriteStream;
  hooksRegistered: boolean;
  announceOnAttach: boolean;
}

interface QueryProfilerGlobalState {
  queryProfilerState: QueryProfilerState | undefined;
  profiledClients: WeakSet<object> | undefined;
  didWarnIneligible: boolean | undefined;
}

interface PrismaClientWithQueryEvents {
  $on(eventType: "query", callback: (event: Prisma.QueryEvent) => void): void;
  $use(middleware: Prisma.Middleware): void;
}

const globalForQueryProfiler = globalThis as typeof globalThis &
  QueryProfilerGlobalState;

function isTruthyEnvValue(value: string | undefined): boolean {
  if (!value) {
    return false;
  }

  return TRUTHY_ENV_VALUES.has(value.trim().toLowerCase());
}

function getOutputPath() {
  const configuredPath = process.env.LOCAL_QUERY_PROFILER_OUTPUT?.trim();
  const outputPath =
    configuredPath && configuredPath.length > 0
      ? configuredPath
      : DEFAULT_QUERY_PROFILER_OUTPUT_PATH;

  return path.resolve(process.cwd(), outputPath);
}

function acquireResetLock(outputPath: string) {
  if (!isTruthyEnvValue(process.env.LOCAL_QUERY_PROFILER_RESET)) {
    return null;
  }

  const lockPath = `${outputPath}.reset.lock`;
  const tryAcquireLock = () => {
    const descriptor = fs.openSync(lockPath, "wx");
    fs.writeFileSync(descriptor, `${process.pid}\n`, "utf8");
    fs.closeSync(descriptor);
  };

  try {
    tryAcquireLock();
    return lockPath;
  } catch (error) {
    const maybeError = error as NodeJS.ErrnoException;
    if (maybeError.code !== "EEXIST") {
      throw error;
    }
  }

  try {
    const existingPid = Number.parseInt(fs.readFileSync(lockPath, "utf8"), 10);
    if (!Number.isNaN(existingPid)) {
      try {
        process.kill(existingPid, 0);
        return null;
      } catch (error) {
        const maybeError = error as NodeJS.ErrnoException;
        if (maybeError.code && maybeError.code !== "ESRCH") {
          return null;
        }
      }
    }

    fs.rmSync(lockPath, { force: true });
    tryAcquireLock();
    return lockPath;
  } catch {
    return null;
  }
}

function getOrCreateState(): QueryProfilerState {
  if (globalForQueryProfiler.queryProfilerState) {
    return globalForQueryProfiler.queryProfilerState;
  }

  const outputPath = getOutputPath();
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const resetLockPath = acquireResetLock(outputPath);
  if (resetLockPath) {
    fs.rmSync(outputPath, { force: true });
  }

  const writer = fs.createWriteStream(outputPath, { flags: "a" });
  writer.on("error", (error) => {
    console.error("[query-profiler] Failed writing Prisma query event:", error);
  });

  const state: QueryProfilerState = {
    outputPath,
    writer,
    hooksRegistered: false,
    announceOnAttach: true,
  };

  globalForQueryProfiler.queryProfilerState = state;
  return state;
}

function ensureShutdownHooks(state: QueryProfilerState) {
  if (state.hooksRegistered) {
    return;
  }

  const closeWriter = () => {
    if (state.writer.destroyed) {
      return;
    }

    state.writer.end();
  };

  process.once("beforeExit", closeWriter);
  process.once("exit", closeWriter);
  process.once("SIGINT", closeWriter);
  process.once("SIGTERM", closeWriter);

  state.hooksRegistered = true;
}

function buildEventLine(event: Prisma.QueryEvent) {
  const payload: PrismaQueryProfilerEvent = {
    eventType: "sql",
    timestamp: new Date().toISOString(),
    durationMs: event.duration,
    query: event.query,
    params: event.params,
    target: event.target,
    pid: process.pid,
  };

  return `${JSON.stringify(payload)}\n`;
}

const MAX_ARG_KEY_PATHS = 30;
const MAX_ARG_DEPTH = 2;

function collectArgKeyPaths(
  value: unknown,
  paths: Set<string>,
  prefix = "",
  depth = 0,
) {
  if (paths.size >= MAX_ARG_KEY_PATHS) {
    return;
  }

  if (value === null || value === undefined) {
    if (prefix) {
      paths.add(prefix);
    }
    return;
  }

  if (Array.isArray(value)) {
    if (prefix) {
      paths.add(`${prefix}[]`);
    }

    if (depth >= MAX_ARG_DEPTH || value.length === 0) {
      return;
    }

    collectArgKeyPaths(value[0], paths, `${prefix}[]`, depth + 1);
    return;
  }

  if (typeof value === "object") {
    if (depth >= MAX_ARG_DEPTH) {
      if (prefix) {
        paths.add(prefix);
      }
      return;
    }

    const entries = Object.entries(value).sort(([a], [b]) => a.localeCompare(b));
    for (const [key, nestedValue] of entries) {
      const nextPrefix = prefix ? `${prefix}.${key}` : key;
      collectArgKeyPaths(nestedValue, paths, nextPrefix, depth + 1);
      if (paths.size >= MAX_ARG_KEY_PATHS) {
        return;
      }
    }
    return;
  }

  if (prefix) {
    paths.add(prefix);
  }
}

function summarizeArgsShape(args: unknown) {
  if (args === undefined || args === null) {
    return "no-args";
  }

  const keyPaths = new Set<string>();
  collectArgKeyPaths(args, keyPaths);

  if (keyPaths.size === 0) {
    return "args";
  }

  return Array.from(keyPaths).join("|");
}

function buildOperationEventLine(
  params: Prisma.MiddlewareParams,
  durationMs: number,
) {
  const modelName = params.model ?? "$query";
  const actionName = params.action;
  const argsShape = summarizeArgsShape(params.args);
  const operationPattern = `${modelName}.${actionName}(${argsShape})`;

  const payload: PrismaQueryProfilerEvent = {
    eventType: "operation",
    timestamp: new Date().toISOString(),
    durationMs,
    query: `/* operation */ ${operationPattern}`,
    params: argsShape,
    target: "prisma.middleware",
    pid: process.pid,
  };

  return `${JSON.stringify(payload)}\n`;
}

function canEnableProfiler(context: QueryProfilerContext) {
  if (!isTruthyEnvValue(process.env.LOCAL_QUERY_PROFILER)) {
    return false;
  }

  const isLocalSqliteFile =
    !context.useTursoDb && context.databaseUrl.startsWith("file:");

  if (isLocalSqliteFile) {
    return true;
  }

  if (!globalForQueryProfiler.didWarnIneligible) {
    console.warn(
      "[query-profiler] Ignoring LOCAL_QUERY_PROFILER because the active database is not a local sqlite file.",
    );
    globalForQueryProfiler.didWarnIneligible = true;
  }

  return false;
}

export function attachLocalQueryProfiler(
  client: PrismaClientWithQueryEvents,
  context: QueryProfilerContext,
) {
  if (!canEnableProfiler(context)) {
    return false;
  }

  const profiledClients =
    globalForQueryProfiler.profiledClients ?? new WeakSet<object>();
  globalForQueryProfiler.profiledClients = profiledClients;

  const clientReference = client as unknown as object;
  if (profiledClients.has(clientReference)) {
    return true;
  }

  const state = getOrCreateState();
  ensureShutdownHooks(state);

  client.$on("query", (event) => {
    state.writer.write(buildEventLine(event));
  });

  client.$use(async (params, next) => {
    const startedAt = process.hrtime.bigint();

    try {
      return (await next(params)) as unknown;
    } finally {
      const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      state.writer.write(buildOperationEventLine(params, elapsedMs));
    }
  });

  profiledClients.add(clientReference);

  if (state.announceOnAttach) {
    console.info(
      `[query-profiler] Capturing Prisma queries to ${state.outputPath}`,
    );
    state.announceOnAttach = false;
  }

  return true;
}
