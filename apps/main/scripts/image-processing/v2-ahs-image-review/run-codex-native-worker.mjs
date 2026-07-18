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
  "--ephemeral",
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

  if (!limit) {
    throw new Error("Pass --limit <count> or --id <queue-id>");
  }

  return {
    concurrency: readPositiveInteger("--concurrency", 10),
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

function removeGeneratedSession(sessionId) {
  const sessionPath = path.resolve(GENERATED_IMAGES_ROOT, sessionId);
  if (path.dirname(sessionPath) !== GENERATED_IMAGES_ROOT) {
    log(`generated cleanup skipped invalid session=${sessionId}`);
    return;
  }

  try {
    fs.rmSync(sessionPath, { recursive: true, force: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(`generated cleanup failed session=${sessionId} error=${message}`);
  }
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
          WHERE "status" IN ('pending', 'failed', 'rejected')
          ORDER BY
            CASE "status"
              WHEN 'failed' THEN 0
              WHEN 'rejected' THEN 1
              ELSE 2
            END,
            "updatedAt" ASC,
            "id" ASC
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

function queueSourceRows(mode, limit = null) {
  log(`queue refill mode=${mode} requested=${limit ?? "all"}`);
  const scriptArgs = [BACKLOG_SCRIPT, "--mode", mode];
  if (limit !== null) scriptArgs.push("--limit", String(limit));

  const output = execFileSync(
    process.execPath,
    [...NODE_SQLITE_ARGS, ...scriptArgs],
    {
      encoding: "utf8",
      env: process.env,
      maxBuffer: 10 * 1024 * 1024,
    },
  );
  if (output.trim()) logLines(`queue ${mode}`, output);

  const selected = Number(output.match(/\bselected=(\d+)/)?.[1] ?? Number.NaN);
  return { selected: Number.isFinite(selected) ? selected : 0 };
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

function recoverMappedOutputs(staleAfterMs) {
  const database = openQueueDb();
  let rows;

  try {
    ensureSchema(database);
    rows = database
      .prepare(
        `
          SELECT "id", "codexNativeAgentId", "updatedAt"
          FROM "v2_image_review_queue"
          WHERE "status" = 'processing'
        `,
      )
      .all();
  } finally {
    database.close();
  }

  let recovered = 0;
  let preserved = 0;
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
          removeGeneratedSession(sessionId);
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
          continue;
        }
      }
    }

    const updatedAtMs = Date.parse(String(row.updatedAt));
    const ageMs = Date.now() - updatedAtMs;
    if (Number.isFinite(updatedAtMs) && ageMs < staleAfterMs) {
      preserved += 1;
      log(
        `recovery preserved id=${id} session=${sessionId ?? "none"} ageSeconds=${Math.round(ageMs / 1_000)} retryAfterSeconds=${Math.ceil((staleAfterMs - ageMs) / 1_000)}`,
      );
      continue;
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

  return { preserved, recovered, reset };
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

      if (pendingError) {
        pendingError.codexResponse = responses.join("\n\n");
        pendingError.codexDiagnostics = diagnostics.join("\n\n");
        pendingError.imageCreated = Boolean(
          sessionId && findGeneratedPng(sessionId),
        );
        pendingError.sessionId = sessionId;
        rejectGeneration(pendingError);
        return;
      }

      if (code !== 0) {
        const imageCreated = Boolean(sessionId && findGeneratedPng(sessionId));
        const error = createGenerationError(
          `Codex exited code=${code} signal=${signal ?? "none"}${
            stderr.trim() ? ` stderr=${stderr.trim()}` : ""
          }`,
          responses.join("\n\n"),
          {
            diagnostics: diagnostics.join("\n\n"),
            noImage: !imageCreated,
            sessionId,
          },
        );
        error.imageCreated = imageCreated;
        error.recoverableImage = imageCreated && signal === null;
        rejectGeneration(error);
        return;
      }

      if (sessionId) {
        const imagePath = findGeneratedPng(sessionId);

        if (!imagePath) {
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
          const promotedImagePath = path.join(
            REVIEW_ROOT,
            "edited",
            `${item.id}.png`,
          );
          removeGeneratedSession(sessionId);
          resolve({
            durationMs: Date.now() - startedAt,
            id: item.id,
            imagePath: promotedImagePath,
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
            error.recoverableImage = true;
            error.sessionId = sessionId;
            rejectGeneration(error);
            return;
          }
        }
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
  log(`run=${RUN_ID} log=${RUN_LOG_PATH} events=${RUN_EVENTS_PATH}`);
  log(
    `paths reviewRoot=${REVIEW_ROOT} queueDb=${REVIEW_DB_PATH} originals=${ORIGINALS_DIR} codexHome=${CODEX_IMAGE_HOME} generated=${GENERATED_IMAGES_ROOT}`,
  );
  logProdCopyAge();
  prepareQueueDbForConcurrentWrites();
  log(`queue initial ${getQueueStatusSummary()}`);
  const recovery = recoverMappedOutputs(args.timeoutMs);
  log(`queue afterRecovery ${getQueueStatusSummary()}`);
  const activeChildren = new Map();
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
  let catchupChecked = false;
  let stopping = false;
  let stopSignal = null;
  let completed = 0;
  let promoted = 0;
  let failed = 0;
  let interrupted = 0;

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
      `progress completed=${completed}/${args.limit} (${completionPercent}%) success=${promoted}/${completed} (${successPercent}%) failed=${failed} active=${activeChildren.size}`,
    );
  };

  const stop = (signal) => {
    if (stopping) return;
    stopping = true;
    stopSignal = signal;
    log(`stopping signal=${signal} active=${activeChildren.size}`);
    for (const child of activeChildren.values()) terminate(child);
  };

  process.once("SIGINT", () => stop("SIGINT"));
  process.once("SIGTERM", () => stop("SIGTERM"));

  log(
    `worker started limit=${args.limit} concurrency=${args.concurrency} model=${args.model} effort=${args.effort} timeoutMinutes=${Math.round(args.timeoutMs / 60_000)} usageIntervalMinutes=${args.usageIntervalMs / 60_000} sessionMode=isolated-image-only`,
  );
  const usageMonitor = createUsageMonitor(args.usageIntervalMs);
  await usageMonitor.sample("start");
  usageMonitor.start();

  const runBatch = async (ids) => {
    let nextIndex = 0;

    const runSlot = async () => {
      while (!stopping) {
        const id = ids[nextIndex];
        nextIndex += 1;
        if (!id) return;

        const item = claimNextPendingItem(id);
        if (!item) {
          log(`skipped id=${id} reason=not-claimable`);
          continue;
        }

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
          const message =
            error instanceof Error ? error.message : String(error);

          if (stopping) {
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
            continue;
          }

          const status = error?.recoverableImage ? "processing" : "failed";
          failed += 1;
          completed += 1;
          recordMetrics(error?.durationMs, error?.codexUsage);

          try {
            const statusOptions = { lastError: message };
            if (error?.imageCreated) {
              statusOptions.codexNativeAgentId = error.sessionId;
            }
            updateStatus(item.id, status, statusOptions);
          } catch (databaseError) {
            const databaseMessage =
              databaseError instanceof Error
                ? databaseError.message
                : String(databaseError);
            log(
              `status update failed id=${item.id} intendedStatus=${status} error=${databaseMessage}`,
            );
          }

          log(
            `thread finished id=${item.id} session=${error?.sessionId ?? "unknown"} image=${error?.noImage ? "no" : error?.imageCreated ? "yes" : "unknown"} promoted=no status=${status} durationSeconds=${Number.isFinite(error?.durationMs) ? (error.durationMs / 1_000).toFixed(1) : "unknown"} ${formatUsage(error?.codexUsage)} error=${message}`,
          );
          if (error?.noImage) {
            logLines(
              `no-image response id=${item.id}`,
              error.codexResponse || "(no textual response captured)",
            );
            if (error.codexDiagnostics) {
              logLines(
                `no-image diagnostic id=${item.id}`,
                error.codexDiagnostics,
              );
            }
          }
          logProgress();
        }
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(args.concurrency, ids.length) }, runSlot),
    );
  };

  while (!stopping && attemptedIds.size < args.limit) {
    const remaining = args.limit - attemptedIds.size;
    let ids = getClaimableIds({ ...args, limit: remaining }, attemptedIds);

    if (ids.length === 0 && !args.id && !catchupChecked) {
      catchupChecked = true;
      try {
        queueSourceRows("catchup");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        log(`catchup check stopped error=${message}`);
        process.exitCode = 1;
        break;
      }
      ids = getClaimableIds({ ...args, limit: remaining }, attemptedIds);
    }

    if (ids.length === 0 && !args.id && catchupChecked) {
      let refillSelected = 0;
      do {
        try {
          ({ selected: refillSelected } = queueSourceRows(
            "backlog",
            remaining,
          ));
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          log(`backlog refill stopped error=${message}`);
          process.exitCode = 1;
          break;
        }
        ids = getClaimableIds({ ...args, limit: remaining }, attemptedIds);
      } while (ids.length === 0 && refillSelected > 0);
    }

    if (ids.length === 0) {
      log("no claimable queue rows");
      break;
    }

    for (const id of ids) attemptedIds.add(id);
    await runBatch(ids);
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
    `worker finished attempted=${attemptedIds.size} completed=${completed} promoted=${promoted} recovered=${recovery.recovered} recoveryPreserved=${recovery.preserved} recoveryReset=${recovery.reset} failed=${failed} interrupted=${interrupted} successRate=${completed === 0 ? "0.0" : ((promoted / completed) * 100).toFixed(1)}% runLog=${RUN_LOG_PATH} eventsLog=${RUN_EVENTS_PATH}`,
  );
  releaseWorkerLock();
  process.removeListener("exit", releaseWorkerLock);
  if (failed > 0 && !stopping) process.exitCode = 1;
}

await main();
