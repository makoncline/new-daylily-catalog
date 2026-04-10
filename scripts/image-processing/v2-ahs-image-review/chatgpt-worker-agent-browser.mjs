import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  ensureSchema,
  openQueueDb,
  PROD_COPY_DB_PATH,
  REPO_ROOT,
  REVIEW_EDITED_DIR,
  updateStatus,
} from "./review-db.mjs";

const AGENT_BROWSER_BIN = "/Users/makon/.npm-global/bin/agent-browser";
const AGENT_BROWSER_SESSION = "chatgpt-ai";
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const CHROME_DEVTOOLS_PORT_FILE = path.join(
  homedir(),
  "Library",
  "Application Support",
  "Google",
  "Chrome",
  "DevToolsActivePort",
);
const WORKER_LOG_PATH = path.join(
  REPO_ROOT,
  "downloads",
  "v2-ahs-image-review",
  "chatgpt-worker.log",
);
const DEBUG_ARTIFACTS_DIR = path.join(
  REPO_ROOT,
  "downloads",
  "v2-ahs-image-review",
  "debug",
);
const DEFAULT_PROJECT_URL =
  "https://chatgpt.com/g/g-p-699f1be0ab188191b6684cd2d8da6013-daylily-images/project";
const DEFAULT_PROMPT =
  "generate an edited image (do not edit the original. do not reframe or crop origional. do not use code execution). remove all text, zoom out, improve quality";
const PROMPT_VERSION = "chatgpt-project-create-image-v3";
const MAX_WRONG_MODE_RETRIES = 2;
const MAX_RATE_LIMIT_RETRIES = 6;
const DEFAULT_DELAY_MIN_SECONDS = 180;
const DEFAULT_DELAY_MAX_SECONDS = 360;
const DEFAULT_RATE_LIMIT_COOLDOWN_SECONDS = 900;
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36";
const CHATGPT_ORIGIN = "https://chatgpt.com/";
const NOTIFY_BIN = "/Users/makon/.local/bin/notify";
const AGENT_BROWSER_MAX_BUFFER = 64 * 1024 * 1024;
let activeProjectUrl = DEFAULT_PROJECT_URL;
let activeProjectPrefix = DEFAULT_PROJECT_URL.replace(/\/project$/, "");

class WrongChatGptModeError extends Error {
  constructor(message = "ChatGPT returned image-edit mode instead of image generation") {
    super(message);
    this.name = "WrongChatGptModeError";
  }
}

class ChatGptRateLimitError extends Error {
  constructor(message = "ChatGPT rate-limited the project conversation flow") {
    super(message);
    this.name = "ChatGptRateLimitError";
  }
}

class BrowserApprovalRequiredError extends Error {
  constructor(message = "Chrome requires manual debugging approval before the worker can continue") {
    super(message);
    this.name = "BrowserApprovalRequiredError";
  }
}

function isBrowserApprovalErrorText(errorText) {
  return errorText.includes("did you click Allow in Chrome?");
}

function formatLogArg(value) {
  if (typeof value === "string") {
    return value;
  }

  if (value instanceof Error) {
    return value.stack || value.message;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function appendWorkerLog(level, args) {
  try {
    fs.mkdirSync(path.dirname(WORKER_LOG_PATH), { recursive: true });
    fs.appendFileSync(
      WORKER_LOG_PATH,
      `[${new Date().toISOString()}] ${level} ${args.map(formatLogArg).join(" ")}\n`,
    );
  } catch {}
}

function sendNotify(title, message) {
  if (!fs.existsSync(NOTIFY_BIN)) {
    return;
  }

  try {
    execFileSync(NOTIFY_BIN, ["--title", title, message], {
      encoding: "utf8",
    });
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : String(error);
    console.warn(`[chatgpt-image-worker] notify failed: ${detail}`);
  }
}

const originalConsoleLog = console.log.bind(console);
const originalConsoleWarn = console.warn.bind(console);
const originalConsoleError = console.error.bind(console);

console.log = (...args) => {
  appendWorkerLog("INFO", args);
  originalConsoleLog(...args);
};

console.warn = (...args) => {
  appendWorkerLog("WARN", args);
  originalConsoleWarn(...args);
};

console.error = (...args) => {
  appendWorkerLog("ERROR", args);
  originalConsoleError(...args);
};

function parseArgs() {
  const args = process.argv.slice(2).filter((arg) => arg !== "--");
  let limit = 1;
  let preferredId = null;
  let projectUrl = DEFAULT_PROJECT_URL;
  let prompt = DEFAULT_PROMPT;
  let delayMinSeconds = DEFAULT_DELAY_MIN_SECONDS;
  let delayMaxSeconds = DEFAULT_DELAY_MAX_SECONDS;
  let rateLimitCooldownSeconds = DEFAULT_RATE_LIMIT_COOLDOWN_SECONDS;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--limit") {
      const raw = Number(args[index + 1] ?? "");
      if (!Number.isInteger(raw) || raw < 1) {
        throw new Error(`Invalid --limit value: ${args[index + 1]}`);
      }
      limit = raw;
      index += 1;
      continue;
    }

    if (arg.startsWith("--limit=")) {
      const raw = Number(arg.slice("--limit=".length));
      if (!Number.isInteger(raw) || raw < 1) {
        throw new Error(`Invalid --limit value: ${arg}`);
      }
      limit = raw;
      continue;
    }

    if (arg === "--id") {
      preferredId = String(args[index + 1] ?? "").trim() || null;
      index += 1;
      continue;
    }

    if (arg.startsWith("--id=")) {
      preferredId = arg.slice("--id=".length).trim() || null;
      continue;
    }

    if (arg === "--project-url") {
      const raw = String(args[index + 1] ?? "").trim();
      if (!raw) {
        throw new Error("Missing --project-url value");
      }
      projectUrl = raw;
      index += 1;
      continue;
    }

    if (arg.startsWith("--project-url=")) {
      const raw = arg.slice("--project-url=".length).trim();
      if (!raw) {
        throw new Error(`Invalid --project-url value: ${arg}`);
      }
      projectUrl = raw;
      continue;
    }

    if (arg === "--prompt") {
      const raw = String(args[index + 1] ?? "").trim();
      if (!raw) {
        throw new Error("Missing --prompt value");
      }
      prompt = raw;
      index += 1;
      continue;
    }

    if (arg.startsWith("--prompt=")) {
      const raw = arg.slice("--prompt=".length).trim();
      if (!raw) {
        throw new Error(`Invalid --prompt value: ${arg}`);
      }
      prompt = raw;
      continue;
    }

    if (arg === "--delay-min-seconds") {
      const raw = Number(args[index + 1] ?? "");
      if (!Number.isFinite(raw) || raw < 0) {
        throw new Error(`Invalid --delay-min-seconds value: ${args[index + 1]}`);
      }
      delayMinSeconds = raw;
      index += 1;
      continue;
    }

    if (arg.startsWith("--delay-min-seconds=")) {
      const raw = Number(arg.slice("--delay-min-seconds=".length));
      if (!Number.isFinite(raw) || raw < 0) {
        throw new Error(`Invalid --delay-min-seconds value: ${arg}`);
      }
      delayMinSeconds = raw;
      continue;
    }

    if (arg === "--delay-max-seconds") {
      const raw = Number(args[index + 1] ?? "");
      if (!Number.isFinite(raw) || raw < 0) {
        throw new Error(`Invalid --delay-max-seconds value: ${args[index + 1]}`);
      }
      delayMaxSeconds = raw;
      index += 1;
      continue;
    }

    if (arg.startsWith("--delay-max-seconds=")) {
      const raw = Number(arg.slice("--delay-max-seconds=".length));
      if (!Number.isFinite(raw) || raw < 0) {
        throw new Error(`Invalid --delay-max-seconds value: ${arg}`);
      }
      delayMaxSeconds = raw;
      continue;
    }

    if (arg === "--rate-limit-cooldown-seconds") {
      const raw = Number(args[index + 1] ?? "");
      if (!Number.isFinite(raw) || raw < 0) {
        throw new Error(
          `Invalid --rate-limit-cooldown-seconds value: ${args[index + 1]}`,
        );
      }
      rateLimitCooldownSeconds = raw;
      index += 1;
      continue;
    }

    if (arg.startsWith("--rate-limit-cooldown-seconds=")) {
      const raw = Number(arg.slice("--rate-limit-cooldown-seconds=".length));
      if (!Number.isFinite(raw) || raw < 0) {
        throw new Error(`Invalid --rate-limit-cooldown-seconds value: ${arg}`);
      }
      rateLimitCooldownSeconds = raw;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (delayMaxSeconds < delayMinSeconds) {
    throw new Error(
      `Invalid delay range: max ${delayMaxSeconds}s is less than min ${delayMinSeconds}s`,
    );
  }

  return {
    delayMaxSeconds,
    delayMinSeconds,
    limit,
    preferredId,
    prompt,
    projectUrl,
    projectPrefix: projectUrl.replace(/\/project$/, ""),
    rateLimitCooldownSeconds,
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRandomIntInclusive(min, max) {
  const lower = Math.ceil(min);
  const upper = Math.floor(max);

  if (upper <= lower) {
    return lower;
  }

  return Math.floor(Math.random() * (upper - lower + 1)) + lower;
}

async function cooldownBetweenItems(delayMinSeconds, delayMaxSeconds, reason) {
  const delaySeconds = getRandomIntInclusive(delayMinSeconds, delayMaxSeconds);
  console.log(
    `[chatgpt-image-worker] cooling down for ${delaySeconds}s after ${reason}`,
  );
  await sleep(delaySeconds * 1000);
}

async function cooldownAfterRateLimit(rateLimitCooldownSeconds) {
  console.log(
    `[chatgpt-image-worker] rate limited; cooling down for ${rateLimitCooldownSeconds}s before retry`,
  );
  await sleep(rateLimitCooldownSeconds * 1000);
}

function execCdp(args) {
  throw new Error(`execCdp is not used in the agent-browser worker: ${args.join(" ")}`);
}

function notifyBrowserApprovalRequired(message, item = null) {
  const details = item
    ? `id=${item.id}${item.postTitle ? ` ${item.postTitle}` : ""}. ${message}`
    : message;

  sendNotify("ChatGPT worker needs Chrome approval", details);
}

function execAgentBrowser(args, options = {}) {
  const { input = null, json = false } = options;
  const baseArgs = ["--session", AGENT_BROWSER_SESSION];

  if (json) {
    baseArgs.push("--json");
  }

  try {
    return execFileSync(AGENT_BROWSER_BIN, [...baseArgs, ...args], {
      encoding: "utf8",
      input,
      maxBuffer: AGENT_BROWSER_MAX_BUFFER,
    }).trim();
  } catch (error) {
    const errorText =
      error instanceof Error
        ? `${error.message}\n${String(error.stderr ?? "")}`
        : String(error);

    if (isBrowserApprovalErrorText(errorText)) {
      throw new BrowserApprovalRequiredError(
        "Chrome needs the Allow debugging confirmation before the worker can continue.",
      );
    }

    throw error;
  }
}

function execAgentBrowserJson(args) {
  const output = execAgentBrowser(args, { json: true });
  return JSON.parse(output);
}

function browserEval(script) {
  return execAgentBrowser(["eval", "--stdin"], { input: script });
}

function parseBrowserEvalValue(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function browserEvalValue(script) {
  return parseBrowserEvalValue(browserEval(script));
}

function browserEvalBoolean(script) {
  return Boolean(browserEvalValue(script));
}

function browserEvalJson(script) {
  const value = browserEvalValue(script);
  if (typeof value === "string") {
    return JSON.parse(value);
  }
  return value;
}

function browserGetUrl() {
  return execAgentBrowser(["get", "url"]);
}

function browserGetCdpUrl() {
  return execAgentBrowser(["get", "cdp-url"]);
}

function browserGetTitle() {
  return execAgentBrowser(["get", "title"]);
}

function browserClick(selector) {
  execAgentBrowser(["click", selector]);
}

function browserUpload(selector, filePath) {
  execAgentBrowser(["upload", selector, filePath]);
}

function browserInsertText(text) {
  execAgentBrowser(["keyboard", "inserttext", text]);
}

function browserGetCookies() {
  const result = execAgentBrowserJson(["cookies", "get"]);
  return Array.isArray(result) ? result : [];
}

function toSafeDebugSlug(value, fallback = "debug") {
  const normalized = String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return normalized || fallback;
}

async function captureDebugArtifacts(
  target,
  item,
  {
    label = "failure",
    error = null,
    conversationUrl = null,
  } = {},
) {
  const timestamp = new Date().toISOString();
  const stamp = timestamp.replace(/[:.]/g, "-");
  const reasonSlug = toSafeDebugSlug(label);
  const baseName = `${stamp}-${item.id}-${reasonSlug}`;
  const textPath = path.join(DEBUG_ARTIFACTS_DIR, `${baseName}.txt`);
  const screenshotPath = path.join(DEBUG_ARTIFACTS_DIR, `${baseName}.png`);
  const lines = [
    `timestamp: ${timestamp}`,
    `id: ${item.id}`,
    `postTitle: ${item.postTitle ?? ""}`,
    `label: ${label}`,
  ];

  if (error instanceof Error) {
    lines.push(`errorName: ${error.name}`);
    lines.push(`errorMessage: ${error.message}`);
  } else if (error) {
    lines.push(`errorMessage: ${String(error)}`);
  }

  if (conversationUrl) {
    lines.push(`conversationUrl: ${conversationUrl}`);
  }

  fs.mkdirSync(DEBUG_ARTIFACTS_DIR, { recursive: true });

  try {
    lines.push(`currentUrl: ${browserGetUrl()}`);
  } catch (snapshotError) {
    lines.push(`currentUrlError: ${snapshotError instanceof Error ? snapshotError.message : String(snapshotError)}`);
  }

  try {
    lines.push(`pageTitle: ${browserGetTitle()}`);
  } catch (snapshotError) {
    lines.push(`pageTitleError: ${snapshotError instanceof Error ? snapshotError.message : String(snapshotError)}`);
  }

  try {
    const bodyState = browserEvalJson(
      `JSON.stringify({
        bodyTail: document.body.innerText.slice(-3000),
        bodyHead: document.body.innerText.slice(0, 1000),
      })`,
    );

    if (typeof bodyState?.bodyHead === "string") {
      lines.push("");
      lines.push("bodyHead:");
      lines.push(bodyState.bodyHead);
    }

    if (typeof bodyState?.bodyTail === "string") {
      lines.push("");
      lines.push("bodyTail:");
      lines.push(bodyState.bodyTail);
    }
  } catch (snapshotError) {
    lines.push(`bodyTextError: ${snapshotError instanceof Error ? snapshotError.message : String(snapshotError)}`);
  }

  try {
    const snapshotText = execAgentBrowser(["snapshot", "-i", "--urls"]);
    lines.push("");
    lines.push("snapshot:");
    lines.push(snapshotText);
  } catch (snapshotError) {
    lines.push(`snapshotError: ${snapshotError instanceof Error ? snapshotError.message : String(snapshotError)}`);
  }

  let screenshotSaved = false;

  try {
    execAgentBrowser(["screenshot", "--full", screenshotPath]);
    screenshotSaved = fs.existsSync(screenshotPath);
  } catch (snapshotError) {
    lines.push(`screenshotError: ${snapshotError instanceof Error ? snapshotError.message : String(snapshotError)}`);
  }

  fs.writeFileSync(textPath, `${lines.join("\n")}\n`, "utf8");

  return {
    textPath,
    screenshotPath: screenshotSaved ? screenshotPath : null,
  };
}

function readChromeDevtoolsPort() {
  if (!fs.existsSync(CHROME_DEVTOOLS_PORT_FILE)) {
    throw new Error(
      `Chrome DevToolsActivePort file not found at ${CHROME_DEVTOOLS_PORT_FILE}. Start Chrome with remote debugging enabled and log into ChatGPT first.`,
    );
  }

  const port = fs.readFileSync(CHROME_DEVTOOLS_PORT_FILE, "utf8").trim().split("\n")[0]?.trim();

  if (!port) {
    throw new Error(`Could not read a Chrome CDP port from ${CHROME_DEVTOOLS_PORT_FILE}.`);
  }

  return port;
}

function connectAgentBrowserSession() {
  const port = readChromeDevtoolsPort();
  let existingCdpUrl = null;

  try {
    existingCdpUrl = browserGetCdpUrl();
  } catch {
    existingCdpUrl = null;
  }

  if (existingCdpUrl?.includes(`:${port}/`)) {
    console.log(
      `[chatgpt-image-worker] reusing agent-browser session on port ${port}`,
    );
    return;
  }

  if (existingCdpUrl) {
    console.log(
      `[chatgpt-image-worker] reconnecting agent-browser session from ${existingCdpUrl} to port ${port}`,
    );
  }

  execAgentBrowser(["connect", port]);
}

async function waitFor(description, callback, timeoutMs = 30000, intervalMs = 500) {
  const startedAt = Date.now();
  let lastError = null;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const result = await callback();
      if (result) {
        return result;
      }
    } catch (error) {
      lastError = error;
    }

    await sleep(intervalMs);
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error(`Timed out waiting for ${description}`);
}

function getQueueItem(database, id) {
  const row = database
    .prepare(`
      SELECT
        "id",
        "postTitle",
        "originalPath",
        "editedPath",
        "status",
        "attempts",
        "lastError",
        "promptVersion",
        "createdAt",
        "updatedAt"
      FROM "v2_image_review_queue"
      WHERE "id" = ?
    `)
    .get(id);

  if (!row) {
    return null;
  }

  return {
    id: String(row.id),
    postTitle: typeof row.postTitle === "string" ? row.postTitle : null,
    originalPath: String(row.originalPath),
    editedPath: typeof row.editedPath === "string" ? row.editedPath : null,
    status: String(row.status),
    attempts: Number(row.attempts ?? 0),
    lastError: typeof row.lastError === "string" ? row.lastError : null,
    promptVersion:
      typeof row.promptVersion === "string" ? row.promptVersion : null,
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function claimNextListingLinkedItem(preferredId = null) {
  const database = openQueueDb();
  const escapedProdPath = PROD_COPY_DB_PATH.replaceAll("'", "''");

  try {
    ensureSchema(database);
    database.exec(`ATTACH DATABASE '${escapedProdPath}' AS "prod"`);
    database.exec("BEGIN IMMEDIATE TRANSACTION");

    const row = preferredId
      ? database
          .prepare(`
            SELECT "id"
            FROM "v2_image_review_queue"
            WHERE "id" = ?
              AND "status" IN ('pending', 'failed', 'rejected')
            LIMIT 1
          `)
          .get(preferredId)
      : database
          .prepare(`
            SELECT q."id"
            FROM prod."Listing" l
            JOIN prod."CultivarReference" cr
              ON cr."id" = l."cultivarReferenceId"
            JOIN "v2_image_review_queue" q
              ON q."id" = CAST(cr."v2AhsCultivarId" AS TEXT)
            WHERE cr."v2AhsCultivarId" IS NOT NULL
              AND q."status" IN ('pending', 'failed', 'rejected')
            GROUP BY q."id", q."status", q."updatedAt"
            ORDER BY
              CASE q."status"
                WHEN 'pending' THEN 0
                WHEN 'rejected' THEN 1
                WHEN 'failed' THEN 2
                ELSE 3
              END,
              q."updatedAt" ASC,
              q."id" ASC
            LIMIT 1
          `)
          .get();

    if (!row?.id) {
      database.exec("COMMIT");
      return null;
    }

    const item = getQueueItem(database, String(row.id));

    if (!item) {
      database.exec("COMMIT");
      return null;
    }

    database
      .prepare(`
        UPDATE "v2_image_review_queue"
        SET
          "status" = 'processing',
          "lastError" = NULL,
          "attempts" = "attempts" + 1,
          "updatedAt" = datetime('now')
        WHERE "id" = ?
      `)
      .run(item.id);

    database.exec("COMMIT");

    return {
      ...item,
      status: "processing",
      attempts: item.attempts + 1,
      lastError: null,
    };
  } catch (error) {
    try {
      database.exec("ROLLBACK");
    } catch {}
    throw error;
  } finally {
    database.close();
  }
}

async function waitForProjectUrl(target, projectUrl) {
  await waitFor(
    "project page",
    async () => {
      const url = browserGetUrl();
      return url === projectUrl;
    },
    20000,
    500,
  );
}

async function clickProjectHomeLink(target, projectUrl) {
  const expectedPath = projectUrl.replace("https://chatgpt.com", "");

  try {
    await waitFor(
      "project home link",
      async () => {
        return browserEvalBoolean(
          `!!(() => {
            return (
              document.querySelector(${JSON.stringify(`a[aria-label="Open daylily images project"][href="${expectedPath}"]`)}) ||
              document.querySelector('a[aria-label="Open daylily images project"]') ||
              [...document.querySelectorAll('a[href]')].find((link) => {
                const href = link.getAttribute('href') || '';
                const label = (link.getAttribute('aria-label') || link.innerText || '').trim();
                return href.includes('/daylily-images/project') || label === 'Open daylily images project';
              })
            );
          })()`,
        );
      },
      5000,
      250,
    );
  } catch {
    return false;
  }

  return browserEvalBoolean(
      `(() => {
        const link =
          document.querySelector(${JSON.stringify(`a[aria-label="Open daylily images project"][href="${expectedPath}"]`)}) ||
          document.querySelector('a[aria-label="Open daylily images project"]') ||
          [...document.querySelectorAll('a[href]')].find((node) => {
            const href = node.getAttribute('href') || '';
            const label = (node.getAttribute('aria-label') || node.innerText || '').trim();
            return href.includes('/daylily-images/project') || label === 'Open daylily images project';
          });
        if (!link) {
          return "false";
        }
        const href = link.href || link.getAttribute('href') || "";
        if (!href) {
          return "false";
        }
        window.location.href = href;
        return true;
      })()`,
  );
}

async function ensureProjectPage(target, projectUrl, projectPrefix) {
  const currentUrl = browserGetUrl();

  if (currentUrl === projectUrl) {
    return;
  }

  if (currentUrl.startsWith(`${projectPrefix}/c/`)) {
    const clickedProjectLink = await clickProjectHomeLink(target, projectUrl);

    if (clickedProjectLink) {
      await waitForProjectUrl(target, projectUrl);
      return;
    }
  }

  throw new Error(
    `Expected project page or project conversation, but found ${currentUrl}. Return the dedicated ChatGPT Chrome tab to the daylily-images project before continuing.`,
  );
}

async function openComposerMenu(target) {
  await waitFor(
    "composer plus button",
    async () => {
      return browserEvalBoolean(
        `!!(() => {
          const byId = document.getElementById("composer-plus-btn");
          if (byId) {
            return byId;
          }
          return [...document.querySelectorAll("button")].find((button) => {
            const label = (
              button.getAttribute("aria-label") ||
              button.innerText ||
              ""
            ).trim();
            return label === "Add files and more";
          });
        })()`,
      );
    },
    20000,
    300,
  );

  const plusSelector = browserEvalValue(
    `(() => {
      if (document.getElementById("composer-plus-btn")) {
        return "#composer-plus-btn";
      }

      const button = [...document.querySelectorAll("button")].find((node) => {
        const label = (
          node.getAttribute("aria-label") ||
          node.innerText ||
          ""
        ).trim();
        return label === "Add files and more";
      });

      if (!button) {
        return null;
      }

      button.setAttribute("data-codex-composer-plus", "true");
      return '[data-codex-composer-plus="true"]';
    })()`,
  );

  if (typeof plusSelector !== "string" || !plusSelector) {
    throw new Error("Could not find composer plus button");
  }

  try {
    browserClick(plusSelector);
  } finally {
    browserEval(
      `document.querySelector('[data-codex-composer-plus="true"]')?.removeAttribute("data-codex-composer-plus")`,
    );
  }

  return waitFor(
    "Create image menu",
    async () => {
      const menuState = browserEvalJson(
        `JSON.stringify((() => {
          const item = [...document.querySelectorAll("[role=menuitemradio]")].find(
            (node) => node.innerText && node.innerText.includes("Create image"),
          );
          if (!item) {
            return null;
          }
          return {
            checked: item.getAttribute("aria-checked") === "true",
          };
        })())`,
      );

      return menuState && menuState !== "null" ? menuState : null;
    },
    10000,
    300,
  );
}

async function isCreateImageModeActive(target) {
  return browserEvalBoolean(
    `!!document.querySelector('button[aria-label="Image, click to remove"]')`,
  );
}

async function focusPromptEditor(target) {
  await waitFor(
    "prompt editor",
    async () => {
      return browserEvalBoolean(
        `!!document.getElementById("prompt-textarea")`,
      );
    },
    10000,
    300,
  );

  browserEval(
    `(() => {
      const editor = document.getElementById("prompt-textarea");
      if (!editor) {
        return "";
      }
      editor.click();
      editor.focus?.();
      return "ok";
    })()`,
  );
}

async function resetComposerDraft(target) {
  while (true) {
    const removed = browserEvalBoolean(
      `(() => {
        const button = [...document.querySelectorAll("button")].find((node) =>
          (node.getAttribute("aria-label") || "").includes("Remove file "),
        );
        if (!button) {
          return false;
        }
        button.click();
        return true;
      })()`,
    );

    if (!removed) {
      break;
    }
    await sleep(300);
  }
}

async function ensureCreateImageMode(target) {
  if (await isCreateImageModeActive(target)) {
    return;
  }

  const menuState = await openComposerMenu(target);

  if (!menuState.checked) {
    const menuSelector = browserEvalValue(
      `(() => {
        const item = [...document.querySelectorAll("[role=menuitemradio]")].find(
          (node) => node.innerText && node.innerText.includes("Create image"),
        );
        if (!item) {
          return null;
        }
        item.setAttribute("data-codex-create-image-item", "true");
        return '[data-codex-create-image-item="true"]';
      })()`,
    );

    if (typeof menuSelector !== "string" || !menuSelector) {
      throw new Error("Could not find Create image menu item");
    }

    try {
      browserClick(menuSelector);
    } finally {
      browserEval(
        `document.querySelector('[data-codex-create-image-item="true"]')?.removeAttribute("data-codex-create-image-item")`,
      );
    }

    await sleep(500);
  }

  await waitFor(
    "create image mode",
    async () => isCreateImageModeActive(target),
    10000,
    300,
  );
}

async function uploadFile(target, filePath) {
  browserUpload("#upload-photos", filePath);

  const fileName = path.basename(filePath);

  await waitFor(
    `${fileName} attachment`,
    async () => {
      return browserEvalBoolean(
        `!![...document.querySelectorAll("button")].find((button) =>
          (button.getAttribute("aria-label") || button.innerText || "").includes("Remove file") &&
          (button.getAttribute("aria-label") || button.innerText || "").includes(${JSON.stringify(fileName)}),
        )`,
      );
    },
    15000,
    400,
  );
}

async function fillPromptAndSend(target, prompt) {
  await focusPromptEditor(target);
  browserInsertText(prompt);

  await waitFor(
    "prompt text in composer",
    async () => {
      return browserEvalBoolean(
        `(
          (document.getElementById("prompt-textarea")?.innerText || "").includes(${JSON.stringify(prompt)}) ||
          (document.querySelector('textarea[aria-label="New chat in daylily images"]')?.value || "").includes(${JSON.stringify(prompt)})
        )`,
      );
    },
    10000,
    300,
  );

  await waitFor(
    "enabled send button",
    async () => {
      return browserEvalBoolean(
        `(() => {
          const button = document.querySelector('button[aria-label="Send prompt"]');
          return button ? !button.disabled : false;
        })()`,
      );
    },
    15000,
    400,
  );

  browserEval(
    `(() => {
      const button = document.querySelector('button[aria-label="Send prompt"]');
      if (!button) {
        return "";
      }
      button.click();
      return "ok";
    })()`,
  );
}

async function waitForConversationUrl(target, projectPrefix) {
  return waitFor(
    "conversation url",
    async () => {
      const url = browserGetUrl();
      return url.startsWith(`${projectPrefix}/c/`) ? url : null;
    },
    30000,
    500,
  );
}

function getCurrentConversationUrl(target, projectPrefix) {
  try {
    const url = browserGetUrl();
    return url.startsWith(`${projectPrefix}/c/`) ? url : null;
  } catch {
    return null;
  }
}

async function dismissRateLimitModal(target) {
  const clicked = browserEvalBoolean(
    `(() => {
      const button = [...document.querySelectorAll("button")].find((node) =>
        (node.innerText || node.getAttribute("aria-label") || "").trim() === "Got it",
      );
      if (!button) {
        return false;
      }
      button.click();
      return true;
    })()`,
  );

  if (!clicked) {
    return false;
  }

  await sleep(500);
  return true;
}

async function clickSkipButton(target) {
  const clicked = browserEvalBoolean(
    `(() => {
      const button = [...document.querySelectorAll("button")].find((node) =>
        (node.innerText || node.getAttribute("aria-label") || "").trim() === "Skip",
      );
      if (!button) {
        return false;
      }
      button.click();
      return true;
    })()`,
  );

  if (!clicked) {
    return false;
  }

  await sleep(1000);
  return true;
}

async function waitForGeneratedImage(target) {
  const result = await waitFor(
    "generated image",
    async () => {
      const result = browserEvalJson(
          `JSON.stringify({
            generatedImages: [...new Map(
              [...document.querySelectorAll("img")]
                .filter((img) => (img.alt || "").startsWith("Generated image:"))
                .map((img) => {
                  const src = img.currentSrc || img.src || "";
                  return src
                    ? [
                        src,
                        {
                          alt: img.alt || "",
                          src,
                        },
                      ]
                    : null;
                })
                .filter(Boolean),
            ).values()],
            uploadedSrc:
              [...document.querySelectorAll("img")].find((img) =>
                (img.alt || "") === "Uploaded image",
              )?.currentSrc ||
              [...document.querySelectorAll("img")].find((img) =>
                (img.alt || "") === "Uploaded image",
              )?.src ||
              null,
            editedDownloadVisible: !![...document.querySelectorAll("button")].find(
              (button) =>
                (button.innerText || button.getAttribute("aria-label") || "").includes(
                  "Download the edited image",
                ),
            ),
            plainDownloadVisible: !![...document.querySelectorAll("button")].find(
              (button) =>
                (button.innerText || button.getAttribute("aria-label") || "").includes(
                  "Download the image",
                ),
            ),
            skipVisible: !![...document.querySelectorAll("button")].find(
              (button) =>
                (button.innerText || button.getAttribute("aria-label") || "").trim() ===
                "Skip",
            ),
            rateLimitVisible:
              document.body.innerText.includes("Too Many Requests") ||
              document.body.innerText.includes(
                "temporarily limited access to your conversations",
              ),
            gotItVisible: !![...document.querySelectorAll("button")].find(
              (button) =>
                (button.innerText || button.getAttribute("aria-label") || "").trim() ===
                "Got it",
            ),
            resourceUrls: performance
              .getEntriesByType("resource")
              .map((entry) => entry.name)
              .filter(
                (name) =>
                  name.includes("/backend-api/estuary/content?id=file_") &&
                  name.includes("p=fs") &&
                  !name.includes("gizmo_id="),
              ),
            bodyTail: document.body.innerText.slice(-1500),
          })`,
      );
      const generatedImages = Array.isArray(result.generatedImages)
        ? result.generatedImages.filter(
            (image) =>
              image &&
              typeof image.src === "string" &&
              image.src &&
              image.src !== result.uploadedSrc,
          )
        : [];

      if (result.editedDownloadVisible) {
        return {
          kind: "wrong-mode",
        };
      }

      if (result.rateLimitVisible) {
        return {
          kind: "rate-limit",
          gotItVisible: result.gotItVisible,
        };
      }

      if (result.skipVisible) {
        const clickedSkip = await clickSkipButton(target);

        if (clickedSkip) {
          console.warn(
            "[chatgpt-image-worker] encountered image-choice screen; clicked Skip and continuing to wait",
          );
        }

        return null;
      }

      if (generatedImages.length > 0) {
        return {
          kind: "generated",
          payload: {
            ...result,
            generatedImages,
            generatedSrc: generatedImages[0].src,
          },
        };
      }

      if (result.plainDownloadVisible && Array.isArray(result.resourceUrls)) {
        const generatedCandidate = [...result.resourceUrls]
          .reverse()
          .find((url) => url !== result.uploadedSrc);

        if (generatedCandidate) {
          return {
            kind: "generated",
            payload: {
              ...result,
              generatedSrc: generatedCandidate,
            },
          };
        }
      }

      if (result.bodyTail.includes("Something went wrong")) {
        return {
          kind: "error",
          message: "ChatGPT returned an error while generating the image",
        };
      }

      return null;
    },
    300000,
    2000,
  );

  if (result.kind === "wrong-mode") {
    throw new WrongChatGptModeError();
  }

  if (result.kind === "rate-limit") {
    if (result.gotItVisible) {
      await dismissRateLimitModal(target);
    }
    throw new ChatGptRateLimitError();
  }

  if (result.kind === "error") {
    throw new Error(result.message);
  }

  return result.payload;
}

function getChatGptCookies(target) {
  return browserGetCookies().filter((cookie) => {
    const domain = typeof cookie?.domain === "string" ? cookie.domain : "";
    return domain.includes("chatgpt.com");
  });
}

function removeExistingEditedVariants(id) {
  for (const entry of fs.readdirSync(REVIEW_EDITED_DIR, { withFileTypes: true })) {
    if (!entry.isFile()) {
      continue;
    }

    if (path.parse(entry.name).name !== id) {
      continue;
    }

    fs.rmSync(path.join(REVIEW_EDITED_DIR, entry.name), { force: true });
  }
}

async function saveGeneratedImage(target, conversationUrl, sourceUrl, id) {
  const result = browserEvalJson(
    `(async () => {
      const response = await fetch(${JSON.stringify(sourceUrl)}, {
        credentials: "include",
        referrer: ${JSON.stringify(conversationUrl)},
      });

      if (!response.ok) {
        return JSON.stringify({
          ok: false,
          status: response.status,
          statusText: response.statusText,
        });
      }

      const blob = await response.blob();
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error || new Error("FileReader failed"));
        reader.readAsDataURL(blob);
      });

      return JSON.stringify({
        ok: true,
        mimeType: blob.type || response.headers.get("content-type") || "",
        dataUrl,
      });
    })()`,
  );

  if (!result?.ok || typeof result.dataUrl !== "string") {
    throw new Error(
      `Failed to fetch generated image (${result?.status ?? "unknown"} ${result?.statusText ?? "error"})`,
    );
  }

  const mimeType = typeof result.mimeType === "string" ? result.mimeType : "";
  const extension = mimeType.includes("png")
    ? ".png"
    : mimeType.includes("jpeg") || mimeType.includes("jpg")
      ? ".jpg"
      : mimeType.includes("webp")
        ? ".webp"
        : ".bin";

  removeExistingEditedVariants(id);

  const outputPath = path.join(REVIEW_EDITED_DIR, `${id}${extension}`);
  const base64 = result.dataUrl.includes(",")
    ? result.dataUrl.slice(result.dataUrl.indexOf(",") + 1)
    : result.dataUrl;
  const bytes = Buffer.from(base64, "base64");
  fs.writeFileSync(outputPath, bytes);

  return outputPath;
}

async function processItem(
  item,
  target,
  {
    prompt,
    projectUrl,
    projectPrefix,
    delayMinSeconds,
    delayMaxSeconds,
    rateLimitCooldownSeconds,
  },
) {
  let rateLimitRetries = 0;
  let wrongModeRetries = 0;
  let lastConversationUrl = null;
  let rateLimitNotified = false;

  while (true) {
    try {
      await ensureProjectPage(target, projectUrl, projectPrefix);
      await resetComposerDraft(target);
      await ensureCreateImageMode(target);
      await uploadFile(target, item.originalPath);
      await ensureCreateImageMode(target);
      await fillPromptAndSend(target, prompt);

      const conversationUrl = await waitForConversationUrl(target, projectPrefix);
      lastConversationUrl = conversationUrl;
      const { generatedSrc } = await waitForGeneratedImage(target);
      const editedPath = await saveGeneratedImage(
        target,
        conversationUrl,
        generatedSrc,
        item.id,
      );

      updateStatus(item.id, "review", {
        editedPath,
        promptVersion: PROMPT_VERSION,
        lastError: null,
      });

      return {
        conversationUrl,
        editedPath,
      };
    } catch (error) {
      const currentConversationUrl =
        getCurrentConversationUrl(target, projectPrefix) ?? lastConversationUrl;

      if (error && typeof error === "object") {
        error.conversationUrl = currentConversationUrl;
      }

      if (error instanceof ChatGptRateLimitError) {
        rateLimitRetries += 1;

        if (rateLimitRetries <= MAX_RATE_LIMIT_RETRIES) {
          if (!rateLimitNotified) {
            sendNotify(
              "ChatGPT worker rate limited",
              `id=${item.id}${item.postTitle ? ` ${item.postTitle}` : ""}. Cooling down for ${rateLimitCooldownSeconds}s before retry.`,
            );
            rateLimitNotified = true;
          }
          console.warn(
            `[chatgpt-image-worker] rate limit for id=${item.id}; retrying after cooldown (${rateLimitRetries}/${MAX_RATE_LIMIT_RETRIES})`,
          );
          await cooldownAfterRateLimit(rateLimitCooldownSeconds);
          continue;
        }
      }

      if (error instanceof WrongChatGptModeError) {
        wrongModeRetries += 1;

        if (wrongModeRetries <= MAX_WRONG_MODE_RETRIES) {
          console.warn(
            `[chatgpt-image-worker] wrong mode for id=${item.id}; retrying in fresh chat (${wrongModeRetries}/${MAX_WRONG_MODE_RETRIES})`,
          );
          await cooldownBetweenItems(
            delayMinSeconds,
            delayMaxSeconds,
            "wrong-mode retry",
          );
          continue;
        }
      }

      throw error;
    }
  }
}

async function main() {
  const options = parseArgs();
  activeProjectUrl = options.projectUrl;
  activeProjectPrefix = options.projectPrefix;
  console.log(`[chatgpt-image-worker] log=${WORKER_LOG_PATH}`);
  console.log("[chatgpt-image-worker] connecting agent-browser session");
  let target = AGENT_BROWSER_SESSION;

  try {
    connectAgentBrowserSession();
  } catch (error) {
    if (error instanceof BrowserApprovalRequiredError) {
      notifyBrowserApprovalRequired(error.message);
    }
    throw error;
  }

  console.log(`[chatgpt-image-worker] session=${target}`);

  let processed = 0;

  while (processed < options.limit) {
    console.log("[chatgpt-image-worker] claiming next queue item");
    const preferredId = processed === 0 ? options.preferredId : null;
    const item = claimNextListingLinkedItem(preferredId);

    if (!item) {
      console.log("[chatgpt-image-worker] no eligible queue items found");
      break;
    }

    try {
      console.log(
        `[chatgpt-image-worker] processing id=${item.id} title=${item.postTitle ?? ""}`,
      );

      const result = await processItem(item, target, options);

      console.log(
        `[chatgpt-image-worker] saved id=${item.id} edited=${result.editedPath}`,
      );
      console.log(
        `[chatgpt-image-worker] conversation id=${item.id} url=${result.conversationUrl}`,
      );
      processed += 1;

      if (processed < options.limit) {
        await cooldownBetweenItems(
          options.delayMinSeconds,
          options.delayMaxSeconds,
          "successful item",
        );
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown ChatGPT worker error";
      const conversationUrl =
        error &&
        typeof error === "object" &&
        typeof error.conversationUrl === "string"
          ? error.conversationUrl
          : null;
      let debugArtifacts = null;

      try {
        debugArtifacts = await captureDebugArtifacts(target, item, {
          label:
            error instanceof BrowserApprovalRequiredError
              ? "browser-approval"
              : error instanceof ChatGptRateLimitError
                ? "rate-limit"
                : message.startsWith("Timed out waiting for ")
                  ? "timeout"
                  : error instanceof WrongChatGptModeError
                    ? "wrong-mode"
                    : "failure",
          error,
          conversationUrl,
        });
      } catch (debugError) {
        console.warn(
          `[chatgpt-image-worker] failed to capture debug artifacts for id=${item.id}: ${
            debugError instanceof Error ? debugError.message : String(debugError)
          }`,
        );
      }

      if (error instanceof BrowserApprovalRequiredError) {
        updateStatus(item.id, "pending", {
          lastError: message,
          promptVersion: PROMPT_VERSION,
        });

        notifyBrowserApprovalRequired(message, item);

        console.error(
          `[chatgpt-image-worker] stopping for browser approval id=${item.id} error=${message}${
            conversationUrl ? ` url=${conversationUrl}` : ""
          }${
            debugArtifacts?.textPath ? ` debugText=${debugArtifacts.textPath}` : ""
          }${
            debugArtifacts?.screenshotPath
              ? ` debugShot=${debugArtifacts.screenshotPath}`
              : ""
          }`,
        );

        throw error;
      }

      updateStatus(item.id, "failed", {
        lastError: message,
        promptVersion: PROMPT_VERSION,
      });

      if (message.startsWith("Timed out waiting for ")) {
        sendNotify(
          "ChatGPT worker timeout",
          `id=${item.id}${item.postTitle ? ` ${item.postTitle}` : ""}. ${message}`,
        );
      }

      console.error(
        `[chatgpt-image-worker] failed id=${item.id} error=${message}${
          conversationUrl ? ` url=${conversationUrl}` : ""
        }${
          debugArtifacts?.textPath ? ` debugText=${debugArtifacts.textPath}` : ""
        }${
          debugArtifacts?.screenshotPath
            ? ` debugShot=${debugArtifacts.screenshotPath}`
            : ""
        }`,
      );
      processed += 1;

      if (processed < options.limit) {
        await cooldownBetweenItems(
          options.delayMinSeconds,
          options.delayMaxSeconds,
          "failed item",
        );
        continue;
      }

      throw error;
    }
  }

  console.log(`[chatgpt-image-worker] processed=${processed}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
