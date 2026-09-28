#!/usr/bin/env node

// Exercise the separate member API client against a disposable local SQLite copy.
// Keep the authorization code and access token in memory.
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { createServer } from "node:http";

const baseUrl = new URL(process.env.MCP_BASE_URL ?? "http://localhost:3217");
const clientId = process.env.MEMBER_MANAGE_OAUTH_CLIENT_ID;
const mcpClientId = process.env.DAYLILY_MCP_OAUTH_CLIENT_ID;
const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const databaseUrl = process.env.DATABASE_URL;
const foreignListingId = process.env.MANAGE_SMOKE_FOREIGN_LISTING_ID;
const redirectUri = "http://127.0.0.1:8788/callback";

if (
  !["localhost", "127.0.0.1", "[::1]"].includes(baseUrl.hostname) ||
  !databaseUrl?.startsWith("file:/tmp/daylily-member-manage-oauth-") ||
  !clientId ||
  !mcpClientId ||
  clientId === mcpClientId ||
  !publishableKey ||
  !foreignListingId
) {
  throw new Error(
    "Use a loopback app, a disposable /tmp/daylily-member-manage-oauth-* SQLite database, and distinct OAuth client IDs.",
  );
}

const issuerHost = Buffer.from(
  publishableKey.replace(/^pk_(?:test|live)_/, ""),
  "base64",
)
  .toString("utf8")
  .replace(/\$$/, "");
if (!issuerHost || issuerHost.includes("/") || issuerHost.includes(":")) {
  throw new Error("Could not read the Clerk issuer from the publishable key.");
}
const issuer = `https://${issuerHost}`;
const verifier = randomBytes(32).toString("base64url");
const challenge = createHash("sha256").update(verifier).digest("base64url");
const state = randomBytes(24).toString("base64url");
const authorizeUrl = new URL("/oauth/authorize", issuer);
authorizeUrl.searchParams.set("client_id", clientId);
authorizeUrl.searchParams.set("response_type", "code");
authorizeUrl.searchParams.set("redirect_uri", redirectUri);
authorizeUrl.searchParams.set(
  "scope",
  "catalog:read catalog:write catalog:manage",
);
authorizeUrl.searchParams.set("state", state);
authorizeUrl.searchParams.set("code_challenge", challenge);
authorizeUrl.searchParams.set("code_challenge_method", "S256");

const callbackServer = createServer();
let callbackTimer;
const callback = new Promise((resolve, reject) => {
  callbackTimer = setTimeout(
    () => reject(new Error("OAuth callback timed out.")),
    5 * 60_000,
  );
  callbackServer.on("request", (request, response) => {
    const url = new URL(request.url ?? "/", redirectUri);
    if (url.pathname !== "/callback") {
      response.writeHead(404).end("Not found");
      return;
    }
    if (url.searchParams.get("state") !== state) {
      response.writeHead(400).end("Invalid state");
      reject(new Error("OAuth state did not match."));
      return;
    }
    const error = url.searchParams.get("error");
    if (error) {
      response.writeHead(400).end("OAuth authorization failed");
      reject(new Error(`OAuth authorization failed: ${error}`));
      return;
    }
    const code = url.searchParams.get("code");
    if (!code) {
      response.writeHead(400).end("Missing authorization code");
      reject(new Error("OAuth callback had no authorization code."));
      return;
    }
    response.writeHead(200, { "Content-Type": "text/plain" });
    response.end("Daylily member API OAuth callback received.");
    resolve(code);
  });
});

await new Promise((resolve, reject) => {
  callbackServer.once("error", reject);
  callbackServer.listen(8788, "127.0.0.1", resolve);
});
process.stdout.write(`Open this authorization URL:\n${authorizeUrl}\n`);

try {
  const code = await callback;
  const tokenResponse = await fetch(new URL("/oauth/token", issuer), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      redirect_uri: redirectUri,
      code,
      code_verifier: verifier,
    }),
  });
  const tokenResult = await tokenResponse.json();
  if (!tokenResponse.ok || !tokenResult.access_token) {
    throw new Error(
      `Token exchange failed: ${tokenResponse.status} ${tokenResult.error ?? "unknown"}`,
    );
  }

  async function call(path, input, mutation = false) {
    const url = new URL(`/api/v1/member/${path}`, baseUrl);
    if (!mutation) {
      url.searchParams.set("input", JSON.stringify({ json: input }));
    }
    const response = await fetch(url, {
      method: mutation ? "POST" : "GET",
      headers: {
        Authorization: `Bearer ${tokenResult.access_token}`,
        "Content-Type": "application/json",
      },
      ...(mutation ? { body: JSON.stringify({ json: input }) } : {}),
    });
    const body = await response.json();
    return { status: response.status, data: body.result?.data?.json };
  }

  function requireStatus(result, status, operation) {
    if (result.status !== status) {
      throw new Error(
        `${operation} returned HTTP ${result.status}, expected ${status}.`,
      );
    }
    return result.data;
  }

  const mcpResponse = await fetch(new URL("/api/mcp/server", baseUrl), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenResult.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name: "daylily.get_profile", arguments: {} },
    }),
  });
  const mcpResult = await mcpResponse.json();
  if (
    mcpResponse.status !== 403 ||
    mcpResult.result?.isError !== true ||
    !Array.isArray(mcpResult.result?._meta?.["mcp/www_authenticate"]) ||
    !mcpResponse.headers.get("www-authenticate")?.includes('scope="catalog:read"')
  ) {
    throw new Error("The separate member API client reached private MCP data.");
  }

  const listings = requireStatus(
    await call("listing.page", { limit: 1 }),
    200,
    "listing.page",
  );
  const ownedListingId = listings.items?.[0]?.id;
  if (!ownedListingId) throw new Error("The seeded member has no listing.");
  if (foreignListingId === ownedListingId) {
    throw new Error("The foreign listing ID must differ from the owned ID.");
  }
  requireStatus(
    await call("listing.delete", { id: foreignListingId }, true),
    404,
    "foreign listing.delete",
  );

  const list = requireStatus(
    await call(
      "list.create",
      { requestId: randomUUID(), title: `Manage OAuth smoke ${randomUUID()}` },
      true,
    ),
    200,
    "list.create",
  );
  requireStatus(
    await call(
      "list.addListing",
      { listId: list.id, listingId: ownedListingId },
      true,
    ),
    200,
    "list.addListing",
  );
  requireStatus(
    await call("list.delete", { id: list.id }, true),
    412,
    "nonempty list.delete",
  );
  requireStatus(
    await call(
      "list.removeListings",
      { listId: list.id, listingIds: [ownedListingId] },
      true,
    ),
    200,
    "list.removeListings",
  );
  requireStatus(
    await call("list.delete", { id: list.id }, true),
    200,
    "empty list.delete",
  );

  const listing = requireStatus(
    await call(
      "listing.create",
      {
        requestId: randomUUID(),
        title: "Manage OAuth smoke listing",
        hidden: true,
      },
      true,
    ),
    200,
    "listing.create",
  );
  requireStatus(
    await call("listing.delete", { id: listing.id }, true),
    200,
    "listing.delete",
  );
  requireStatus(
    await call("listing.get", { id: listing.id }),
    404,
    "deleted listing.get",
  );

  process.stdout.write(
    `${JSON.stringify({ clientId, mcpClientRejected: true, managedListRemoved: true, nonemptyListProtected: true, managedListingDeleted: true, foreignListingProtected: true, tokenFormat: tokenResult.access_token.split(".").length === 3 ? "jwt" : "opaque" })}\n`,
  );
} finally {
  clearTimeout(callbackTimer);
  callbackServer.close();
}
