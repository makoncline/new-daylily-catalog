import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";
import {
  getCounts,
  getEditedItems,
  getFilePath,
  getItem,
  getItems,
  ORIGINALS_DIR,
  REVIEW_DB_PATH,
  REVIEW_EDITED_DIR,
  syncQueue,
  updateStatus,
} from "./review-db.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.V2_IMAGE_REVIEW_PORT ?? "4310");

function getContentType(filePath) {
  const extension = path.extname(filePath).toLowerCase();

  if (extension === ".html") {
    return "text/html; charset=utf-8";
  }

  if (extension === ".js" || extension === ".mjs") {
    return "text/javascript; charset=utf-8";
  }

  if (extension === ".png") {
    return "image/png";
  }

  if (extension === ".webp") {
    return "image/webp";
  }

  return "image/jpeg";
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk.toString("utf8");
    });

    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });

    request.on("error", reject);
  });
}

function sendJson(response, data, statusCode = 200) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(JSON.stringify(data));
}

function sendFile(response, filePath) {
  response.writeHead(200, {
    "content-type": getContentType(filePath),
    "cache-control": "no-store",
  });
  fs.createReadStream(filePath).pipe(response);
}

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url ?? "/", `http://127.0.0.1:${PORT}`);

  if (request.method === "GET" && requestUrl.pathname === "/") {
    sendFile(response, path.join(SCRIPT_DIR, "index.html"));
    return;
  }

  if (request.method === "GET" && requestUrl.pathname === "/gallery") {
    sendFile(response, path.join(SCRIPT_DIR, "gallery.html"));
    return;
  }

  if (request.method === "GET" && requestUrl.pathname === "/app.mjs") {
    sendFile(response, path.join(SCRIPT_DIR, "app.mjs"));
    return;
  }

  if (request.method === "GET" && requestUrl.pathname === "/gallery.mjs") {
    sendFile(response, path.join(SCRIPT_DIR, "gallery.mjs"));
    return;
  }

  if (request.method === "GET" && requestUrl.pathname === "/api/state") {
    const limit = Math.max(
      1,
      Math.min(24, Number(requestUrl.searchParams.get("limit") ?? "6") || 6),
    );
    const offset = Math.max(0, Number(requestUrl.searchParams.get("offset") ?? "0") || 0);

    sendJson(response, {
      counts: getCounts(),
      item: getItem(requestUrl.searchParams.get("id")),
      items: getItems({ limit, offset }),
      paging: { limit, offset },
      paths: {
        originals: ORIGINALS_DIR,
        edited: REVIEW_EDITED_DIR,
        db: REVIEW_DB_PATH,
      },
    });
    return;
  }

  if (request.method === "GET" && requestUrl.pathname === "/api/edited") {
    sendJson(response, {
      items: getEditedItems(),
      paths: {
        edited: REVIEW_EDITED_DIR,
      },
    });
    return;
  }

  if (request.method === "POST" && requestUrl.pathname === "/api/sync") {
    sendJson(response, syncQueue());
    return;
  }

  if (request.method === "POST" && requestUrl.pathname === "/api/status") {
    const body = await readJsonBody(request);
    const id = typeof body.id === "string" ? body.id : null;
    const status = typeof body.status === "string" ? body.status : null;

    if (!id || !status) {
      sendJson(response, { error: "Missing id or status" }, 400);
      return;
    }

    if (status === "requeue") {
      updateStatus(id, "pending", { editedPath: null, lastError: null });
    } else if (
      status === "approved" ||
      status === "rejected" ||
      status === "review"
    ) {
      updateStatus(id, status);
    } else {
      sendJson(response, { error: "Unsupported status" }, 400);
      return;
    }

    sendJson(response, { ok: true });
    return;
  }

  if (request.method === "GET" && requestUrl.pathname === "/image") {
    const id = requestUrl.searchParams.get("id");
    const variant = requestUrl.searchParams.get("variant");

    if (!id || (variant !== "original" && variant !== "edited")) {
      sendJson(response, { error: "Missing id or variant" }, 400);
      return;
    }

    const filePath = getFilePath(id, variant);

    if (!filePath || !fs.existsSync(filePath)) {
      sendJson(response, { error: "Not found" }, 404);
      return;
    }

    sendFile(response, filePath);
    return;
  }

  sendJson(response, { error: "Not found" }, 404);
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[v2-image-review] http://127.0.0.1:${PORT}`);
});
