import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  ensureSchema,
  LOCAL_RUNTIME_ROOT,
  openQueueDb,
  PROD_COPY_DB_PATH,
  REPO_ROOT,
  REVIEW_EDITED_DIR,
  updateStatus,
} from "./review-db.mjs";

const CDP_SCRIPT =
  "/Users/makon/.agents/skills/chrome-cdp/scripts/cdp.mjs";
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEDICATED_CHROME_USER_DATA_DIR = path.join(
  LOCAL_RUNTIME_ROOT,
  "chrome-user-data",
);
const CDP_DEVTOOLS_PORT_FILE = path.join(
  DEDICATED_CHROME_USER_DATA_DIR,
  "DevToolsActivePort",
);
const CHROME_LAUNCH_SCRIPT_PATH = path.join(
  SCRIPT_DIR,
  "launch-chatgpt-chrome.sh",
);
const TARGET_CACHE_PATH = path.join(LOCAL_RUNTIME_ROOT, ".chatgpt-target-id");
const WORKER_LOG_PATH = path.join(
  REPO_ROOT,
  "downloads",
  "v2-ahs-image-review",
  "chatgpt-worker.log",
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
let activeProjectUrl = DEFAULT_PROJECT_URL;
let activeProjectPrefix = DEFAULT_PROJECT_URL.replace(/\/project$/, "");
let activeTargetId = null;

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
  const nextArgs = [...args];

  if (nextArgs.length > 1 && nextArgs[0] !== "list" && nextArgs[0] !== "list_raw") {
    if (activeTargetId) {
      nextArgs[1] = activeTargetId;
    }
  }

  try {
    return execFileSync("node", [CDP_SCRIPT, ...nextArgs], {
      encoding: "utf8",
      env: {
        ...process.env,
        CDP_DEVTOOLS_PORT_FILE: CDP_DEVTOOLS_PORT_FILE,
      },
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

    const targetScopedCommand =
      nextArgs.length > 1 && nextArgs[0] !== "list" && nextArgs[0] !== "list_raw";

    if (
      !targetScopedCommand ||
      !errorText.includes("No target matching prefix") ||
      !activeProjectUrl
    ) {
      throw error;
    }

    console.warn(
      `[chatgpt-image-worker] target ${nextArgs[1]} went stale; rediscovering project tab`,
    );
    clearCachedTargetId();
    activeTargetId = null;
    const freshTargetId = findProjectTarget(activeProjectUrl, activeProjectPrefix);
    activeTargetId = freshTargetId;
    nextArgs[1] = freshTargetId;

    return execFileSync("node", [CDP_SCRIPT, ...nextArgs], {
      encoding: "utf8",
      env: {
        ...process.env,
        CDP_DEVTOOLS_PORT_FILE: CDP_DEVTOOLS_PORT_FILE,
      },
    }).trim();
  }
}

function notifyBrowserApprovalRequired(message, item = null) {
  const details = item
    ? `id=${item.id}${item.postTitle ? ` ${item.postTitle}` : ""}. ${message}`
    : message;

  sendNotify("ChatGPT worker needs Chrome approval", details);
}

function execCdpJson(args) {
  const output = execCdp(args);
  return JSON.parse(output);
}

function readCachedTargetId() {
  if (!fs.existsSync(TARGET_CACHE_PATH)) {
    return null;
  }

  const targetId = fs.readFileSync(TARGET_CACHE_PATH, "utf8").trim();
  return targetId || null;
}

function writeCachedTargetId(targetId) {
  fs.writeFileSync(TARGET_CACHE_PATH, `${targetId}\n`);
}

function clearCachedTargetId() {
  fs.rmSync(TARGET_CACHE_PATH, { force: true });
}

function tryCachedProjectTarget(targetId, projectUrl, projectPrefix) {
  if (!targetId) {
    return null;
  }

  try {
    const url = execCdp(["eval", targetId, "location.href"]);

    if (
      url === projectUrl ||
      url.startsWith(`${projectPrefix}/c/`) ||
      url.startsWith(projectPrefix)
    ) {
      return targetId;
    }
  } catch {}

  return null;
}

function findProjectTarget(projectUrl, projectPrefix) {
  const cachedTargetId = readCachedTargetId();

  if (cachedTargetId) {
    const targetId = tryCachedProjectTarget(
      cachedTargetId,
      projectUrl,
      projectPrefix,
    );

    if (targetId) {
      activeTargetId = targetId;
      console.log(
        `[chatgpt-image-worker] using cached target=${cachedTargetId}`,
      );
      return targetId;
    }

    clearCachedTargetId();
  }

  const targets = execCdpJson(["list_raw"]);
  const target =
    targets.find((entry) => entry.url === projectUrl) ??
    targets.find((entry) => entry.url.startsWith(`${projectPrefix}/c/`)) ??
    targets.find((entry) => entry.url.startsWith(projectPrefix));

  if (target?.targetId) {
    writeCachedTargetId(target.targetId);
    activeTargetId = target.targetId;
    return target.targetId;
  }

  throw new Error(
    `Could not find a ChatGPT project tab for ${projectUrl}. Launch the dedicated ChatGPT Chrome first with ${CHROME_LAUNCH_SCRIPT_PATH}.`,
  );
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
      const url = execCdp(["eval", target, "location.href"]);
      return url === projectUrl;
    },
    20000,
    500,
  );
}

async function clickProjectHomeLink(target, projectUrl) {
  const raw = execCdp([
    "eval",
    target,
    `(() => {
      const link = document.querySelector(
        ${JSON.stringify(`a[aria-label="Open daylily images project"][href="${projectUrl.replace("https://chatgpt.com", "")}"]`)},
      );
      if (!link) {
        return "";
      }
      const r = link.getBoundingClientRect();
      return JSON.stringify({ cx: r.x + r.width / 2, cy: r.y + r.height / 2 });
    })()`,
  ]);

  if (!raw) {
    return false;
  }

  const rect = JSON.parse(raw);
  execCdp(["clickxy", target, String(rect.cx), String(rect.cy)]);
  return true;
}

async function ensureProjectPage(target, projectUrl, projectPrefix) {
  const currentUrl = execCdp(["eval", target, "location.href"]);

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
  const rect = await waitFor(
    "composer plus button",
    async () => {
      const raw = execCdp([
        "eval",
        target,
        `(() => {
          const button = document.getElementById("composer-plus-btn");
          if (!button) {
            return "";
          }
          const r = button.getBoundingClientRect();
          return JSON.stringify({ cx: r.x + r.width / 2, cy: r.y + r.height / 2 });
        })()`,
      ]);

      return raw ? JSON.parse(raw) : null;
    },
    20000,
    300,
  );

  execCdp(["clickxy", target, String(rect.cx), String(rect.cy)]);

  return waitFor(
    "Create image menu",
    async () => {
      const raw = execCdp([
        "eval",
        target,
        `(() => {
          const item = [...document.querySelectorAll("[role=menuitemradio]")].find(
            (node) => node.innerText && node.innerText.includes("Create image"),
          );
          if (!item) {
            return "";
          }
          const r = item.getBoundingClientRect();
          return JSON.stringify({
            cx: r.x + r.width / 2,
            cy: r.y + r.height / 2,
            checked: item.getAttribute("aria-checked") === "true",
          });
        })()`,
      ]);

      return raw ? JSON.parse(raw) : null;
    },
    10000,
    300,
  );
}

async function isCreateImageModeActive(target) {
  return (
    execCdp([
      "eval",
      target,
      `String(!!document.querySelector('button[aria-label="Image, click to remove"]'))`,
    ]) === "true"
  );
}

async function focusPromptEditor(target) {
  const rect = await waitFor(
    "prompt editor",
    async () => {
      const raw = execCdp([
        "eval",
        target,
        `(() => {
          const editor = document.getElementById("prompt-textarea");
          if (!editor) {
            return "";
          }
          const r = editor.getBoundingClientRect();
          return JSON.stringify({ cx: r.x + Math.min(24, r.width / 2), cy: r.y + Math.min(24, r.height / 2) });
        })()`,
      ]);

      return raw ? JSON.parse(raw) : null;
    },
    10000,
    300,
  );

  execCdp(["clickxy", target, String(rect.cx), String(rect.cy)]);
}

async function resetComposerDraft(target) {
  while (true) {
    const removeButtons = JSON.parse(
      execCdp([
        "eval",
        target,
        `JSON.stringify(
          [...document.querySelectorAll("button")]
            .filter((button) =>
              (button.getAttribute("aria-label") || "").includes("Remove file "),
            )
            .map((button) => {
              const r = button.getBoundingClientRect();
              return { cx: r.x + r.width / 2, cy: r.y + r.height / 2 };
            }),
        )`,
      ]),
    );

    if (!Array.isArray(removeButtons) || removeButtons.length === 0) {
      break;
    }

    for (const button of removeButtons) {
      execCdp(["clickxy", target, String(button.cx), String(button.cy)]);
      await sleep(300);
    }
  }
}

async function ensureCreateImageMode(target) {
  if (await isCreateImageModeActive(target)) {
    return;
  }

  const menuState = await openComposerMenu(target);

  if (!menuState.checked) {
    execCdp([
      "clickxy",
      target,
      String(menuState.cx),
      String(menuState.cy),
    ]);
    await sleep(500);
  }

  await waitFor(
    "create image mode",
    async () => isCreateImageModeActive(target),
    10000,
    300,
  );
}

function getHtmlNodeId(target) {
  const documentRoot = execCdpJson(["evalraw", target, "DOM.getDocument", "{}"]);
  const htmlNode = documentRoot.root.children?.find(
    (node) => node.nodeName === "HTML",
  );

  if (!htmlNode?.nodeId) {
    throw new Error("Could not resolve HTML root node");
  }

  return htmlNode.nodeId;
}

async function uploadFile(target, filePath) {
  const htmlNodeId = getHtmlNodeId(target);
  const result = execCdpJson([
    "evalraw",
    target,
    "DOM.querySelector",
    JSON.stringify({ nodeId: htmlNodeId, selector: "#upload-photos" }),
  ]);

  if (!result.nodeId) {
    throw new Error("Could not find upload input");
  }

  execCdp([
    "evalraw",
    target,
    "DOM.setFileInputFiles",
    JSON.stringify({
      nodeId: result.nodeId,
      files: [filePath],
    }),
  ]);

  const fileName = path.basename(filePath);

  await waitFor(
    `${fileName} attachment`,
    async () => {
      return execCdp([
        "eval",
        target,
        `String(!![...document.querySelectorAll("button")].find((button) =>
          (button.getAttribute("aria-label") || button.innerText || "").includes("Remove file") &&
          (button.getAttribute("aria-label") || button.innerText || "").includes(${JSON.stringify(fileName)}),
        ))`,
      ]) === "true";
    },
    15000,
    400,
  );
}

async function fillPromptAndSend(target, prompt) {
  await focusPromptEditor(target);
  execCdp(["type", target, prompt]);

  await waitFor(
    "prompt text in composer",
    async () => {
      return execCdp([
        "eval",
        target,
        `String(
          (document.getElementById("prompt-textarea")?.innerText || "").includes(${JSON.stringify(prompt)}) ||
          (document.querySelector('textarea[aria-label="New chat in daylily images"]')?.value || "").includes(${JSON.stringify(prompt)}),
        )`,
      ]) === "true";
    },
    10000,
    300,
  );

  await waitFor(
    "enabled send button",
    async () => {
      const disabled = execCdp([
        "eval",
        target,
        `(() => {
          const button = document.querySelector('button[aria-label="Send prompt"]');
          return button ? String(button.disabled) : "true";
        })()`,
      ]);

      return disabled === "false";
    },
    15000,
    400,
  );

  const sendButtonRect = JSON.parse(
    execCdp([
      "eval",
      target,
      `(() => {
        const button = document.querySelector('button[aria-label="Send prompt"]');
        if (!button) {
          return "";
        }
        const r = button.getBoundingClientRect();
        return JSON.stringify({ cx: r.x + r.width / 2, cy: r.y + r.height / 2 });
      })()`,
    ]),
  );

  execCdp([
    "clickxy",
    target,
    String(sendButtonRect.cx),
    String(sendButtonRect.cy),
  ]);
}

async function waitForConversationUrl(target, projectPrefix) {
  return waitFor(
    "conversation url",
    async () => {
      const url = execCdp(["eval", target, "location.href"]);
      return url.startsWith(`${projectPrefix}/c/`) ? url : null;
    },
    30000,
    500,
  );
}

function getCurrentConversationUrl(target, projectPrefix) {
  try {
    const url = execCdp(["eval", target, "location.href"]);
    return url.startsWith(`${projectPrefix}/c/`) ? url : null;
  } catch {
    return null;
  }
}

async function dismissRateLimitModal(target) {
  const raw = execCdp([
    "eval",
    target,
    `(() => {
      const button = [...document.querySelectorAll("button")].find((node) =>
        (node.innerText || node.getAttribute("aria-label") || "").trim() === "Got it",
      );
      if (!button) {
        return "";
      }
      const r = button.getBoundingClientRect();
      return JSON.stringify({ cx: r.x + r.width / 2, cy: r.y + r.height / 2 });
    })()`,
  ]);

  if (!raw) {
    return false;
  }

  const rect = JSON.parse(raw);
  execCdp(["clickxy", target, String(rect.cx), String(rect.cy)]);
  await sleep(500);
  return true;
}

async function clickSkipButton(target) {
  const raw = execCdp([
    "eval",
    target,
    `(() => {
      const button = [...document.querySelectorAll("button")].find((node) =>
        (node.innerText || node.getAttribute("aria-label") || "").trim() === "Skip",
      );
      if (!button) {
        return "";
      }
      const r = button.getBoundingClientRect();
      return JSON.stringify({ cx: r.x + r.width / 2, cy: r.y + r.height / 2 });
    })()`,
  ]);

  if (!raw) {
    return false;
  }

  const rect = JSON.parse(raw);
  execCdp(["clickxy", target, String(rect.cx), String(rect.cy)]);
  await sleep(1000);
  return true;
}

async function waitForGeneratedImage(target) {
  const result = await waitFor(
    "generated image",
    async () => {
      const result = JSON.parse(
        execCdp([
          "eval",
          target,
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
          ]),
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
  const result = execCdpJson([
    "evalraw",
    target,
    "Network.getCookies",
    JSON.stringify({ urls: [CHATGPT_ORIGIN] }),
  ]);

  return result.cookies ?? [];
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
  const cookies = getChatGptCookies(target);
  const cookieHeader = cookies
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");

  const response = await fetch(sourceUrl, {
    headers: {
      Cookie: cookieHeader,
      Referer: conversationUrl,
      "User-Agent": USER_AGENT,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch generated image (${response.status} ${response.statusText})`,
    );
  }

  const mimeType = response.headers.get("content-type") ?? "";
  const extension = mimeType.includes("png")
    ? ".png"
    : mimeType.includes("jpeg") || mimeType.includes("jpg")
      ? ".jpg"
      : mimeType.includes("webp")
        ? ".webp"
        : ".bin";

  removeExistingEditedVariants(id);

  const outputPath = path.join(REVIEW_EDITED_DIR, `${id}${extension}`);
  const bytes = Buffer.from(await response.arrayBuffer());
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
  console.log("[chatgpt-image-worker] resolving browser target");
  let target;

  try {
    target = findProjectTarget(options.projectUrl, options.projectPrefix);
  } catch (error) {
    if (error instanceof BrowserApprovalRequiredError) {
      notifyBrowserApprovalRequired(error.message);
    }
    throw error;
  }

  console.log(`[chatgpt-image-worker] target=${target}`);

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

      if (error instanceof BrowserApprovalRequiredError) {
        updateStatus(item.id, "pending", {
          lastError: message,
          promptVersion: PROMPT_VERSION,
        });

        notifyBrowserApprovalRequired(message, item);

        console.error(
          `[chatgpt-image-worker] stopping for browser approval id=${item.id} error=${message}${
            conversationUrl ? ` url=${conversationUrl}` : ""
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
