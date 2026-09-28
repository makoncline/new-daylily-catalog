import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { z } from "zod";
import { APP_CONFIG } from "@/config/constants";
import { getTrustedBaseUrl } from "@/lib/agent-readiness";
import { getScopedOAuthClient } from "@/server/api/member-oauth";
import { memberRouter } from "@/server/api/routers/member";
import {
  createTRPCContext,
  getUserByClerkId,
  type TRPCInternalContext,
} from "@/server/api/trpc";
import { getStripeSubscriptionResult } from "@/server/stripe/sync-subscription";
import { hasActiveSubscription } from "@/server/stripe/subscription-utils";
import { db, hasLocalPublicReadDb } from "@/server/db";
import {
  MEMBER_CREATE_ID_FIELDS,
  MEMBER_MANAGE_OPERATIONS,
  MEMBER_READ_OPERATIONS,
  MEMBER_WRITE_OPERATIONS,
} from "@/lib/member-api-contract";
import { MAX_MEMBER_PROFILE_CONTENT_CHARS } from "@/server/security/member-profile-content";
import { consumeMemberRequestBudget } from "@/server/security/member-request-budget";

const READ_PATHS = new Set<string>(
  MEMBER_READ_OPERATIONS.map(([name]) => name),
);
const WRITE_PATHS = new Set<string>(
  MEMBER_WRITE_OPERATIONS.map(([name]) => name),
);
const MANAGE_PATHS = new Set<string>(
  MEMBER_MANAGE_OPERATIONS.map(([name]) => name),
);

function isAllowedMemberClient(clientId: string, managed: boolean) {
  const mcpClientId = process.env.DAYLILY_MCP_OAUTH_CLIENT_ID?.trim();
  if (managed && mcpClientId && clientId === mcpClientId) return false;
  const memberClientIds = new Set(
    (process.env.DAYLILY_MEMBER_API_OAUTH_CLIENT_IDS ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),
  );
  if (memberClientIds.has(clientId)) return true;
  return !managed && Boolean(mcpClientId) && clientId === mcpClientId;
}

function isMutationPath(path: string) {
  return WRITE_PATHS.has(path) || MANAGE_PATHS.has(path);
}

const MAX_MEMBER_BODY_BYTES = 64 * 1024;
const MAX_IMAGE_PREPARE_BODY_BYTES =
  Math.ceil((APP_CONFIG.UPLOAD.MAX_FILE_SIZE * 4) / 3) + 64 * 1024;
// A valid story can use three UTF-8 bytes per character on the wire.
const MAX_PROFILE_CONTENT_BODY_BYTES =
  MAX_MEMBER_PROFILE_CONTENT_CHARS * 3 + 8 * 1024;

function maxMutationBodyBytes(path: string) {
  if (path === "image.prepareUpload") return MAX_IMAGE_PREPARE_BODY_BYTES;
  if (path === "profile.updateContent" || path === "profile.replaceContent") {
    return MAX_PROFILE_CONTENT_BODY_BYTES;
  }
  return MAX_MEMBER_BODY_BYTES;
}

async function prepareMemberMutationRequest(request: Request, path: string) {
  if (!isMutationPath(path)) return request;
  const field =
    MEMBER_CREATE_ID_FIELDS[path as keyof typeof MEMBER_CREATE_ID_FIELDS];
  const maxBytes = maxMutationBodyBytes(path);
  const declaredLength = Number(request.headers.get("content-length"));
  if (declaredLength > maxBytes) {
    return denied(413, "Member request is too large.");
  }
  const reader = request.body?.getReader();
  if (!reader) return denied(400, "A JSON request body is required.");
  const parts: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      return denied(413, "Member request is too large.");
    }
    parts.push(value);
  }
  const rawBody = Buffer.concat(parts).toString("utf8");
  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return denied(400, "Invalid JSON request.");
  }
  if (field) {
    const parsed = z
      .object({ json: z.record(z.string(), z.unknown()) })
      .safeParse(body);
    const id = parsed.success ? parsed.data.json[field] : undefined;
    if (
      !(field === "requestId"
        ? z.uuid().safeParse(id).success
        : z.string().min(1).safeParse(id).success)
    ) {
      return denied(400, `A valid ${field} is required for safe retries.`);
    }
  }
  return new Request(request.url, {
    method: request.method,
    headers: request.headers,
    body: rawBody,
  });
}

function noStore(response: Response) {
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Expose-Headers", "WWW-Authenticate");
  return response;
}

export function memberHttpOptions() {
  return noStore(
    new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Authorization, Content-Type",
      },
    }),
  );
}

function denied(
  status: number,
  message: string,
  request?: Request,
  scope?: string,
) {
  const resourceMetadata = request
    ? `${getTrustedBaseUrl(request)}/.well-known/oauth-protected-resource`
    : null;
  return noStore(
    Response.json(
      { error: message },
      {
        status,
        headers: resourceMetadata
          ? {
              "WWW-Authenticate": `Bearer resource_metadata="${resourceMetadata}"${scope ? `, scope="${scope}"` : ""}${status === 403 && scope ? ', error="insufficient_scope"' : ""}`,
            }
          : undefined,
      },
    ),
  );
}

export async function handleMemberHttpRequest(request: Request, path: string) {
  if (!READ_PATHS.has(path) && !isMutationPath(path)) {
    return denied(404, "Member operation not found.");
  }

  const requestUrl = new URL(request.url);
  if (requestUrl.searchParams.has("batch")) {
    return denied(400, "Batched member requests are not supported.");
  }

  if (
    isMutationPath(path) &&
    Number(request.headers.get("content-length")) > maxMutationBodyBytes(path)
  ) {
    return denied(413, "Member request is too large.");
  }

  if (!/^Bearer\s+\S+$/i.test(request.headers.get("authorization") ?? "")) {
    return denied(401, "An OAuth bearer token is required.", request);
  }

  const requiredScope = MANAGE_PATHS.has(path)
    ? "catalog:manage"
    : WRITE_PATHS.has(path)
      ? "catalog:write"
      : "catalog:read";
  let client: Awaited<ReturnType<typeof getScopedOAuthClient>>;
  try {
    client = await getScopedOAuthClient(request, requiredScope);
  } catch {
    return denied(401, "OAuth bearer token was rejected.", request);
  }
  if (client.status === "unauthenticated") {
    return denied(401, "OAuth bearer token was rejected.", request);
  }
  if (client.status === "insufficient_scope") {
    return denied(403, "OAuth scope is not allowed.", request, requiredScope);
  }
  if (!isAllowedMemberClient(client.clientId, MANAGE_PATHS.has(path))) {
    return denied(
      403,
      "This OAuth client is not allowed for the member API.",
      request,
    );
  }
  if (!consumeMemberRequestBudget(client.clientId, client.clerkUserId)) {
    const response = denied(
      429,
      "Member request limit reached. Retry in 60 seconds.",
    );
    response.headers.set("Retry-After", "60");
    return response;
  }
  const clerkUserId = client.clerkUserId;

  const checkedRequest = await prepareMemberMutationRequest(request, path);
  if (checkedRequest instanceof Response) return checkedRequest;

  if (
    (path === "cultivar.search" || path === "cultivar.get") &&
    !hasLocalPublicReadDb
  ) {
    return denied(503, "Local public catalog data is unavailable.");
  }

  const user = isMutationPath(path)
    ? await getUserByClerkId(clerkUserId)
    : await db.user
        .findUnique({ where: { clerkUserId } })
        .then((found) => (found ? { ...found, clerk: null } : null));
  if (!user) {
    return denied(403, "Member account not found.");
  }

  if (isMutationPath(path)) {
    const subscription = await getStripeSubscriptionResult(
      user.stripeCustomerId,
    );
    if (
      !subscription.confirmed ||
      !hasActiveSubscription(subscription.subscription.status)
    ) {
      return denied(403, "An active membership is required for writes.");
    }
  }

  const context: TRPCInternalContext = await createTRPCContext({
    headers: request.headers,
    requestUrl: request.url,
    clerkUserId,
    oauthClientId: client.clientId,
    oauthScope: requiredScope,
  });
  context._authUser = user;
  if (isMutationPath(path)) context._confirmedActiveMembership = true;
  const response = await fetchRequestHandler({
    endpoint: "/api/v1/member",
    req: checkedRequest,
    router: memberRouter,
    createContext: () => context,
  });
  return noStore(response);
}
