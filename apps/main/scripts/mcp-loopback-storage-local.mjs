#!/usr/bin/env node

// Development-only S3/R2 receiver for the local OAuth MCP image smoke.
import { createServer } from "node:http";

if (process.env.NODE_ENV === "production") {
  throw new Error("Loopback image storage cannot run in production.");
}

const port = Number(process.env.MCP_LOOPBACK_STORAGE_PORT ?? "8791");
if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  throw new Error("MCP_LOOPBACK_STORAGE_PORT must be a local user port.");
}

const objects = new Map();
const server = createServer((request, response) => {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  if (request.method === "GET" && url.pathname === "/health") {
    response.writeHead(200).end("ready");
    return;
  }
  if (request.method === "GET" && url.pathname === "/_summary") {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(
      JSON.stringify(
        [...objects].map(([key, object]) => ({
          key,
          size: object.body.byteLength,
          contentType: object.contentType,
        })),
      ),
    );
    return;
  }
  if (
    ![
      "/integration-mcp-images/",
      "/integration-r2-images/",
    ].some((prefix) => url.pathname.startsWith(prefix))
  ) {
    response.writeHead(404).end();
    return;
  }
  const object = objects.get(url.pathname);
  if (request.method === "HEAD" || request.method === "GET") {
    if (!object) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, {
      "Content-Length": object.body.byteLength,
      "Content-Type": object.contentType,
    });
    response.end(request.method === "GET" ? object.body : undefined);
    return;
  }
  if (
    request.method !== "PUT" ||
    (!request.headers.authorization && !url.searchParams.has("X-Amz-Signature"))
  ) {
    response.writeHead(400).end();
    return;
  }
  const contentType = request.headers["content-type"];
  if (typeof contentType !== "string" || !contentType.startsWith("image/")) {
    response.writeHead(400).end();
    return;
  }
  const chunks = [];
  let size = 0;
  request.on("data", (chunk) => {
    size += chunk.byteLength;
    if (size > 10 * 1024 * 1024) {
      request.destroy();
      return;
    }
    chunks.push(chunk);
  });
  request.on("end", () => {
    objects.set(url.pathname, {
      body: Buffer.concat(chunks),
      contentType,
    });
    response.writeHead(200).end();
  });
});

server.listen(port, "127.0.0.1", () => {
  process.stdout.write(`Loopback MCP image storage ready on 127.0.0.1:${port}\n`);
});
