import { readFileSync } from "node:fs";
import { createServer } from "node:https";

import { rollingOaksStorefrontFixture } from "../../src/fixtures/rolling-oaks-storefront.ts";

const host = "127.0.0.1";
const port = 3443;
const sellerId = "3";
const snapshotPath = `/api/v1/storefronts/${sellerId}`;
const inquiryPath = `${snapshotPath}/inquiries`;
const snapshotEtag = '"rolling-oaks-ci-v1"';
const snapshotBody = JSON.stringify({
  ...rollingOaksStorefrontFixture,
  generatedAt: new Date().toISOString(),
});
const inquiryToken = process.env.STOREFRONT_FIXTURE_INQUIRY_TOKEN;
const certificatePath = process.env.STOREFRONT_FIXTURE_CERTIFICATE_PATH;
const privateKeyPath = process.env.STOREFRONT_FIXTURE_PRIVATE_KEY_PATH;

if (!inquiryToken || !certificatePath || !privateKeyPath) {
  throw new Error("Fixture HTTPS server configuration is incomplete.");
}

function sendJson(response, statusCode, value) {
  const body = JSON.stringify(value);
  response.writeHead(statusCode, {
    "Cache-Control": "no-store",
    "Content-Length": Buffer.byteLength(body),
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(body);
}

async function readJsonBody(request) {
  const chunks = [];
  let byteLength = 0;
  for await (const chunk of request) {
    byteLength += chunk.length;
    if (byteLength > 64 * 1024) {
      throw new Error("Request body is too large.");
    }
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

const server = createServer(
  {
    cert: readFileSync(certificatePath),
    key: readFileSync(privateKeyPath),
  },
  async (request, response) => {
    const requestUrl = new URL(request.url ?? "/", `https://${host}:${port}`);

    if (request.method === "GET" && requestUrl.pathname === "/health") {
      sendJson(response, 200, { ok: true });
      return;
    }

    if (request.method === "GET" && requestUrl.pathname === snapshotPath) {
      if (request.headers["if-none-match"] === snapshotEtag) {
        response.writeHead(304, { ETag: snapshotEtag });
        response.end();
        return;
      }
      response.writeHead(200, {
        "Cache-Control": "public, max-age=60",
        "Content-Length": Buffer.byteLength(snapshotBody),
        "Content-Type": "application/json; charset=utf-8",
        ETag: snapshotEtag,
      });
      response.end(snapshotBody);
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === inquiryPath) {
      if (request.headers.authorization !== `Bearer ${inquiryToken}`) {
        sendJson(response, 401, { error: "unauthorized" });
        return;
      }

      try {
        const inquiry = await readJsonBody(request);
        if (
          inquiry === null ||
          typeof inquiry !== "object" ||
          !["cart", "contact"].includes(inquiry.kind)
        ) {
          throw new Error("Invalid inquiry.");
        }
      } catch {
        sendJson(response, 400, { error: "invalid_inquiry" });
        return;
      }

      sendJson(response, 202, {
        id: "storefront-ci-inquiry",
        acceptedAt: new Date().toISOString(),
      });
      return;
    }

    sendJson(response, 404, { error: "not_found" });
  },
);

server.listen(port, host, () => {
  process.stdout.write(`Storefront API fixture is ready on ${host}:${port}.\n`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}
