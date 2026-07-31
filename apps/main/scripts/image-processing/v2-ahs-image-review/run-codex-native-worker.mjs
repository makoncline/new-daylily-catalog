import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ORIGINALS_DIR,
  PROD_COPY_DB_PATH,
  REVIEW_DB_PATH,
  REVIEW_ROOT,
  assignCodexNativeAgent,
  claimNextPendingItem,
  ensureSchema,
  openQueueDb,
  prepareQueueDbForConcurrentWrites,
  updateStatus,
} from "./review-db.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROMOTE_SCRIPT = path.join(SCRIPT_DIR, "promote-codex-native-result.mjs");
const BACKLOG_SCRIPT =
  process.env.CODEX_BACKLOG_SCRIPT ||
  path.join(SCRIPT_DIR, "queue-backlog-source-images.ts");
const PROMPT =
  "generate an edited image (do not edit the original. do not reframe or crop original. do not use code execution to edit reference image). remove all text, zoom out slightly, improve quality, square aspect ratio.";
const LOG_PATH = path.join(REVIEW_ROOT, "codex-native-worker.log");
const RUN_ID = `${new Date().toISOString().replaceAll(/[:.]/g, "-")}-${process.pid}`;
const RUN_LOG_DIR = path.join(REVIEW_ROOT, "codex-native-runs");
const RUN_LOG_PATH = path.join(RUN_LOG_DIR, `${RUN_ID}.log`);
const RUN_EVENTS_PATH = path.join(RUN_LOG_DIR, `${RUN_ID}.events.jsonl`);
const WORKER_LOCK_PATH = path.join(REVIEW_ROOT, "codex-native-worker.lock");
const WORKER_COMMAND_PATH = path.join(
  REVIEW_ROOT,
  "codex-native-worker-command.json",
);
const WORKER_STATE_PATH = path.join(
  REVIEW_ROOT,
  "codex-native-worker-state.json",
);
const CODEX_IMAGE_HOME = path.resolve(
  process.env.CODEX_IMAGE_HOME || path.join(REVIEW_ROOT, "codex-image-home"),
);
const GENERATED_IMAGES_ROOT = path.resolve(
  process.env.CODEX_GENERATED_IMAGES_ROOT ||
    path.join(CODEX_IMAGE_HOME, "generated_images"),
);
const CODEX_AUTH_PATH = path.join(os.homedir(), ".codex", "auth.json");
const CODEX_BIN = process.env.CODEX_BIN || "codex";
const DEFAULT_MODEL = process.env.CODEX_IMAGE_AGENT_MODEL || "gpt-5.6-luna";
const DEFAULT_EFFORT = process.env.CODEX_IMAGE_AGENT_EFFORT || "high";
const NODE_SQLITE_ARGS = ["--disable-warning=ExperimentalWarning"];
const USAGE_CHECK_DISABLED = process.env.CODEX_USAGE_CHECK_DISABLED === "1";
const CLEAN_CODEX_FLAGS = [
  "--ignore-user-config",
  "--ignore-rules",
  "-c",
  "skills.bundled.enabled=false",
  "-c",
  "skills.include_instructions=false",
  "--disable",
  "apps",
  "--disable",
  "browser_use",
  "--disable",
  "chronicle",
  "--disable",
  "computer_use",
  "--disable",
  "in_app_browser",
  "--disable",
  "memories",
  "--disable",
  "multi_agent",
  "--disable",
  "plugins",
  "--disable",
  "tool_suggest",
  "--enable",
  "image_generation",
];

function prepareCodexImageHome() {
  fs.mkdirSync(CODEX_IMAGE_HOME, { recursive: true });

  const authPath = path.join(CODEX_IMAGE_HOME, "auth.json");
  if (!fs.existsSync(authPath)) {
    if (!fs.existsSync(CODEX_AUTH_PATH)) {
      throw new Error(`Codex auth file does not exist: ${CODEX_AUTH_PATH}`);
    }
    fs.symlinkSync(CODEX_AUTH_PATH, authPath);
  }
}

function readOption(name) {
  const inline = process.argv.find((arg) => arg.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);

  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

function readPositiveInteger(name, fallback = null) {
  const raw = readOption(name);
  if (raw === null) return fallback;

  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${name} must be a positive integer`);
  }

  return value;
}

function parseArgs() {
  const id = readOption("--id");
  const limit = readPositiveInteger("--limit", id ? 1 : null);
  const concurrency = readPositiveInteger("--concurrency", 10);

  if (!limit) {
    throw new Error("Pass --limit <count> or --id <queue-id>");
  }

  return {
    backlogRefillSize: readPositiveInteger(
      "--backlog-refill-size",
      concurrency * 2,
    ),
    concurrency,
    effort: readOption("--effort") || DEFAULT_EFFORT,
    id,
    limit,
    model: readOption("--model") || DEFAULT_MODEL,
    timeoutMs: readPositiveInteger("--timeout-minutes", 15) * 60_000,
    usageIntervalMs:
      readPositiveInteger("--usage-interval-minutes", 3) * 60_000,
  };
}

function log(message) {
  const line = `[${new Date().toISOString()}] ${message}`;
  fs.mkdirSync(REVIEW_ROOT, { recursive: true });
  fs.mkdirSync(RUN_LOG_DIR, { recursive: true });
  fs.appendFileSync(LOG_PATH, `${line}\n`);
  fs.appendFileSync(RUN_LOG_PATH, `${line}\n`);
  console.log(line);
}

function logLines(label, text) {
  const lines = String(text || "")
    .split("\n")
    .map((line) => line.trimEnd())
    .filter(Boolean);

  for (const line of lines) log(`${label}: ${line}`);
}

function logCodexEvent(queueId, event) {
  fs.mkdirSync(RUN_LOG_DIR, { recursive: true });
  fs.appendFileSync(
    RUN_EVENTS_PATH,
    `${JSON.stringify({
      queueId,
      receivedAt: new Date().toISOString(),
      event,
    })}\n`,
  );
}

function acquireWorkerLock() {
  fs.mkdirSync(REVIEW_ROOT, { recursive: true });

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const descriptor = fs.openSync(WORKER_LOCK_PATH, "wx");
      fs.writeFileSync(
        descriptor,
        JSON.stringify({
          pid: process.pid,
          runId: RUN_ID,
          startedAt: new Date().toISOString(),
        }),
      );
      fs.closeSync(descriptor);

      let released = false;
      return () => {
        if (released) return;
        released = true;

        try {
          const owner = JSON.parse(fs.readFileSync(WORKER_LOCK_PATH, "utf8"));
          if (owner.runId === RUN_ID) fs.unlinkSync(WORKER_LOCK_PATH);
        } catch {}
      };
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;

      let owner = null;
      try {
        owner = JSON.parse(fs.readFileSync(WORKER_LOCK_PATH, "utf8"));
      } catch {}

      if (Number.isInteger(owner?.pid)) {
        try {
          process.kill(owner.pid, 0);
          throw new Error(
            `Another image worker is already running pid=${owner.pid} run=${owner.runId ?? "unknown"}`,
          );
        } catch (processError) {
          if (processError?.code !== "ESRCH") throw processError;
        }
      }

      fs.rmSync(WORKER_LOCK_PATH, { force: true });
    }
  }

  throw new Error(`Unable to acquire image worker lock: ${WORKER_LOCK_PATH}`);
}

function extractResponseText(event) {
  const item = event?.item;
  if (item?.type !== "agent_message") return null;

  const candidates = [item?.text, item?.message];

  if (Array.isArray(item?.content)) {
    for (const content of item.content) {
      if (typeof content?.text === "string") candidates.push(content.text);
    }
  }

  return candidates.find(
    (candidate) => typeof candidate === "string" && candidate.trim(),
  );
}

function extractDiagnosticText(event) {
  if (event?.item?.type === "error") return event.item.message;
  return event?.error?.message;
}

function extractUsage(event) {
  if (event?.type !== "turn.completed" || !event.usage) return null;

  return {
    cachedInputTokens: Number(event.usage.cached_input_tokens || 0),
    inputTokens: Number(event.usage.input_tokens || 0),
    outputTokens: Number(event.usage.output_tokens || 0),
    reasoningOutputTokens: Number(event.usage.reasoning_output_tokens || 0),
  };
}

function formatUsage(usage) {
  if (!usage) return "tokens=unavailable";

  return `tokensInput=${usage.inputTokens} tokensCached=${usage.cachedInputTokens} tokensOutput=${usage.outputTokens} tokensReasoning=${usage.reasoningOutputTokens}`;
}

function readCodexAccountUsage() {
  return new Promise((resolve, reject) => {
    const child = spawn(CODEX_BIN, ["app-server", "--stdio"], {
      env: process.env,
      stdio: ["pipe", "pipe", "pipe"],
    });
    const responses = new Map();
    let settled = false;
    let stderr = "";
    let stdoutBuffer = "";
    let timeout = null;

    const finish = (error = null) => {
      if (settled) return;
      settled = true;
      if (timeout) clearTimeout(timeout);
      child.stdin.end();

      if (error) {
        terminate(child);
        reject(error);
        return;
      }

      const rateLimitResult = responses.get(2);
      const usageResult = responses.get(3);
      resolve({
        availableResetCredits:
          rateLimitResult?.rateLimitResetCredits?.availableCount ?? null,
        lifetimeTokens: usageResult?.summary?.lifetimeTokens ?? null,
        rateLimits: rateLimitResult?.rateLimits ?? null,
      });
    };

    const maybeFinish = () => {
      if (responses.has(2) && responses.has(3)) finish();
    };

    const consumeLine = (line) => {
      if (!line.trim()) return;

      let message;
      try {
        message = JSON.parse(line);
      } catch {
        return;
      }

      if (message.id === 1) {
        child.stdin.write(
          `${JSON.stringify({ method: "initialized", params: {} })}\n`,
        );
        child.stdin.write(
          `${JSON.stringify({ method: "account/rateLimits/read", id: 2 })}\n`,
        );
        child.stdin.write(
          `${JSON.stringify({ method: "account/usage/read", id: 3 })}\n`,
        );
        return;
      }

      if (message.id === 2 || message.id === 3) {
        if (message.error) {
          finish(
            new Error(
              `Codex usage request ${message.id} failed: ${JSON.stringify(message.error)}`,
            ),
          );
          return;
        }
        responses.set(message.id, message.result);
        maybeFinish();
      }
    };

    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdoutBuffer += chunk;
      const lines = stdoutBuffer.split("\n");
      stdoutBuffer = lines.pop() ?? "";
      for (const line of lines) consumeLine(line);
    });
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => {
      stderr = `${stderr}${chunk}`.slice(-10_000);
    });
    child.on("error", finish);
    child.on("close", (code) => {
      if (settled) return;
      finish(
        new Error(
          `Codex usage reader exited before responding code=${code ?? "none"}${
            stderr.trim() ? ` stderr=${stderr.trim()}` : ""
          }`,
        ),
      );
    });

    timeout = setTimeout(() => {
      finish(new Error("Timed out reading Codex account usage after 15s"));
    }, 15_000);

    child.stdin.write(
      `${JSON.stringify({
        method: "initialize",
        id: 1,
        params: {
          clientInfo: {
            name: "daylily_image_worker",
            title: "Daylily Image Worker",
            version: "0.1.0",
          },
        },
      })}\n`,
    );
  });
}

function createUsageMonitor(intervalMs) {
  if (USAGE_CHECK_DISABLED) {
    return {
      finish: async () => {},
      sample: async () => {},
      start: () => {},
    };
  }

  let baseline = null;
  let previous = null;
  let quotaResetDuringRun = false;
  let sampleChain = Promise.resolve();
  let timer = null;

  const readAndLog = async (label) => {
    try {
      const sample = await readCodexAccountUsage();
      const primary = sample.rateLimits?.primary;
      const usedPercent = Number(primary?.usedPercent);
      const lifetimeTokens = Number(sample.lifetimeTokens);
      const now = Date.now();
      const parts = [
        `codex usage label=${label}`,
        `usedPercent=${Number.isFinite(usedPercent) ? usedPercent : "unavailable"}`,
        `remainingPercent=${Number.isFinite(usedPercent) ? Math.max(0, 100 - usedPercent) : "unavailable"}`,
        `accountTokens=${Number.isFinite(lifetimeTokens) ? lifetimeTokens : "unavailable"}`,
        `windowMinutes=${primary?.windowDurationMins ?? "unavailable"}`,
        `resetsAt=${primary?.resetsAt ? new Date(primary.resetsAt * 1_000).toISOString() : "unavailable"}`,
        `resetCredits=${sample.availableResetCredits ?? "unavailable"}`,
      ];

      if (previous) {
        const elapsedMinutes = (now - previous.sampledAt) / 60_000;
        const quotaReset =
          Number.isFinite(usedPercent) &&
          Number.isFinite(previous.usedPercent) &&
          usedPercent < previous.usedPercent;
        quotaResetDuringRun ||= quotaReset;
        const usedDelta =
          !quotaReset &&
          Number.isFinite(usedPercent) &&
          Number.isFinite(previous.usedPercent)
            ? usedPercent - previous.usedPercent
            : null;
        const tokenDelta =
          Number.isFinite(lifetimeTokens) &&
          Number.isFinite(previous.lifetimeTokens)
            ? lifetimeTokens - previous.lifetimeTokens
            : null;

        parts.push(
          `elapsedMinutes=${elapsedMinutes.toFixed(2)}`,
          `quotaReset=${quotaReset ? "yes" : "no"}`,
          `deltaUsedPercent=${usedDelta === null ? "unavailable" : usedDelta}`,
          `usedPercentPerMinute=${usedDelta === null ? "unavailable" : (usedDelta / elapsedMinutes).toFixed(3)}`,
          `deltaAccountTokens=${tokenDelta === null ? "unavailable" : tokenDelta}`,
          `accountTokensPerMinute=${tokenDelta === null ? "unavailable" : Math.round(tokenDelta / elapsedMinutes)}`,
        );
      }

      log(parts.join(" "));
      const recordedSample = {
        label,
        lifetimeTokens,
        sampledAt: now,
        usedPercent,
      };
      baseline ??= recordedSample;
      previous = recordedSample;
      return recordedSample;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log(`codex usage label=${label} error=${message}`);
      return null;
    }
  };

  const sample = (label) => {
    sampleChain = sampleChain.then(() => readAndLog(label));
    return sampleChain;
  };

  return {
    finish: async () => {
      if (timer) clearInterval(timer);
      const finalSample = await sample("finish");
      if (!baseline || !finalSample) return;

      const elapsedMinutes =
        (finalSample.sampledAt - baseline.sampledAt) / 60_000;
      const validPercentages =
        Number.isFinite(baseline.usedPercent) &&
        Number.isFinite(finalSample.usedPercent);
      const quotaReset =
        quotaResetDuringRun ||
        (validPercentages && finalSample.usedPercent < baseline.usedPercent);
      const usedDelta =
        validPercentages && !quotaReset
          ? finalSample.usedPercent - baseline.usedPercent
          : null;
      const tokenDelta =
        Number.isFinite(baseline.lifetimeTokens) &&
        Number.isFinite(finalSample.lifetimeTokens)
          ? finalSample.lifetimeTokens - baseline.lifetimeTokens
          : null;

      log(
        [
          "codex usage run",
          `baselineLabel=${baseline.label}`,
          `baselineUsedPercent=${validPercentages ? baseline.usedPercent : "unavailable"}`,
          `finishUsedPercent=${validPercentages ? finalSample.usedPercent : "unavailable"}`,
          `accountWideDeltaUsedPercent=${usedDelta ?? "unavailable"}`,
          `elapsedMinutes=${elapsedMinutes.toFixed(2)}`,
          `accountWideUsedPercentPerMinute=${
            usedDelta === null || elapsedMinutes <= 0
              ? "unavailable"
              : (usedDelta / elapsedMinutes).toFixed(3)
          }`,
          `quotaReset=${quotaReset ? "yes" : "no"}`,
          `accountWideDeltaTokens=${tokenDelta ?? "unavailable"}`,
          `accountWideTokensPerMinute=${
            tokenDelta === null || elapsedMinutes <= 0
              ? "unavailable"
              : Math.round(tokenDelta / elapsedMinutes)
          }`,
        ].join(" "),
      );
    },
    sample,
    start: () => {
      timer = setInterval(() => void sample("periodic"), intervalMs);
      timer.unref();
    },
  };
}

function findGeneratedPng(sessionId) {
  const directory = path.join(GENERATED_IMAGES_ROOT, sessionId);
  if (!fs.existsSync(directory)) return null;

  return (
    fs
      .readdirSync(directory, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".png"))
      .map((entry) => path.join(directory, entry.name))
      .sort(
        (left, right) => fs.statSync(right).mtimeMs - fs.statSync(left).mtimeMs,
      )[0] ?? null
  );
}

function createGenerationError(
  message,
  response,
  {
    diagnostics = "",
    imageCreated = false,
    noImage = false,
    sessionId = null,
  } = {},
) {
  const error = new Error(message);
  error.codexResponse = response;
  error.codexDiagnostics = diagnostics;
  error.imageCreated = imageCreated;
  error.noImage = noImage;
  error.sessionId = sessionId;
  return error;
}

function logProdCopyAge() {
  try {
    const modifiedAt = fs.statSync(PROD_COPY_DB_PATH).mtime;
    const ageMinutes = Math.max(
      0,
      Math.floor((Date.now() - modifiedAt.getTime()) / 60_000),
    );
    const days = Math.floor(ageMinutes / 1_440);
    const hours = Math.floor((ageMinutes % 1_440) / 60);
    const minutes = ageMinutes % 60;
    const unit = (value, name) => `${value} ${name}${value === 1 ? "" : "s"}`;
    const age =
      days > 0
        ? `${unit(days, "day")} ${unit(hours, "hour")}`
        : hours > 0
          ? `${unit(hours, "hour")} ${unit(minutes, "minute")}`
          : unit(minutes, "minute");

    log(
      `prod copy is ${age} old modified=${modifiedAt.toISOString()} path=${PROD_COPY_DB_PATH}`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(`prod copy unavailable path=${PROD_COPY_DB_PATH} error=${message}`);
  }
}

function getClaimableIds({ id, limit }, excludedIds = new Set()) {
  const database = openQueueDb();

  try {
    ensureSchema(database);

    if (id) {
      const row = database
        .prepare(
          `
            SELECT "id"
            FROM "v2_image_review_queue"
            WHERE "id" = ?
              AND "status" IN ('pending', 'failed', 'rejected')
          `,
        )
        .get(id);

      return row && !excludedIds.has(String(row.id)) ? [String(row.id)] : [];
    }

    const rows = database
      .prepare(
        `
          SELECT "id", "status", "updatedAt"
          FROM "v2_image_review_queue"
          WHERE "status" = 'pending'
          ORDER BY "updatedAt" ASC, "id" ASC
        `,
      )
      .all();

    return rows
      .filter((row) => !excludedIds.has(String(row.id)))
      .slice(0, limit)
      .map((row) => String(row.id));
  } finally {
    database.close();
  }
}

function queueSourceRows(mode, limit = null, onSpawn = () => {}) {
  log(`queue refill mode=${mode} requested=${limit ?? "all"}`);
  const scriptArgs = [BACKLOG_SCRIPT, "--mode", mode];
  if (limit !== null) scriptArgs.push("--limit", String(limit));

  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [...NODE_SQLITE_ARGS, ...scriptArgs],
      {
        detached: process.platform !== "win32",
        env: process.env,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let stdout = "";
    let stderr = "";

    onSpawn(child);
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout = `${stdout}${chunk}`.slice(-10 * 1024 * 1024);
    });
    child.stderr.on("data", (chunk) => {
      stderr = `${stderr}${chunk}`.slice(-1 * 1024 * 1024);
    });
    child.once("error", reject);
    child.once("close", (code, signal) => {
      if (stdout.trim()) logLines(`queue ${mode}`, stdout);
      if (code === 0) {
        resolve(stdout);
        return;
      }

      reject(
        new Error(
          `Queue ${mode} exited code=${code ?? "none"} signal=${signal ?? "none"}${
            stderr.trim() ? ` stderr=${stderr.trim()}` : ""
          }`,
        ),
      );
    });
  });
}

function writeJsonAtomic(filePath, value) {
  const temporaryPath = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`);
  fs.renameSync(temporaryPath, filePath);
}

function getQueueStatusSummary() {
  const database = openQueueDb();

  try {
    ensureSchema(database);
    return database
      .prepare(
        `
          SELECT "status", COUNT(*) AS "count"
          FROM "v2_image_review_queue"
          GROUP BY "status"
          ORDER BY "status"
        `,
      )
      .all()
      .map((row) => `${row.status}=${row.count}`)
      .join(" ");
  } finally {
    database.close();
  }
}

function recoverMappedOutputs() {
  const database = openQueueDb();
  let rows;

  try {
    ensureSchema(database);
    rows = database
      .prepare(
        `
          SELECT "id", "codexNativeAgentId"
          FROM "v2_image_review_queue"
          WHERE "status" = 'processing'
        `,
      )
      .all();
  } finally {
    database.close();
  }

  let recovered = 0;
  let reset = 0;

  for (const row of rows) {
    const id = String(row.id);
    const sessionId =
      typeof row.codexNativeAgentId === "string" && row.codexNativeAgentId
        ? row.codexNativeAgentId
        : null;

    if (sessionId) {
      const imagePath = findGeneratedPng(sessionId);

      if (!imagePath) {
        log(`recovery no image id=${id} session=${sessionId}`);
      } else {
        try {
          promote(id, sessionId);
          recovered += 1;
          log(
            `recovered id=${id} session=${sessionId} image=yes source=${imagePath}`,
          );
          continue;
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          log(
            `recovery promotion failed id=${id} session=${sessionId} error=${message}`,
          );
        }
      }
    }

    updateStatus(id, "pending", {
      lastError: sessionId
        ? `Recovered stale processing row without a promotable image from session ${sessionId}`
        : "Recovered stale processing row before a Codex session was assigned",
    });
    reset += 1;
    log(
      `recovery reset id=${id} session=${sessionId ?? "none"} status=pending`,
    );
  }

  return { recovered, reset };
}

function promote(id, sessionId) {
  return execFileSync(
    process.execPath,
    [...NODE_SQLITE_ARGS, PROMOTE_SCRIPT, "--id", id, "--agent", sessionId],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        CODEX_GENERATED_IMAGES_ROOT: GENERATED_IMAGES_ROOT,
      },
      maxBuffer: 2 * 1024 * 1024,
    },
  );
}

function terminate(child, signal = "SIGTERM") {
  try {
    if (process.platform !== "win32" && child.pid) {
      process.kill(-child.pid, signal);
    } else {
      child.kill(signal);
    }
  } catch {}
}

function generate(item, args, activeChildren) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    let sessionId = null;
    let stdoutBuffer = "";
    let stderr = "";
    let pendingError = null;
    let usage = null;
    const responses = [];
    const diagnostics = [];

    const child = spawn(
      CODEX_BIN,
      [
        "-a",
        "never",
        "exec",
        ...CLEAN_CODEX_FLAGS,
        "--json",
        "-m",
        args.model,
        "-c",
        `model_reasoning_effort=${JSON.stringify(args.effort)}`,
        "--skip-git-repo-check",
        "-C",
        REVIEW_ROOT,
        "-s",
        "read-only",
        "-i",
        item.originalPath,
        "--",
        PROMPT,
      ],
      {
        detached: process.platform !== "win32",
        env: {
          ...process.env,
          CODEX_GENERATED_IMAGES_ROOT: GENERATED_IMAGES_ROOT,
          CODEX_HOME: CODEX_IMAGE_HOME,
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    activeChildren.set(item.id, child);
    log(`started id=${item.id} pid=${child.pid} source=${item.originalPath}`);

    const requestFailure = (error) => {
      if (pendingError) return;
      pendingError = error;
      terminate(child);
    };

    const consumeLine = (line) => {
      if (!line.trim()) return;

      let event;
      try {
        event = JSON.parse(line);
      } catch {
        return;
      }

      logCodexEvent(item.id, event);
      const response = extractResponseText(event);
      if (response) responses.push(response);
      const diagnostic = extractDiagnosticText(event);
      if (diagnostic) diagnostics.push(diagnostic);
      usage = extractUsage(event) || usage;

      if (event.type !== "thread.started" || !event.thread_id) return;
      if (sessionId && sessionId !== event.thread_id) {
        requestFailure(
          new Error(`Codex emitted multiple session IDs for ${item.id}`),
        );
        return;
      }

      sessionId = String(event.thread_id);
      try {
        assignCodexNativeAgent(item.id, sessionId);
        log(`assigned id=${item.id} session=${sessionId}`);
      } catch (error) {
        requestFailure(error);
      }
    };

    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdoutBuffer += chunk;
      const lines = stdoutBuffer.split("\n");
      stdoutBuffer = lines.pop() ?? "";
      for (const line of lines) consumeLine(line);
    });

    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => {
      stderr = `${stderr}${chunk}`.slice(-20_000);
    });

    child.on("error", requestFailure);

    let forceKill = null;
    const timeout = setTimeout(() => {
      requestFailure(
        new Error(`Timed out after ${Math.round(args.timeoutMs / 60_000)}m`),
      );
      forceKill = setTimeout(() => terminate(child, "SIGKILL"), 5_000);
    }, args.timeoutMs);

    child.on("close", (code, signal) => {
      const rejectGeneration = (error) => {
        error.durationMs = Date.now() - startedAt;
        error.codexUsage = usage;
        reject(error);
      };

      clearTimeout(timeout);
      if (forceKill) clearTimeout(forceKill);
      activeChildren.delete(item.id);
      if (stdoutBuffer) consumeLine(stdoutBuffer);

      if (sessionId) {
        const imagePath = findGeneratedPng(sessionId);

        if (!imagePath) {
          if (pendingError) {
            pendingError.codexResponse = responses.join("\n\n");
            pendingError.codexDiagnostics = diagnostics.join("\n\n");
            pendingError.noImage = true;
            pendingError.sessionId = sessionId;
            rejectGeneration(pendingError);
            return;
          }

          rejectGeneration(
            createGenerationError(
              `Codex session ${sessionId} completed without a generated PNG (exit=${code ?? "none"} signal=${signal ?? "none"})`,
              responses.join("\n\n"),
              {
                diagnostics: diagnostics.join("\n\n"),
                noImage: true,
                sessionId,
              },
            ),
          );
          return;
        }

        try {
          promote(item.id, sessionId);
          resolve({
            durationMs: Date.now() - startedAt,
            id: item.id,
            imagePath,
            response: responses.join("\n\n"),
            sessionId,
            usage,
          });
          return;
        } catch (error) {
          if (!pendingError && code === 0) {
            error.codexResponse = responses.join("\n\n");
            error.codexDiagnostics = diagnostics.join("\n\n");
            error.imageCreated = true;
            error.sessionId = sessionId;
            rejectGeneration(error);
            return;
          }
        }
      }

      if (pendingError) {
        pendingError.codexResponse = responses.join("\n\n");
        pendingError.codexDiagnostics = diagnostics.join("\n\n");
        pendingError.sessionId = sessionId;
        rejectGeneration(pendingError);
        return;
      }

      if (code !== 0) {
        rejectGeneration(
          createGenerationError(
            `Codex exited code=${code} signal=${signal ?? "none"}${
              stderr.trim() ? ` stderr=${stderr.trim()}` : ""
            }`,
            responses.join("\n\n"),
            {
              diagnostics: diagnostics.join("\n\n"),
              noImage: true,
              sessionId,
            },
          ),
        );
        return;
      }

      if (!sessionId) {
        rejectGeneration(
          createGenerationError(
            "Codex completed without a thread.started event",
            responses.join("\n\n"),
            {
              diagnostics: diagnostics.join("\n\n"),
              noImage: true,
            },
          ),
        );
      }
    });
  });
}

async function main() {
  const args = parseArgs();
  prepareCodexImageHome();
  const releaseWorkerLock = acquireWorkerLock();
  process.once("exit", releaseWorkerLock);
  fs.rmSync(WORKER_COMMAND_PATH, { force: true });
  log(`run=${RUN_ID} log=${RUN_LOG_PATH} events=${RUN_EVENTS_PATH}`);
  log(
    `paths reviewRoot=${REVIEW_ROOT} queueDb=${REVIEW_DB_PATH} originals=${ORIGINALS_DIR} codexHome=${CODEX_IMAGE_HOME} generated=${GENERATED_IMAGES_ROOT}`,
  );
  logProdCopyAge();
  prepareQueueDbForConcurrentWrites();
  log(`queue initial ${getQueueStatusSummary()}`);
  const recovery = recoverMappedOutputs();
  log(`queue afterRecovery ${getQueueStatusSummary()}`);
  const activeChildren = new Map();
  const activeTasks = new Set();
  const attemptedIds = new Set();
  const runStartedAt = Date.now();
  const durationsMs = [];
  const usageTotals = {
    cachedInputTokens: 0,
    inputTokens: 0,
    outputTokens: 0,
    reasoningOutputTokens: 0,
  };
  let usageSamples = 0;
  let desiredConcurrency = args.concurrency;
  let draining = false;
  let forceStopping = false;
  let stopSignal = null;
  let stopReason = null;
  let completed = 0;
  let promoted = 0;
  let failed = 0;
  let interrupted = 0;
  let catchupStarted = Boolean(args.id);
  let catchupComplete = Boolean(args.id);
  let backlogExhausted = false;
  let refillChild = null;
  let refillMode = null;
  let refillPromise = null;
  let fatalError = null;

  const writeWorkerState = () => {
    writeJsonAtomic(WORKER_STATE_PATH, {
      active: activeChildren.size,
      attempted: attemptedIds.size,
      completed,
      desiredConcurrency,
      draining,
      failed,
      limit: args.limit,
      pid: process.pid,
      promoted,
      refillMode,
      runId: RUN_ID,
      status: draining ? "draining" : "running",
      updatedAt: new Date().toISOString(),
    });
  };

  const removeWorkerState = () => {
    try {
      const state = JSON.parse(fs.readFileSync(WORKER_STATE_PATH, "utf8"));
      if (state.runId === RUN_ID) fs.rmSync(WORKER_STATE_PATH, { force: true });
    } catch {}
  };
  process.once("exit", removeWorkerState);

  const recordMetrics = (durationMs, usage) => {
    if (Number.isFinite(durationMs)) durationsMs.push(durationMs);
    if (!usage) return;

    usageSamples += 1;
    for (const key of Object.keys(usageTotals)) {
      usageTotals[key] += usage[key];
    }
  };

  const logProgress = () => {
    const completionPercent = ((completed / args.limit) * 100).toFixed(1);
    const successPercent =
      completed === 0 ? "0.0" : ((promoted / completed) * 100).toFixed(1);
    log(
      `progress completed=${completed}/${args.limit} (${completionPercent}%) success=${promoted}/${completed} (${successPercent}%) failed=${failed} active=${activeChildren.size} target=${desiredConcurrency}`,
    );
    writeWorkerState();
  };

  const requestDrain = (reason) => {
    if (draining) return;
    draining = true;
    stopReason = reason;
    log(`draining reason=${reason} active=${activeChildren.size}`);
    if (refillChild) terminate(refillChild);
    writeWorkerState();
  };

  const forceStop = (signal) => {
    if (forceStopping) return;
    forceStopping = true;
    draining = true;
    stopSignal = signal;
    stopReason ??= signal;
    log(`force stopping signal=${signal} active=${activeChildren.size}`);
    if (refillChild) terminate(refillChild);
    for (const child of activeChildren.values()) terminate(child);
    writeWorkerState();
  };

  const handleSignal = (signal) => {
    if (draining) {
      forceStop(signal);
      return;
    }
    requestDrain(signal);
  };

  const handleSigint = () => handleSignal("SIGINT");
  const handleSigterm = () => handleSignal("SIGTERM");
  process.on("SIGINT", handleSigint);
  process.on("SIGTERM", handleSigterm);

  log(
    `worker started limit=${args.limit} backlogRefillSize=${args.backlogRefillSize} concurrency=${args.concurrency} model=${args.model} effort=${args.effort} timeoutMinutes=${Math.round(args.timeoutMs / 60_000)} usageIntervalMinutes=${args.usageIntervalMs / 60_000} scheduler=rolling sessionMode=isolated-image-only`,
  );
  writeWorkerState();
  const usageMonitor = createUsageMonitor(args.usageIntervalMs);
  await usageMonitor.sample("start");
  usageMonitor.start();

  const processItem = async (item) => {
    try {
      const result = await generate(item, args, activeChildren);
      promoted += 1;
      completed += 1;
      recordMetrics(result.durationMs, result.usage);
      log(
        `thread finished id=${item.id} session=${result.sessionId} image=yes promoted=yes status=review durationSeconds=${(result.durationMs / 1_000).toFixed(1)} ${formatUsage(result.usage)} output=${result.imagePath}`,
      );
      logProgress();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      if (forceStopping) {
        interrupted += 1;
        const interruption = `Worker interrupted by ${stopSignal ?? "signal"}`;
        try {
          updateStatus(item.id, "pending", { lastError: interruption });
        } catch (databaseError) {
          const databaseMessage =
            databaseError instanceof Error
              ? databaseError.message
              : String(databaseError);
          log(
            `status update failed id=${item.id} intendedStatus=pending error=${databaseMessage}`,
          );
        }
        log(
          `thread interrupted id=${item.id} session=${error?.sessionId ?? "unknown"} signal=${stopSignal ?? "unknown"} status=pending`,
        );
        return;
      }

      failed += 1;
      completed += 1;
      recordMetrics(error?.durationMs, error?.codexUsage);

      try {
        updateStatus(item.id, "failed", { lastError: message });
      } catch (databaseError) {
        const databaseMessage =
          databaseError instanceof Error
            ? databaseError.message
            : String(databaseError);
        log(
          `status update failed id=${item.id} intendedStatus=failed error=${databaseMessage}`,
        );
      }

      log(
        `thread finished id=${item.id} session=${error?.sessionId ?? "unknown"} image=${error?.noImage ? "no" : error?.imageCreated ? "yes" : "unknown"} promoted=no status=failed durationSeconds=${Number.isFinite(error?.durationMs) ? (error.durationMs / 1_000).toFixed(1) : "unknown"} ${formatUsage(error?.codexUsage)} error=${message}`,
      );
      if (error?.noImage) {
        logLines(
          `no-image response id=${item.id}`,
          error.codexResponse || "(no textual response captured)",
        );
        if (error.codexDiagnostics) {
          logLines(`no-image diagnostic id=${item.id}`, error.codexDiagnostics);
        }
      }
      logProgress();
    }
  };

  const startAvailable = () => {
    if (draining || attemptedIds.size >= args.limit) return;

    const slots = Math.min(
      desiredConcurrency - activeTasks.size,
      args.limit - attemptedIds.size,
    );
    if (slots <= 0) return;

    const ids = getClaimableIds({ ...args, limit: slots }, attemptedIds);
    for (const id of ids) {
      const item = claimNextPendingItem(id);
      if (!item) {
        log(`skipped id=${id} reason=not-claimable`);
        continue;
      }

      attemptedIds.add(id);
      let task;
      task = processItem(item).finally(() => {
        activeTasks.delete(task);
        writeWorkerState();
      });
      activeTasks.add(task);
    }
    writeWorkerState();
  };

  const beginRefill = (mode, limit) => {
    if (refillPromise || draining || limit < 1) return;
    refillMode = mode;
    if (mode === "catchup") catchupStarted = true;
    writeWorkerState();

    refillPromise = queueSourceRows(mode, limit, (child) => {
      refillChild = child;
    })
      .then((output) => {
        if (mode === "catchup") catchupComplete = true;
        if (mode === "backlog" && /\bselected=0\b/.test(output)) {
          backlogExhausted = true;
        }
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        if (draining) {
          log(`queue refill interrupted mode=${mode}`);
          return;
        }

        fatalError = error;
        process.exitCode = 1;
        log(`${mode} refill stopped error=${message}`);
        requestDrain(`${mode} refill failed`);
      })
      .finally(() => {
        refillChild = null;
        refillMode = null;
        refillPromise = null;
        writeWorkerState();
      });
  };

  const maybeRefill = () => {
    if (args.id || draining || refillPromise) return;
    const remaining = args.limit - attemptedIds.size;
    if (remaining <= 0) return;

    const pending = getClaimableIds(
      { ...args, id: null, limit: remaining },
      attemptedIds,
    ).length;
    if (!catchupStarted) {
      beginRefill("catchup", remaining);
      return;
    }
    if (!catchupComplete || backlogExhausted) return;

    const lowWater = Math.min(remaining, desiredConcurrency * 2);
    if (pending >= lowWater) return;
    const refillSize = Math.min(
      remaining - pending,
      Math.max(args.backlogRefillSize, desiredConcurrency * 3),
    );
    beginRefill("backlog", refillSize);
  };

  const applyControlCommand = () => {
    if (!fs.existsSync(WORKER_COMMAND_PATH)) return;

    let command;
    try {
      command = JSON.parse(fs.readFileSync(WORKER_COMMAND_PATH, "utf8"));
      fs.rmSync(WORKER_COMMAND_PATH, { force: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log(`control command ignored error=${message}`);
      return;
    }

    if (command.runId !== RUN_ID) {
      log(
        `control command ignored reason=run-mismatch command=${command.runId}`,
      );
      return;
    }
    if (command.command === "drain") {
      requestDrain("control command");
      return;
    }
    if (
      command.command === "concurrency" &&
      Number.isInteger(command.value) &&
      command.value > 0
    ) {
      const previous = desiredConcurrency;
      desiredConcurrency = command.value;
      log(
        `concurrency changed previous=${previous} desired=${desiredConcurrency} active=${activeChildren.size}`,
      );
      writeWorkerState();
      return;
    }
    log(`control command ignored reason=invalid command=${command.command}`);
  };

  const waitForActivity = async () => {
    const waits = [new Promise((resolve) => setTimeout(resolve, 250))];
    waits.push(...activeTasks);
    if (refillPromise) waits.push(refillPromise);
    await Promise.race(waits);
  };

  while (true) {
    applyControlCommand();
    startAvailable();
    maybeRefill();

    if (!draining && attemptedIds.size >= args.limit) {
      requestDrain("limit reached");
    }
    if (
      !draining &&
      args.id &&
      attemptedIds.size === 0 &&
      activeTasks.size === 0
    ) {
      requestDrain("queue item is not claimable");
    }
    if (
      !draining &&
      backlogExhausted &&
      !refillPromise &&
      activeTasks.size === 0 &&
      getClaimableIds({ ...args, id: null, limit: 1 }, attemptedIds).length ===
        0
    ) {
      requestDrain("source backlog exhausted");
    }
    if (draining && activeTasks.size === 0 && !refillPromise) break;
    if (fatalError && activeTasks.size === 0 && !refillPromise) break;

    await waitForActivity();
  }

  await usageMonitor.finish();
  const wallSeconds = (Date.now() - runStartedAt) / 1_000;
  if (durationsMs.length > 0) {
    const sortedDurations = durationsMs
      .map((duration) => duration / 1_000)
      .sort((left, right) => left - right);
    const percentile = (fraction) =>
      sortedDurations[
        Math.min(
          sortedDurations.length - 1,
          Math.floor((sortedDurations.length - 1) * fraction),
        )
      ];
    const average =
      sortedDurations.reduce((sum, duration) => sum + duration, 0) /
      sortedDurations.length;
    const throughput = wallSeconds > 0 ? promoted / (wallSeconds / 60) : 0;

    log(
      `performance wallSeconds=${wallSeconds.toFixed(1)} throughputImagesPerMinute=${throughput.toFixed(2)} latencySecondsMin=${sortedDurations[0].toFixed(1)} latencySecondsAverage=${average.toFixed(1)} latencySecondsP50=${percentile(0.5).toFixed(1)} latencySecondsP95=${percentile(0.95).toFixed(1)} latencySecondsMax=${sortedDurations.at(-1).toFixed(1)} usageSamples=${usageSamples} ${formatUsage(usageSamples > 0 ? usageTotals : null)}`,
    );
  }
  log(`queue finish ${getQueueStatusSummary()}`);
  log(
    `worker finished attempted=${attemptedIds.size} completed=${completed} promoted=${promoted} recovered=${recovery.recovered} recoveryReset=${recovery.reset} failed=${failed} interrupted=${interrupted} stopReason=${stopReason ?? "complete"} successRate=${completed === 0 ? "0.0" : ((promoted / completed) * 100).toFixed(1)}% runLog=${RUN_LOG_PATH} eventsLog=${RUN_EVENTS_PATH}`,
  );
  process.removeListener("SIGINT", handleSigint);
  process.removeListener("SIGTERM", handleSigterm);
  removeWorkerState();
  process.removeListener("exit", removeWorkerState);
  releaseWorkerLock();
  process.removeListener("exit", releaseWorkerLock);
}

await main();
