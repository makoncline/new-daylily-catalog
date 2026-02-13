import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

interface CliOptions {
  inputPath: string;
  outputPath: string;
  prompt: string;
  model: string;
  imageGenerationCount: number;
  cookie: string;
  csrfToken: string;
  bearerToken: string;
  clientTransactionId: string;
  timeoutMs: number;
  debugStreamPath?: string;
  conversationId?: string;
}

interface UploadResponse {
  media_id_string?: string;
  media_id?: number;
  image?: {
    w?: number;
    h?: number;
  };
}

const DEFAULT_MODEL = "grok-4";
const DEFAULT_IMAGE_GENERATION_COUNT = 1;
const DEFAULT_TIMEOUT_MS = 180_000;

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const getArg = (flag: string) => {
    const index = args.indexOf(flag);
    if (index === -1) return undefined;
    return args[index + 1];
  };

  const inputPath = getArg("--input");
  const outputPath = getArg("--output");
  const prompt = getArg("--prompt");

  if (!inputPath) {
    throw new Error("Missing required --input");
  }
  if (!outputPath) {
    throw new Error("Missing required --output");
  }
  if (!prompt) {
    throw new Error("Missing required --prompt");
  }

  const cookie = process.env.X_GROK_COOKIE;
  const csrfToken = process.env.X_GROK_CSRF_TOKEN;
  const bearerToken = process.env.X_GROK_BEARER_TOKEN;
  const clientTransactionId = process.env.X_GROK_CLIENT_TRANSACTION_ID;

  if (!cookie) throw new Error("Missing env X_GROK_COOKIE");
  if (!csrfToken) throw new Error("Missing env X_GROK_CSRF_TOKEN");
  if (!bearerToken) throw new Error("Missing env X_GROK_BEARER_TOKEN");
  if (!clientTransactionId) {
    throw new Error("Missing env X_GROK_CLIENT_TRANSACTION_ID");
  }

  const model = getArg("--model") ?? DEFAULT_MODEL;
  const imageGenerationCount = Number(
    getArg("--image-generation-count") ?? DEFAULT_IMAGE_GENERATION_COUNT,
  );
  if (!Number.isFinite(imageGenerationCount) || imageGenerationCount < 1) {
    throw new Error("Invalid --image-generation-count");
  }

  const timeoutMs = Number(getArg("--timeout-ms") ?? DEFAULT_TIMEOUT_MS);
  if (!Number.isFinite(timeoutMs) || timeoutMs < 10_000) {
    throw new Error("Invalid --timeout-ms");
  }

  const debugStreamPath = getArg("--debug-stream-path");
  const conversationId = getArg("--conversation-id");

  return {
    inputPath: path.resolve(inputPath),
    outputPath: path.resolve(outputPath),
    prompt: prompt.trim(),
    model,
    imageGenerationCount,
    cookie,
    csrfToken,
    bearerToken,
    clientTransactionId,
    timeoutMs,
    debugStreamPath: debugStreamPath
      ? path.resolve(debugStreamPath)
      : undefined,
    conversationId: randomUUID(),
  };
}

function getCookieValue(cookie: string, key: string): string | null {
  const parts = cookie.split(";").map((part) => part.trim());
  for (const part of parts) {
    const [k, ...rest] = part.split("=");
    if (k === key) {
      return rest.join("=");
    }
  }
  return null;
}

function inferMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  return "application/octet-stream";
}

function buildCommonHeaders(options: CliOptions): Record<string, string> {
  return {
    accept: "*/*",
    "accept-language": "en-US,en;q=0.8",
    authorization: `Bearer ${options.bearerToken}`,
    origin: "https://x.com",
    referer: "https://x.com/",
    "x-csrf-token": options.csrfToken,
    "x-twitter-active-user": "yes",
    "x-twitter-auth-type": "OAuth2Session",
    "x-twitter-client-language": "en",
    "x-client-transaction-id": options.clientTransactionId,
    cookie: options.cookie,
    "user-agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36",
  };
}

async function uploadInputImage(options: CliOptions) {
  const inputBuffer = await fs.promises.readFile(options.inputPath);
  const mimeType = inferMimeType(options.inputPath);
  const fileName = path.basename(options.inputPath);

  const formData = new FormData();
  formData.set("media", new Blob([inputBuffer], { type: mimeType }), fileName);
  formData.set("media_category", "tweet_image");
  formData.set("shared", "true");

  const response = await fetch("https://upload.x.com/i/media/upload.json", {
    method: "POST",
    headers: buildCommonHeaders(options),
    body: formData,
  });

  const bodyText = await response.text();
  if (!response.ok) {
    throw new Error(`Upload failed: HTTP ${response.status}: ${bodyText}`);
  }

  const parsed = JSON.parse(bodyText) as UploadResponse;
  const mediaId =
    parsed.media_id_string ??
    (parsed.media_id ? String(parsed.media_id) : null);
  if (!mediaId) {
    throw new Error(`Upload response missing media id: ${bodyText}`);
  }

  return {
    mediaId,
    fileName,
    mimeType,
    width: parsed.image?.w ?? null,
    height: parsed.image?.h ?? null,
  };
}

function extractUrlsFromMessageText(text: string) {
  const matches = text.match(/https?:\/\/[^\s)"]+/g) ?? [];
  return matches;
}

async function runAddResponse(
  options: CliOptions,
  uploaded: {
    mediaId: string;
    fileName: string;
    mimeType: string;
    width: number | null;
    height: number | null;
  },
) {
  const payload = {
    responses: [
      {
        message: options.prompt,
        sender: 1,
        promptSource: "",
        fileAttachments: [
          {
            fileName: uploaded.fileName,
            mimeType: uploaded.mimeType,
            mediaId: uploaded.mediaId,
            url: `https://ton.x.com/i/ton/data/grok-attachment/${uploaded.mediaId}`,
            dimensions:
              uploaded.width && uploaded.height
                ? { width: uploaded.width, height: uploaded.height }
                : undefined,
          },
        ],
      },
    ],
    systemPromptName: "",
    grokModelOptionId: options.model,
    modelMode: "MODEL_MODE_EXPERT",
    conversationId: options.conversationId,
    returnSearchResults: true,
    returnCitations: true,
    promptMetadata: {
      promptSource: "NATURAL",
      action: "INPUT",
    },
    imageGenerationCount: options.imageGenerationCount,
    requestFeatures: {
      eagerTweets: true,
      serverHistory: true,
    },
    enableSideBySide: true,
    toolOverrides: {},
    modelConfigOverride: {},
    isTemporaryChat: options.conversationId ? false : true,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);

  try {
    const response = await fetch(
      "https://grok.x.com/2/grok/add_response.json",
      {
        method: "POST",
        headers: {
          ...buildCommonHeaders(options),
          "content-type": "text/plain;charset=UTF-8",
          "x-xai-request-id": randomUUID(),
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      },
    );

    const streamText = await response.text();
    if (options.debugStreamPath) {
      await fs.promises.mkdir(path.dirname(options.debugStreamPath), {
        recursive: true,
      });
      await fs.promises.writeFile(options.debugStreamPath, streamText, "utf8");
    }

    if (!response.ok) {
      throw new Error(
        `add_response failed: HTTP ${response.status}: ${streamText.slice(0, 500)}`,
      );
    }

    const lines = streamText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const imageApiUrls: string[] = [];
    const tonUrls: string[] = [];
    let messageText = "";

    for (const line of lines) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(line);
      } catch {
        continue;
      }
      if (!parsed || typeof parsed !== "object") continue;
      const root = parsed as Record<string, unknown>;
      const result =
        root.result && typeof root.result === "object"
          ? (root.result as Record<string, unknown>)
          : null;
      if (!result) continue;

      const imageAttachment =
        result.imageAttachment && typeof result.imageAttachment === "object"
          ? (result.imageAttachment as Record<string, unknown>)
          : null;
      if (imageAttachment) {
        const imageUrl = imageAttachment.imageUrl;
        if (typeof imageUrl === "string" && imageUrl.length > 0) {
          imageApiUrls.push(imageUrl);
        }
      }

      const event =
        result.event && typeof result.event === "object"
          ? (result.event as Record<string, unknown>)
          : null;
      const imageAttachmentUpdate =
        event?.imageAttachmentUpdate &&
        typeof event.imageAttachmentUpdate === "object"
          ? (event.imageAttachmentUpdate as Record<string, unknown>)
          : null;
      if (imageAttachmentUpdate) {
        const imageUrl = imageAttachmentUpdate.imageUrl;
        if (typeof imageUrl === "string" && imageUrl.length > 0) {
          tonUrls.push(imageUrl);
        }
      }

      const message = result.message;
      if (typeof message === "string" && message.length > 0) {
        messageText += message;
      }
    }

    const textUrls = extractUrlsFromMessageText(messageText);

    return {
      imageApiUrls,
      tonUrls,
      textUrls,
      rawMessageText: messageText,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function downloadWithAuth(
  url: string,
  options: CliOptions,
): Promise<Buffer> {
  const response = await fetch(url, {
    headers: buildCommonHeaders(options),
  });

  if (!response.ok) {
    throw new Error(`Download failed for ${url}: HTTP ${response.status}`);
  }

  const data = await response.arrayBuffer();
  return Buffer.from(data);
}

async function tryDownloadResult(options: CliOptions, url: string) {
  try {
    const fileBuffer = await downloadWithAuth(url, options);
    if (fileBuffer.length > 0) {
      await fs.promises.mkdir(path.dirname(options.outputPath), {
        recursive: true,
      });
      await fs.promises.writeFile(options.outputPath, fileBuffer);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

async function run() {
  const options = parseArgs();
  const authToken = getCookieValue(options.cookie, "auth_token");
  const ct0 = getCookieValue(options.cookie, "ct0");
  if (!authToken || !ct0) {
    throw new Error(
      "X_GROK_COOKIE must include auth_token=... and ct0=... entries",
    );
  }

  console.log("[x-web-edit] Uploading input image...");
  const uploaded = await uploadInputImage(options);
  console.log(`[x-web-edit] Uploaded media_id=${uploaded.mediaId}`);

  console.log("[x-web-edit] Submitting add_response...");
  const streamResult = await runAddResponse(options, uploaded);
  console.log(
    `[x-web-edit] Stream parsed: imageApiUrls=${streamResult.imageApiUrls.length}, tonUrls=${streamResult.tonUrls.length}, textUrls=${streamResult.textUrls.length}`,
  );

  const orderedUrls = [
    ...streamResult.imageApiUrls,
    ...streamResult.tonUrls,
    ...streamResult.textUrls,
  ];
  const uniqueUrls = Array.from(new Set(orderedUrls));

  if (uniqueUrls.length === 0) {
    throw new Error(
      "No downloadable image URL found in stream response. Use --debug-stream-path to inspect raw stream.",
    );
  }

  for (const url of uniqueUrls) {
    const ok = await tryDownloadResult(options, url);
    if (ok) {
      console.log(`[x-web-edit] Saved edited image to ${options.outputPath}`);
      console.log(`[x-web-edit] Source URL: ${url}`);
      return;
    }
  }

  throw new Error(
    "Found candidate URLs but failed to download any result image with current session headers/cookies.",
  );
}

run().catch((error) => {
  console.error("[x-web-edit] Fatal:", error);
  process.exitCode = 1;
});
