import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

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
const MAX_HUMAN_VERIFICATION_RETRIES = 1;
const MAX_BROWSER_SESSION_RECOVERY_RETRIES = 1;
const MAX_MENU_REFRESH_RETRIES = 1;
const MAX_COMPOSER_MENU_CLICK_ATTEMPTS = 3;
const COMPOSER_MENU_CLICK_WAIT_MS = 1500;
const MAX_DELETE_MENU_CLICK_ATTEMPTS = 3;
const DELETE_MENU_CLICK_WAIT_MS = 1500;
const SLASH_CREATE_IMAGE_COMMAND = "/image";
const SLASH_CREATE_IMAGE_WAIT_MS = 2000;
const DEFAULT_MAX_CONSECUTIVE_SAME_ERROR = 3;
const DEFAULT_DELAY_MIN_SECONDS = 180;
const DEFAULT_DELAY_MAX_SECONDS = 360;
const DEFAULT_RATE_LIMIT_COOLDOWN_SECONDS = 900;
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

class DailyImageLimitExceededError extends Error {
  constructor(message = "ChatGPT hit the daily image generation limit for this account") {
    super(message);
    this.name = "DailyImageLimitExceededError";
  }
}

class SourceImageInvalidError extends Error {
  constructor(message) {
    super(message);
    this.name = "SourceImageInvalidError";
  }
}

class BrowserApprovalRequiredError extends Error {
  constructor(message = "Chrome requires manual debugging approval before the worker can continue") {
    super(message);
    this.name = "BrowserApprovalRequiredError";
  }
}

class ComposerMenuStuckError extends Error {
  constructor(message = "ChatGPT project composer menu stayed stuck after a refresh retry") {
    super(message);
    this.name = "ComposerMenuStuckError";
  }
}

class HumanVerificationRequiredError extends Error {
  constructor(message = "ChatGPT requires a human verification check before the worker can continue") {
    super(message);
    this.name = "HumanVerificationRequiredError";
  }
}

class BrowserSessionUnresponsiveError extends Error {
  constructor(message = "The attached browser session became unresponsive") {
    super(message);
    this.name = "BrowserSessionUnresponsiveError";
  }
}

function isBrowserApprovalErrorText(errorText) {
  return errorText.includes("did you click Allow in Chrome?");
}

function isBrowserSessionUnresponsiveErrorText(errorText) {
  return (
    errorText.includes("daemon may be busy or unresponsive") ||
    errorText.includes("CDP command timed out:")
  );
}

function isBlockingWorkerError(error) {
  return (
    error instanceof BrowserApprovalRequiredError ||
    error instanceof HumanVerificationRequiredError ||
    error instanceof ChatGptRateLimitError ||
    error instanceof DailyImageLimitExceededError ||
    error instanceof BrowserSessionUnresponsiveError
  );
}

function rethrowBlockingWorkerError(error) {
  if (isBlockingWorkerError(error)) {
    throw error;
  }
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
  let deleteAfterSave = false;
  let delayMinSeconds = DEFAULT_DELAY_MIN_SECONDS;
  let delayMaxSeconds = DEFAULT_DELAY_MAX_SECONDS;
  let rateLimitCooldownSeconds = DEFAULT_RATE_LIMIT_COOLDOWN_SECONDS;
  let maxConsecutiveSameError = DEFAULT_MAX_CONSECUTIVE_SAME_ERROR;

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

    if (arg === "--delete-after-save") {
      deleteAfterSave = true;
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

    if (arg === "--max-consecutive-same-error") {
      const raw = Number(args[index + 1] ?? "");
      if (!Number.isInteger(raw) || raw < 1) {
        throw new Error(
          `Invalid --max-consecutive-same-error value: ${args[index + 1]}`,
        );
      }
      maxConsecutiveSameError = raw;
      index += 1;
      continue;
    }

    if (arg.startsWith("--max-consecutive-same-error=")) {
      const raw = Number(arg.slice("--max-consecutive-same-error=".length));
      if (!Number.isInteger(raw) || raw < 1) {
        throw new Error(`Invalid --max-consecutive-same-error value: ${arg}`);
      }
      maxConsecutiveSameError = raw;
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
    deleteAfterSave,
    projectUrl,
    projectPrefix: projectUrl.replace(/\/project$/, ""),
    maxConsecutiveSameError,
    rateLimitCooldownSeconds,
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getProjectPath(projectUrl) {
  return new URL(projectUrl).pathname;
}

function getConversationIdFromUrl(conversationUrl) {
  const path = getProjectPath(conversationUrl);
  const marker = "/c/";
  const markerIndex = path.indexOf(marker);

  if (markerIndex === -1) {
    throw new Error(`Could not parse conversation id from URL: ${conversationUrl}`);
  }

  return path.slice(markerIndex + marker.length);
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

async function cooldownBeforeRetry(cooldownSeconds, reason) {
  console.log(
    `[chatgpt-image-worker] cooling down for ${cooldownSeconds}s before retry after ${reason}`,
  );
  await sleep(cooldownSeconds * 1000);
}

function notifyBrowserApprovalRequired(message, item = null) {
  const details = item
    ? `id=${item.id}${item.postTitle ? ` ${item.postTitle}` : ""}. ${message}`
    : message;

  sendNotify("ChatGPT worker needs Chrome approval", details);
}

function notifyHumanVerificationRequired(message, item = null) {
  const details = item
    ? `id=${item.id}${item.postTitle ? ` ${item.postTitle}` : ""}. ${message}`
    : message;

  sendNotify("ChatGPT worker needs human verification", details);
}

function notifyBrowserSessionUnresponsive(message, item = null) {
  const details = item
    ? `id=${item.id}${item.postTitle ? ` ${item.postTitle}` : ""}. ${message}`
    : message;

  sendNotify("ChatGPT worker browser session stalled", details);
}

function notifyDailyImageLimitExceeded(message, item = null) {
  const details = item
    ? `id=${item.id}${item.postTitle ? ` ${item.postTitle}` : ""}. ${message}`
    : message;

  sendNotify("ChatGPT worker hit daily image limit", details);
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

    if (isBrowserSessionUnresponsiveErrorText(errorText)) {
      const detail = errorText.includes("CDP command timed out:")
        ? "CDP command timed out"
        : "agent-browser daemon became unresponsive";
      const sessionError = new BrowserSessionUnresponsiveError(
        `The attached browser session became unresponsive (${detail}).`,
      );
      sessionError.cause = error;
      throw sessionError;
    }

    throw error;
  }
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

function browserOpen(url) {
  execAgentBrowser(["open", url]);
}

function browserClick(selector) {
  execAgentBrowser(["click", selector]);
}

function browserHover(selector) {
  execAgentBrowser(["hover", selector]);
}

function browserUpload(selector, filePath) {
  execAgentBrowser(["upload", selector, filePath]);
}

function browserInsertText(text) {
  execAgentBrowser(["keyboard", "inserttext", text]);
}

function getHumanVerificationState() {
  const state = browserEvalJson(
    `JSON.stringify((() => {
      const bodyText = document.body?.innerText || "";
      const title = document.title || "";
      const iframe = [...document.querySelectorAll("iframe")].find((node) => {
        const label = (
          node.getAttribute("title") ||
          node.getAttribute("aria-label") ||
          ""
        ).toLowerCase();
        return (
          label.includes("cloudflare security challenge") ||
          label.includes("verify you are human")
        );
      });
      const checkbox = [...document.querySelectorAll('input[type="checkbox"], [role="checkbox"]')].find(
        (node) => {
          const label = (
            node.getAttribute("aria-label") ||
            node.innerText ||
            ""
          ).toLowerCase();
          return label.includes("verify you are human");
        },
      );

      const blocked =
        title.trim() === "Just a moment..." ||
        bodyText.includes("Verify you are human") ||
        bodyText.includes("Widget containing a Cloudflare security challenge") ||
        bodyText.includes("Checking your browser before accessing") ||
        bodyText.includes("Sorry, you have been blocked") ||
        Boolean(iframe) ||
        Boolean(checkbox);

      return {
        blocked,
        title,
        hasIframe: Boolean(iframe),
        hasVerifyCheckbox: Boolean(checkbox),
      };
    })())`,
  );

  return state && typeof state === "object" ? state : null;
}

function assertNoHumanVerificationRequired() {
  const state = getHumanVerificationState();

  if (!state?.blocked) {
    return;
  }

  const details = [];

  if (state.title) {
    details.push(`title="${state.title}"`);
  }

  if (state.hasIframe) {
    details.push("cloudflare iframe present");
  }

  if (state.hasVerifyCheckbox) {
    details.push(`"Verify you are human" checkbox present`);
  }

  const suffix = details.length > 0 ? ` (${details.join(", ")})` : "";
  throw new HumanVerificationRequiredError(
    `ChatGPT is blocked by a human-verification challenge${suffix}`,
  );
}

function getRateLimitState() {
  const state = browserEvalJson(
    `JSON.stringify((() => {
      const bodyText = document.body?.innerText || "";
      const lowerBodyText = bodyText.toLowerCase();
      const gotItButton = [...document.querySelectorAll("button")].find((node) =>
        (node.innerText || node.getAttribute("aria-label") || "")
          .trim()
          .toLowerCase() === "got it",
      );

      const blocked =
        lowerBodyText.includes("too many requests") ||
        lowerBodyText.includes("you're making requests too quickly") ||
        lowerBodyText.includes("we’ve temporarily limited access to your conversations") ||
        lowerBodyText.includes("we've temporarily limited access to your conversations") ||
        lowerBodyText.includes("temporarily limited access to your conversations") ||
        lowerBodyText.includes("please wait a few minutes before trying again");

      return {
        blocked,
        hasGotItButton: Boolean(gotItButton),
      };
    })())`,
  );

  return state && typeof state === "object" ? state : null;
}

async function detectAndDismissRateLimitModal(context = "unknown") {
  const state = getRateLimitState();

  if (!state?.blocked) {
    return false;
  }

  if (state.hasGotItButton) {
    await dismissRateLimitModal(context);
  } else {
    console.warn(
      `[chatgpt-image-worker] detected rate limit without dismiss button context=${context}`,
    );
  }

  return true;
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

function isComposerMenuTimeoutError(error) {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.message.includes("Timed out waiting for Create image menu") ||
    error.message.includes("Timed out waiting for composer plus button")
  );
}

function classifyErrorForCircuitBreaker(error, message) {
  if (error instanceof BrowserApprovalRequiredError) {
    return {
      key: "browser-approval",
      label: "browser approval",
    };
  }

  if (error instanceof ComposerMenuStuckError) {
    return {
      key: "composer-menu-stuck",
      label: "composer menu stuck",
    };
  }

  if (error instanceof HumanVerificationRequiredError) {
    return {
      key: "human-verification",
      label: "human verification",
    };
  }

  if (error instanceof BrowserSessionUnresponsiveError) {
    return {
      key: "browser-session-unresponsive",
      label: "browser session unresponsive",
    };
  }

  if (error instanceof ChatGptRateLimitError) {
    return {
      key: "rate-limit",
      label: "rate limit",
    };
  }

  if (error instanceof DailyImageLimitExceededError) {
    return {
      key: "daily-image-limit",
      label: "daily image limit",
    };
  }

  if (error instanceof WrongChatGptModeError) {
    return {
      key: "wrong-mode",
      label: "wrong mode",
    };
  }

  if (message.startsWith("Timed out waiting for ")) {
    return {
      key: `timeout:${message}`,
      label: message,
    };
  }

  if (error instanceof Error) {
    return {
      key: `${error.name}:${message}`,
      label: `${error.name}: ${message}`,
    };
  }

  return {
    key: `unknown:${message}`,
    label: message,
  };
}

async function waitFor(description, callback, timeoutMs = 30000, intervalMs = 500) {
  const startedAt = Date.now();
  let lastError = null;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      assertNoHumanVerificationRequired();
      if (await detectAndDismissRateLimitModal(`waitFor:${description}`)) {
        throw new ChatGptRateLimitError();
      }
      const result = await callback();
      if (result) {
        return result;
      }
    } catch (error) {
      if (isBlockingWorkerError(error)) {
        throw error;
      }
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

    let row = preferredId
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

    if (!row?.id && !preferredId) {
      row = database
        .prepare(`
          SELECT q."id"
          FROM "v2_image_review_queue" q
          JOIN prod."V2AhsCultivar" v
            ON v."id" = q."id"
          WHERE q."status" IN ('pending', 'failed', 'rejected')
          ORDER BY
            CASE
              WHEN v."introduction_date" IS NULL OR v."introduction_date" = ''
                THEN 1
              ELSE 0
            END,
            v."introduction_date" DESC,
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
    }

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

async function waitForProjectUrl(projectUrl) {
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

async function refreshProjectPage(projectUrl) {
  console.warn(
    `[chatgpt-image-worker] refreshing project page ${projectUrl} before retry`,
  );
  browserOpen(projectUrl);
  await waitForProjectUrl(projectUrl);
}

async function clickProjectHomeLink(projectUrl) {
  const expectedPath = getProjectPath(projectUrl);
  const expectedPathJson = JSON.stringify(expectedPath);
  const markerSelector = "[data-codex-project-home-link]";
  const markerSelectorJson = JSON.stringify(markerSelector);

  try {
    await waitFor(
      "project home link",
      async () => {
        return browserEvalBoolean(
          `(() => {
            const findProjectHomeControl = () => {
              const exactHref = [...document.querySelectorAll('a[href]')].find(
                (link) => (link.getAttribute('href') || '') === ${expectedPathJson},
              );
              if (exactHref) return exactHref;

              const projectIcon = document
                .querySelector('[data-testid="project-folder-icon"]')
                ?.closest('a, button, [role="button"]');
              if (projectIcon) return projectIcon;

              return [...document.querySelectorAll('a[href], button, [role="button"]')].find((node) => {
                const href = node.getAttribute('href') || '';
                const label = (node.getAttribute('aria-label') || node.innerText || '').trim().toLowerCase();
                return (
                  href === ${expectedPathJson} ||
                  label.includes('project') ||
                  label.includes('folder')
                );
              });
            };

            return Boolean(findProjectHomeControl());
          })()`,
        );
      },
      5000,
      250,
    );
  } catch (error) {
    rethrowBlockingWorkerError(error);
    return false;
  }

  const marked = browserEvalBoolean(
    `(() => {
      document.querySelectorAll(${markerSelectorJson}).forEach((node) => {
        node.removeAttribute('data-codex-project-home-link');
      });

      const exactHref = [...document.querySelectorAll('a[href]')].find(
        (link) => (link.getAttribute('href') || '') === ${expectedPathJson},
      );
      const projectIcon = document
        .querySelector('[data-testid="project-folder-icon"]')
        ?.closest('a, button, [role="button"]');
      const fuzzy = [...document.querySelectorAll('a[href], button, [role="button"]')].find((node) => {
        const href = node.getAttribute('href') || '';
        const label = (node.getAttribute('aria-label') || node.innerText || '').trim().toLowerCase();
        return (
          href === ${expectedPathJson} ||
          label.includes('project') ||
          label.includes('folder')
        );
      });
      const control =
        exactHref ||
        projectIcon ||
        fuzzy;
      if (!control) {
        return false;
      }

      control.setAttribute('data-codex-project-home-link', 'true');
      return true;
    })()`,
  );

  if (!marked) {
    return false;
  }

  browserClick(markerSelector);
  return true;
}

async function ensureProjectPage(projectUrl, projectPrefix) {
  const currentUrl = browserGetUrl();

  if (currentUrl === projectUrl) {
    return;
  }

  if (currentUrl.startsWith(`${projectPrefix}/c/`)) {
    const clickedProjectLink = await clickProjectHomeLink(projectUrl);

    if (clickedProjectLink) {
      await waitForProjectUrl(projectUrl);
      return;
    }
  }

  throw new Error(
    `Expected project page or project conversation, but found ${currentUrl}. Return the dedicated ChatGPT Chrome tab to ${projectUrl} before continuing.`,
  );
}

async function deleteConversationFromProject(conversationUrl, projectUrl) {
  const conversationPath = getProjectPath(conversationUrl);
  const conversationPathJson = JSON.stringify(conversationPath);
  const conversationId = getConversationIdFromUrl(conversationUrl);
  const conversationIdJson = JSON.stringify(conversationId);
  const conversationPathSuffixJson = JSON.stringify(`/c/${conversationId}`);
  const rowMarkerSelector = '[data-codex-delete-row="true"]';
  const rowMarkerSelectorJson = JSON.stringify(rowMarkerSelector);
  const optionsTriggerSelector = JSON.stringify(
    `button[data-conversation-options-trigger="${conversationId}"]`,
  );

  await waitFor(
    "conversation row in project list",
    async () => {
      return browserEvalBoolean(
        `(() => {
          const links = [...document.querySelectorAll('a[href]')];
          const link =
            links.find((node) => (node.getAttribute('href') || '') === ${conversationPathJson}) ||
            links.find((node) => {
              const href = node.getAttribute('href') || '';
              return (
                href.endsWith(${conversationPathSuffixJson}) &&
                !node.closest('nav[aria-label="Sidebar"], nav')
              );
            });
          const trigger = document.querySelector(
            ${optionsTriggerSelector},
          );
          return Boolean(link || trigger);
        })()`,
      );
    },
    15000,
    300,
  );

  let openedMenu = false;

  for (let attempt = 1; attempt <= MAX_DELETE_MENU_CLICK_ATTEMPTS; attempt += 1) {
    const existingDeleteItem = browserEvalBoolean(
      `Boolean(
        [...document.querySelectorAll('[role="menuitem"], [role="menuitemradio"], button, [tabindex]')].find(
          (node) => {
            const text = (node.innerText || node.getAttribute('aria-label') || '').trim();
            return text === 'Delete' && node.closest('[role="menu"]');
          },
        ),
      )`,
    );

    if (existingDeleteItem) {
      openedMenu = true;
      break;
    }

    const rowSelector = browserEvalValue(
      `(() => {
        document.querySelectorAll(${rowMarkerSelectorJson}).forEach((node) => {
          node.removeAttribute('data-codex-delete-row');
        });

        const links = [...document.querySelectorAll('a[href]')];
        const link =
          links.find((node) => (node.getAttribute('href') || '') === ${conversationPathJson}) ||
          links.find((node) => {
            const href = node.getAttribute('href') || '';
            return (
              href.endsWith(${conversationPathSuffixJson}) &&
              !node.closest('nav[aria-label="Sidebar"], nav')
            );
          });
        const row =
          link?.closest('li, [role="listitem"], article, section, [data-testid]') ||
          link?.parentElement ||
          null;

        if (!row) {
          return null;
        }

        row.scrollIntoView({ block: 'center' });
        row.setAttribute('data-codex-delete-row', 'true');
        return ${rowMarkerSelectorJson};
      })()`,
    );

    if (typeof rowSelector === "string" && rowSelector) {
      browserHover(rowSelector);
      await sleep(500);
    }

    const triggerClickSelector = browserEvalValue(
      `(() => {
        const row = document.querySelector(${rowMarkerSelectorJson});
        const trigger =
          row?.querySelector(${optionsTriggerSelector}) ||
          row?.querySelector('button[data-conversation-options-trigger]') ||
          [...(row || document).querySelectorAll('button')].find((button) => {
            const label = (button.getAttribute('aria-label') || button.innerText || '').trim();
            return (
              label.includes('Open conversation options') ||
              label.includes(${conversationIdJson})
            );
          }) ||
          null;

        if (!trigger) {
          return null;
        }

        trigger.scrollIntoView({ block: 'center' });

        trigger.setAttribute('data-codex-delete-trigger', 'true');
        return '[data-codex-delete-trigger="true"]';
      })()`,
    );

    if (typeof triggerClickSelector !== "string" || !triggerClickSelector) {
      break;
    }

    try {
      browserClick(triggerClickSelector);
    } finally {
      browserEval(
        `document.querySelector('[data-codex-delete-trigger="true"]')?.removeAttribute('data-codex-delete-trigger')`,
      );
    }

    const menuOpenedThisAttempt = await waitFor(
      "conversation options menu",
      async () => {
        return browserEvalBoolean(
          `Boolean(
            [...document.querySelectorAll('[role="menuitem"], [role="menuitemradio"], button, [tabindex]')].find(
              (node) => {
                const text = (node.innerText || node.getAttribute('aria-label') || '').trim();
                return text === 'Delete' && node.closest('[role="menu"]');
              },
            ),
          )`,
        );
      },
      DELETE_MENU_CLICK_WAIT_MS,
      200,
    ).catch((error) => {
      rethrowBlockingWorkerError(error);
      return false;
    });

    if (menuOpenedThisAttempt) {
      openedMenu = true;
      break;
    }

    if (attempt < MAX_DELETE_MENU_CLICK_ATTEMPTS) {
      console.warn(
        `[chatgpt-image-worker] conversation options menu did not open after click attempt ${attempt}/${MAX_DELETE_MENU_CLICK_ATTEMPTS}; retrying on the same row`,
      );
    }
  }

  if (!openedMenu) {
    throw new Error("Timed out waiting for conversation options menu");
  }

  const deleteMenuItemSelector = browserEvalValue(
    `(() => {
      const item = [...document.querySelectorAll('[role="menuitem"], [role="menuitemradio"], button, [tabindex]')].find(
        (node) => {
          const text = (node.innerText || node.getAttribute('aria-label') || '').trim();
          return text === 'Delete' && node.closest('[role="menu"]');
        },
      );

      if (!item) {
        return null;
      }

      item.setAttribute('data-codex-delete-menu-item', 'true');
      return '[data-codex-delete-menu-item="true"]';
    })()`,
  );

  if (typeof deleteMenuItemSelector !== "string" || !deleteMenuItemSelector) {
    throw new Error(`Could not click Delete menu item for ${conversationId}`);
  }

  try {
    browserClick(deleteMenuItemSelector);
  } finally {
    browserEval(
      `document.querySelector('[data-codex-delete-menu-item="true"]')?.removeAttribute('data-codex-delete-menu-item')`,
    );
  }

  await waitFor(
    "delete confirmation dialog",
    async () => {
      return browserEvalBoolean(
        `(() => {
          const dialog = document.querySelector('[role="dialog"]');
          if (!dialog) {
            return false;
          }

          const headingText = dialog.innerText || '';
          const confirmButton = [...dialog.querySelectorAll('button')].find((node) => {
            const text = (node.innerText || node.getAttribute('aria-label') || '').trim();
            return text === 'Delete';
          });

          return headingText.includes('Delete chat?') && Boolean(confirmButton);
        })()`,
      );
    },
    10000,
    250,
  );

  const deleteConfirmSelector = browserEvalValue(
    `(() => {
      const dialog = document.querySelector('[role="dialog"]');
      if (!dialog) {
        return null;
      }

      const button = [...dialog.querySelectorAll('button')].find((node) => {
        const text = (node.innerText || node.getAttribute('aria-label') || '').trim();
        return text === 'Delete';
      });

      if (!button) {
        return null;
      }

      button.setAttribute('data-codex-delete-confirm', 'true');
      return '[data-codex-delete-confirm="true"]';
    })()`,
  );

  if (typeof deleteConfirmSelector !== "string" || !deleteConfirmSelector) {
    throw new Error(`Could not confirm Delete dialog for ${conversationId}`);
  }

  try {
    browserClick(deleteConfirmSelector);
  } finally {
    browserEval(
      `document.querySelector('[data-codex-delete-confirm="true"]')?.removeAttribute('data-codex-delete-confirm')`,
    );
  }

  const removedWithoutRefresh = await waitFor(
    "conversation removed from project list",
    async () => {
      return browserEvalBoolean(
        `(() => {
          const linkExists = [...document.querySelectorAll('a[href]')].some((node) =>
            (node.getAttribute('href') || '') === ${conversationPathJson},
          );
          const triggerExists = Boolean(
            document.querySelector(
              ${optionsTriggerSelector},
            ),
          );
          return !linkExists && !triggerExists;
        })()`,
      );
    },
    15000,
    300,
  ).catch((error) => {
    rethrowBlockingWorkerError(error);
    return false;
  });

  if (removedWithoutRefresh) {
    return;
  }

  browserOpen(projectUrl);
  await waitForProjectUrl(projectUrl);
  await waitFor(
    "conversation removed from refreshed project list",
    async () => {
      return browserEvalBoolean(
        `![...document.querySelectorAll('a[href]')].some((node) =>
          (node.getAttribute('href') || '') === ${conversationPathJson},
        )`,
      );
    },
    15000,
    300,
  );
}

async function openComposerMenu() {
  const getCreateImageMenuState = () => {
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
  };

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

  for (let attempt = 1; attempt <= MAX_COMPOSER_MENU_CLICK_ATTEMPTS; attempt += 1) {
    const existingMenuState = getCreateImageMenuState();
    if (existingMenuState) {
      return existingMenuState;
    }

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

    const menuState = await waitFor(
      "Create image menu",
      async () => getCreateImageMenuState(),
      COMPOSER_MENU_CLICK_WAIT_MS,
      200,
    ).catch((error) => {
      rethrowBlockingWorkerError(error);
      return null;
    });

    if (menuState) {
      return menuState;
    }

    if (attempt < MAX_COMPOSER_MENU_CLICK_ATTEMPTS) {
      console.warn(
        `[chatgpt-image-worker] composer menu did not open after click attempt ${attempt}/${MAX_COMPOSER_MENU_CLICK_ATTEMPTS}; retrying on the same page`,
      );
    }
  }

  const activatedViaSlash = await activateImageModeViaSlashCommand();

  if (activatedViaSlash) {
    return {
      checked: true,
    };
  }

  throw new Error("Timed out waiting for Create image menu");
}

async function isCreateImageModeActive() {
  return browserEvalBoolean(
    `!!document.querySelector('button[aria-label="Image, click to remove"]')`,
  );
}

async function focusPromptEditor() {
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

async function clearPromptEditorText() {
  browserEval(
    `(() => {
      const editor = document.getElementById("prompt-textarea");
      if (editor) {
        editor.textContent = "";
        editor.innerHTML = "";
        editor.dispatchEvent(
          new InputEvent("input", {
            bubbles: true,
            inputType: "deleteContentBackward",
            data: null,
          }),
        );
      }

      const textarea = document.querySelector('textarea[aria-label^="New chat in "]');
      if (textarea) {
        textarea.value = "";
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
      }

      return "ok";
    })()`,
  );
}

async function resetComposerDraft() {
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

  await clearPromptEditorText();
}

async function activateImageModeViaSlashCommand() {
  console.warn(
    `[chatgpt-image-worker] composer menu still unavailable; trying ${SLASH_CREATE_IMAGE_COMMAND} slash fallback`,
  );

  await focusPromptEditor();
  await clearPromptEditorText();
  await focusPromptEditor();
  browserInsertText(SLASH_CREATE_IMAGE_COMMAND);

  const insertedSlashCommand = await waitFor(
    `${SLASH_CREATE_IMAGE_COMMAND} text in composer`,
    async () => {
      return browserEvalBoolean(
        `(
          (document.getElementById("prompt-textarea")?.innerText || "").includes(${JSON.stringify(SLASH_CREATE_IMAGE_COMMAND)}) ||
          (document.querySelector('textarea[aria-label^="New chat in "]')?.value || "").includes(${JSON.stringify(SLASH_CREATE_IMAGE_COMMAND)})
        )`,
      );
    },
    SLASH_CREATE_IMAGE_WAIT_MS,
    200,
  ).catch((error) => {
    rethrowBlockingWorkerError(error);
    return false;
  });

  if (!insertedSlashCommand) {
    await clearPromptEditorText();
    return false;
  }

  const slashOptionReady = await waitFor(
    `${SLASH_CREATE_IMAGE_COMMAND} Create image option`,
    async () => {
      return browserEvalBoolean(
        `!!(() => {
          return [...document.querySelectorAll("*")].find((node) => {
            const text = (node.innerText || "").trim();
            if (text !== "Create image") {
              return false;
            }
            if (node.getAttribute("role") === "menuitemradio") {
              return false;
            }
            if (node.closest('[role="menu"]')) {
              return false;
            }
            if (node.matches?.('button[aria-label="Image, click to remove"]')) {
              return false;
            }
            return (
              node.hasAttribute("onclick") ||
              node.getAttribute("tabindex") !== null ||
              window.getComputedStyle(node).cursor === "pointer"
            );
          });
        })()`,
      );
    },
    SLASH_CREATE_IMAGE_WAIT_MS,
    200,
  ).catch((error) => {
    rethrowBlockingWorkerError(error);
    return false;
  });

  if (!slashOptionReady) {
    await clearPromptEditorText();
    return false;
  }

  const clickedSlashOption = browserEvalBoolean(
    `(() => {
      const option = [...document.querySelectorAll("*")].find((node) => {
        const text = (node.innerText || "").trim();
        if (text !== "Create image") {
          return false;
        }
        if (node.getAttribute("role") === "menuitemradio") {
          return false;
        }
        if (node.closest('[role="menu"]')) {
          return false;
        }
        if (node.matches?.('button[aria-label="Image, click to remove"]')) {
          return false;
        }
        return (
          node.hasAttribute("onclick") ||
          node.getAttribute("tabindex") !== null ||
          window.getComputedStyle(node).cursor === "pointer"
        );
      });

      if (!option) {
        return false;
      }

      option.click();
      return true;
    })()`,
  );

  if (!clickedSlashOption) {
    await clearPromptEditorText();
    return false;
  }

  const activated = await waitFor(
    `create image mode via ${SLASH_CREATE_IMAGE_COMMAND}`,
    async () => isCreateImageModeActive(),
    SLASH_CREATE_IMAGE_WAIT_MS,
    200,
  ).catch((error) => {
    rethrowBlockingWorkerError(error);
    return false;
  });

  await clearPromptEditorText();

  return Boolean(activated);
}

async function ensureCreateImageMode() {
  if (await isCreateImageModeActive()) {
    return;
  }

  const menuState = await openComposerMenu();

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
    async () => isCreateImageModeActive(),
    10000,
    300,
  );
}

async function uploadFile(filePath) {
  assertValidSourceImageFile(filePath);
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

function assertValidSourceImageFile(filePath) {
  const bytes = fs.readFileSync(filePath);

  const isJpeg =
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff;
  const isPng =
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47;
  const isGif =
    bytes.length >= 6 &&
    (bytes.subarray(0, 6).toString("ascii") === "GIF87a" ||
      bytes.subarray(0, 6).toString("ascii") === "GIF89a");
  const isWebp =
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP";
  const isTiff =
    bytes.length >= 4 &&
    ((bytes[0] === 0x49 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x2a &&
      bytes[3] === 0x00) ||
      (bytes[0] === 0x4d &&
        bytes[1] === 0x4d &&
        bytes[2] === 0x00 &&
        bytes[3] === 0x2a));

  if (isJpeg || isPng || isGif || isWebp || isTiff) {
    return;
  }

  const preview = bytes.subarray(0, 32).toString("utf8").replaceAll("\n", "\\n");
  throw new SourceImageInvalidError(
    `Invalid source image file ${path.relative(REPO_ROOT, filePath)} (${bytes.length} bytes, starts with ${JSON.stringify(preview)})`,
  );
}

async function fillPromptAndSend(prompt) {
  await focusPromptEditor();
  browserInsertText(prompt);

  await waitFor(
    "prompt text in composer",
    async () => {
      return browserEvalBoolean(
        `(
          (document.getElementById("prompt-textarea")?.innerText || "").includes(${JSON.stringify(prompt)}) ||
          (document.querySelector('textarea[aria-label^="New chat in "]')?.value || "").includes(${JSON.stringify(prompt)})
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

async function waitForConversationUrl(projectPrefix) {
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

function getCurrentConversationUrl(projectPrefix) {
  try {
    const url = browserGetUrl();
    return url.startsWith(`${projectPrefix}/c/`) ? url : null;
  } catch {
    return null;
  }
}

async function dismissRateLimitModal(context = "unknown") {
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

  console.warn(
    `[chatgpt-image-worker] dismissed rate limit modal context=${context}`,
  );
  await sleep(500);
  return true;
}

async function clickSkipButton() {
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

function getGeneratedImageSrcs() {
  const result = browserEvalJson(
    `JSON.stringify(
      [...document.querySelectorAll("img")]
        .filter((img) => (img.alt || "").startsWith("Generated image"))
        .map((img) => img.currentSrc || img.src || "")
        .filter(Boolean),
    )`,
  );

  return Array.isArray(result)
    ? new Set(result.filter((src) => typeof src === "string" && src))
    : new Set();
}

async function waitForGeneratedImage(existingGeneratedSrcs = new Set()) {
  const result = await waitFor(
    "generated image",
    async () => {
      const result = browserEvalJson(
          `JSON.stringify({
            generatedImages: [...new Map(
              [...document.querySelectorAll("img")]
                .filter((img) => (img.alt || "").startsWith("Generated image"))
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
            dailyImageLimitMessage: (() => {
              const bodyText = document.body.innerText || "";
              const match = bodyText.match(
                /You've hit your daily maximum number of images[\\s\\S]*?Your daily maximum will reset in [^.]+\\./,
              );
              if (match) {
                return match[0];
              }

              if (
                bodyText.includes("daily_rate_limit_exceeded") ||
                bodyText.includes("daily maximum number of images")
              ) {
                return bodyText.slice(-2000);
              }

              return null;
            })(),
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
              image.src !== result.uploadedSrc &&
              !existingGeneratedSrcs.has(image.src),
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

      if (typeof result.dailyImageLimitMessage === "string") {
        return {
          kind: "daily-image-limit",
          message: result.dailyImageLimitMessage,
        };
      }

      if (result.skipVisible) {
        const clickedSkip = await clickSkipButton();

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
          .find((url) => url !== result.uploadedSrc && !existingGeneratedSrcs.has(url));

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
      await dismissRateLimitModal("waitForGeneratedImage");
    }
    throw new ChatGptRateLimitError();
  }

  if (result.kind === "daily-image-limit") {
    throw new DailyImageLimitExceededError(
      result.message ||
        "ChatGPT hit the daily image generation limit for this account",
    );
  }

  if (result.kind === "error") {
    throw new Error(result.message);
  }

  return result.payload;
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

async function saveGeneratedImage(conversationUrl, sourceUrl, id) {
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
  {
    prompt,
    deleteAfterSave,
    projectUrl,
    projectPrefix,
    delayMinSeconds,
    delayMaxSeconds,
    rateLimitCooldownSeconds,
  },
) {
  let rateLimitRetries = 0;
  let humanVerificationRetries = 0;
  let browserSessionRecoveryRetries = 0;
  let wrongModeRetries = 0;
  let menuRefreshRetries = 0;
  let lastConversationUrl = null;
  let rateLimitNotified = false;
  let humanVerificationNotified = false;
  let postSaveRateLimited = false;

  while (true) {
    try {
      assertNoHumanVerificationRequired();
      await ensureProjectPage(projectUrl, projectPrefix);
      await resetComposerDraft();
      await ensureCreateImageMode();
      const existingGeneratedSrcs = getGeneratedImageSrcs();
      await uploadFile(item.originalPath);
      await ensureCreateImageMode();
      await fillPromptAndSend(prompt);

      const { generatedSrc } = await waitForGeneratedImage(existingGeneratedSrcs);
      const conversationPageUrl = getCurrentConversationUrl(projectPrefix);
      const conversationUrl = conversationPageUrl ?? browserGetUrl();
      lastConversationUrl = conversationPageUrl;
      const editedPath = await saveGeneratedImage(conversationUrl, generatedSrc, item.id);

      updateStatus(item.id, "review", {
        editedPath,
        promptVersion: PROMPT_VERSION,
        lastError: null,
      });

      let onProjectPage = false;

      try {
        await ensureProjectPage(projectUrl, projectPrefix);
        onProjectPage = true;
      } catch (returnError) {
        if (returnError instanceof ChatGptRateLimitError) {
          postSaveRateLimited = true;
        }
        console.warn(
          `[chatgpt-image-worker] saved id=${item.id} but failed to return to the project page before cooldown: ${
            returnError instanceof Error ? returnError.message : String(returnError)
          }`,
        );
      }

      let deletedConversation = false;

      if (deleteAfterSave && conversationPageUrl) {
        try {
          if (!onProjectPage) {
            await ensureProjectPage(projectUrl, projectPrefix);
            onProjectPage = true;
          }

          await deleteConversationFromProject(conversationPageUrl, projectUrl);
          deletedConversation = true;
        } catch (deleteError) {
          if (deleteError instanceof ChatGptRateLimitError) {
            postSaveRateLimited = true;
          }
          console.warn(
            `[chatgpt-image-worker] saved id=${item.id} but failed to delete the project conversation: ${
              deleteError instanceof Error ? deleteError.message : String(deleteError)
            }`,
          );
        }
      }

      return {
        conversationUrl,
        deletedConversation,
        editedPath,
        postSaveRateLimited,
      };
    } catch (error) {
      const currentConversationUrl =
        getCurrentConversationUrl(projectPrefix) ?? lastConversationUrl;

      if (error && typeof error === "object") {
        error.conversationUrl = currentConversationUrl;
      }

      if (isComposerMenuTimeoutError(error)) {
        menuRefreshRetries += 1;

        if (menuRefreshRetries <= MAX_MENU_REFRESH_RETRIES) {
          console.warn(
            `[chatgpt-image-worker] composer menu timed out for id=${item.id}; refreshing project page and retrying (${menuRefreshRetries}/${MAX_MENU_REFRESH_RETRIES})`,
          );
          await refreshProjectPage(projectUrl);
          continue;
        }

        const stuckError = new ComposerMenuStuckError(
          "ChatGPT project composer menu stayed stuck after a refresh retry",
        );
        stuckError.cause = error;
        stuckError.conversationUrl = currentConversationUrl;
        throw stuckError;
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
          await cooldownBeforeRetry(rateLimitCooldownSeconds, "rate limit");
          continue;
        }
      }

      if (error instanceof HumanVerificationRequiredError) {
        humanVerificationRetries += 1;

        if (humanVerificationRetries <= MAX_HUMAN_VERIFICATION_RETRIES) {
          if (!humanVerificationNotified) {
            sendNotify(
              "ChatGPT worker waiting on human verification",
              `id=${item.id}${item.postTitle ? ` ${item.postTitle}` : ""}. Cooling down for ${rateLimitCooldownSeconds}s before one retry.`,
            );
            humanVerificationNotified = true;
          }

          console.warn(
            `[chatgpt-image-worker] human verification for id=${item.id}; retrying after cooldown (${humanVerificationRetries}/${MAX_HUMAN_VERIFICATION_RETRIES})`,
          );
          await cooldownBeforeRetry(
            rateLimitCooldownSeconds,
            "human verification",
          );
          continue;
        }
      }

      if (error instanceof BrowserSessionUnresponsiveError) {
        browserSessionRecoveryRetries += 1;

        if (
          browserSessionRecoveryRetries <= MAX_BROWSER_SESSION_RECOVERY_RETRIES
        ) {
          console.warn(
            `[chatgpt-image-worker] browser session stalled for id=${item.id}; cooling down before refresh/retry (${browserSessionRecoveryRetries}/${MAX_BROWSER_SESSION_RECOVERY_RETRIES})`,
          );
          await cooldownBeforeRetry(
            rateLimitCooldownSeconds,
            "browser session stall",
          );
          connectAgentBrowserSession();
          await refreshProjectPage(projectUrl);
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

  try {
    connectAgentBrowserSession();
  } catch (error) {
    if (error instanceof BrowserApprovalRequiredError) {
      notifyBrowserApprovalRequired(error.message);
    }
    if (error instanceof BrowserSessionUnresponsiveError) {
      notifyBrowserSessionUnresponsive(error.message);
    }
    throw error;
  }

  console.log(`[chatgpt-image-worker] session=${AGENT_BROWSER_SESSION}`);

  let processed = 0;
  let consecutiveErrorState = {
    count: 0,
    key: null,
    label: null,
  };

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

      const result = await processItem(item, options);

      console.log(
        `[chatgpt-image-worker] saved id=${item.id} edited=${result.editedPath}`,
      );
      console.log(
        `[chatgpt-image-worker] conversation id=${item.id} url=${result.conversationUrl}`,
      );
      if (result.deletedConversation) {
        console.log(
          `[chatgpt-image-worker] deleted conversation id=${item.id} url=${result.conversationUrl}`,
        );
      }

      let appliedPostSaveRateLimitCooldown = false;

      if (result.postSaveRateLimited) {
        console.warn(
          `[chatgpt-image-worker] rate limit affected post-save cleanup for id=${item.id}; cooling down before the next item`,
        );
        await cooldownBeforeRetry(
          options.rateLimitCooldownSeconds,
          "rate limit",
        );
        appliedPostSaveRateLimitCooldown = true;
      }

      if (
        !appliedPostSaveRateLimitCooldown &&
        (await detectAndDismissRateLimitModal("post-save project page"))
      ) {
        console.warn(
          `[chatgpt-image-worker] rate limit modal appeared on the project page after saving id=${item.id}; cooling down before the next item`,
        );
        await cooldownBeforeRetry(
          options.rateLimitCooldownSeconds,
          "rate limit",
        );
      }

      consecutiveErrorState = {
        count: 0,
        key: null,
        label: null,
      };
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

      if (error instanceof SourceImageInvalidError) {
        updateStatus(item.id, "source_invalid", {
          lastError: message,
          promptVersion: PROMPT_VERSION,
        });

        console.warn(
          `[chatgpt-image-worker] skipped invalid source image id=${item.id} error=${message}`,
        );

        consecutiveErrorState = {
          count: 0,
          key: null,
          label: null,
        };
        processed += 1;

        if (processed < options.limit) {
          await cooldownBetweenItems(
            options.delayMinSeconds,
            options.delayMaxSeconds,
            "invalid source image",
          );
          continue;
        }

        break;
      }

      let debugArtifacts = null;

      try {
        debugArtifacts = await captureDebugArtifacts(item, {
          label:
            error instanceof BrowserApprovalRequiredError
              ? "browser-approval"
              : error instanceof ComposerMenuStuckError
                ? "composer-menu-stuck"
              : error instanceof HumanVerificationRequiredError
                ? "human-verification"
              : error instanceof BrowserSessionUnresponsiveError
                ? "browser-session-unresponsive"
              : error instanceof DailyImageLimitExceededError
                ? "daily-image-limit"
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

      if (error instanceof HumanVerificationRequiredError) {
        updateStatus(item.id, "pending", {
          lastError: message,
          promptVersion: PROMPT_VERSION,
        });

        notifyHumanVerificationRequired(message, item);

        console.error(
          `[chatgpt-image-worker] stopping for human verification id=${item.id} error=${message}${
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

      if (error instanceof DailyImageLimitExceededError) {
        updateStatus(item.id, "pending", {
          lastError: message,
          promptVersion: PROMPT_VERSION,
        });

        notifyDailyImageLimitExceeded(message, item);

        console.error(
          `[chatgpt-image-worker] stopping for daily image limit id=${item.id} error=${message}${
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

      if (error instanceof BrowserSessionUnresponsiveError) {
        updateStatus(item.id, "pending", {
          lastError: message,
          promptVersion: PROMPT_VERSION,
        });

        notifyBrowserSessionUnresponsive(message, item);

        console.error(
          `[chatgpt-image-worker] stopping for browser session stall id=${item.id} error=${message}${
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

      if (error instanceof ComposerMenuStuckError) {
        updateStatus(item.id, "pending", {
          lastError: message,
          promptVersion: PROMPT_VERSION,
        });

        sendNotify(
          "ChatGPT worker stopped: composer menu stuck",
          `id=${item.id}${item.postTitle ? ` ${item.postTitle}` : ""}. ${message}`,
        );

        console.error(
          `[chatgpt-image-worker] stopping for stuck composer menu id=${item.id} error=${message}${
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

      const circuitError = classifyErrorForCircuitBreaker(error, message);

      if (consecutiveErrorState.key === circuitError.key) {
        consecutiveErrorState = {
          ...circuitError,
          count: consecutiveErrorState.count + 1,
        };
      } else {
        consecutiveErrorState = {
          ...circuitError,
          count: 1,
        };
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

      if (
        consecutiveErrorState.count >= options.maxConsecutiveSameError
      ) {
        sendNotify(
          "ChatGPT worker stopped: repeated errors",
          `Stopped after ${consecutiveErrorState.count} consecutive "${consecutiveErrorState.label}" failures. last id=${item.id}${item.postTitle ? ` ${item.postTitle}` : ""}.`,
        );

        console.error(
          `[chatgpt-image-worker] stopping after ${consecutiveErrorState.count} consecutive ${consecutiveErrorState.key} failures`,
        );

        throw error;
      }

      if (message.startsWith("Timed out waiting for ")) {
        sendNotify(
          "ChatGPT worker timeout",
          `id=${item.id}${item.postTitle ? ` ${item.postTitle}` : ""}. ${message}`,
        );
      }

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
