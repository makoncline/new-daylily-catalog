import { AsyncLocalStorage } from "node:async_hooks";
import { isIP } from "node:net";
import { getLogContext, logEvent } from "@/lib/telemetry";
import { captureServerPosthogEvent } from "@/server/analytics/posthog-server";
import {
  updateLogContext,
  requestLogContext,
  withLogContext,
  withRequestLogging,
} from "@/server/observability/log-context";

const privateUsage = new AsyncLocalStorage<Record<string, unknown>>();

export function usageScalar(value: unknown) {
  if (typeof value === "string")
    return value
      .replace(/[\u0000-\u001f\u007f]/g, " ")
      .trim()
      .slice(0, 200);
  if (typeof value === "boolean" || value === null) return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value instanceof Date) return value.toISOString();
  return undefined;
}

export function usageInputSummary(input: unknown, read: boolean) {
  if (!input || typeof input !== "object") return {};
  const fields = read
    ? [
        "q",
        "query",
        "title",
        "description",
        "cultivarName",
        "color",
        "hybridizer",
        "parentage",
        "normalizedName",
        "status",
        "hasPhoto",
        "hasPrice",
        "linkedToCultivar",
        "priceMin",
        "priceMax",
        "listId",
        "cultivarReferenceId",
        "cursor",
        "limit",
        "offset",
        "id",
        "type",
        "referenceId",
      ]
    : ["requestId", "expectedUpdatedAt"];
  return Object.fromEntries(
    fields.flatMap((key) => {
      const value = usageScalar(Reflect.get(input, key));
      return value === undefined ? [] : [[`request_${key}`, value]];
    }),
  );
}

export function usageResultSummary(result: unknown) {
  if (Array.isArray(result)) return { results_returned: result.length };
  if (!result || typeof result !== "object") return {};
  const error: unknown = Reflect.get(result, "error");
  if (error && typeof error === "object") {
    const code: unknown = Reflect.get(error, "code");
    return typeof code === "string" || typeof code === "number"
      ? { error_code: typeof code === "string" ? code.slice(0, 80) : code }
      : {};
  }
  for (const key of ["items", "results", "images"]) {
    const items: unknown = Reflect.get(result, key);
    if (Array.isArray(items))
      return {
        results_returned: items.length,
        has_more: Boolean(Reflect.get(result, "nextCursor")),
      };
  }
  for (const key of ["listing", "list", "profile", "cultivar", "image", "id"]) {
    if (Reflect.get(result, key)) return { results_returned: 1 };
  }
  return {};
}

export function recordUsageInput(input: unknown) {
  const details = privateUsage.getStore();
  if (details) Object.assign(details, usageInputSummary(input, true));
}

export function recordCultivarSearchUsage(
  properties: Record<string, boolean | number | string | undefined>,
) {
  const details = privateUsage.getStore();
  if (details)
    Object.assign(
      details,
      Object.fromEntries(
        Object.entries(properties).map(([key, value]) => [
          `request_${key}`,
          usageScalar(value),
        ]),
      ),
    );
}

let droppedLogRecords = 0;
function usageLog(event: string, attributes: Record<string, unknown>) {
  try {
    logEvent("info", event, {
      ...privateUsage.getStore(),
      ...attributes,
      prior_log_drops: droppedLogRecords,
    });
    droppedLogRecords = 0;
  } catch {
    droppedLogRecords++;
  }
}

let pendingCaptures = 0;

interface UsageOperation {
  operation: string;
  operation_kind: string;
  outcome: string;
  duration_ms: number;
  error_code?: string | number;
  results_returned?: number;
}

export function logUsageOperation(attributes: UsageOperation) {
  const context = getLogContext();
  const transport = context.usage_transport;
  if (
    transport !== "mcp" &&
    transport !== "member_api" &&
    transport !== "public_api"
  )
    return;
  const eventId = crypto.randomUUID();
  try {
    usageLog("api_usage_operation", {
      ...attributes,
      event_id: eventId,
      duration_ms: Math.round(Number(attributes.duration_ms) * 10) / 10,
    });
    if (pendingCaptures >= 16) {
      logEvent("warn", "api_usage_capture_dropped", {
        event_id: eventId,
        reason: "in_flight_limit",
      });
      return;
    }
    pendingCaptures++;
    void captureServerPosthogEvent({
      distinctId:
        typeof context.clerk_user_id === "string"
          ? context.clerk_user_id
          : `anonymous:${typeof context.usage_request_id === "string" ? context.usage_request_id : eventId}`,
      event: "api_usage_operation",
      properties: {
        event_id: eventId,
        correlation_id: context.correlation_id,
        usage_request_id:
          typeof context.usage_request_id === "string"
            ? context.usage_request_id
            : null,
        usage_operation_id:
          typeof context.usage_operation_id === "string"
            ? context.usage_operation_id
            : null,
        app_user_id:
          typeof context.app_user_id === "string" ? context.app_user_id : null,
        release: typeof context.release === "string" ? context.release : null,
        transport,
        identity_source: String(context.identity_source),
        oauth_client_id:
          typeof context.oauth_client_id === "string"
            ? context.oauth_client_id
            : null,
        operation: String(attributes.operation),
        operation_kind: String(attributes.operation_kind),
        outcome: String(attributes.outcome),
        results_returned:
          typeof attributes.results_returned === "number"
            ? attributes.results_returned
            : null,
        duration_ms: Math.round(Number(attributes.duration_ms) * 10) / 10,
        $ip: null,
        $geoip_disable: true,
        $process_person_profile: false,
      },
    })
      .catch(() => {
        try {
          logEvent("warn", "api_usage_capture_dropped", {
            event_id: eventId,
            reason: "capture_exception",
          });
        } catch {
          /* Log sink unavailable. */
        }
      })
      .finally(() => {
        pendingCaptures--;
      });
  } catch {
    // Usage delivery must not change the product result.
  }
}

export function withUsageRequest(
  request: Request,
  transport: "mcp" | "member_api" | "public_api",
  callback: () => Promise<Response>,
) {
  const proxyIp =
    process.env.DAYLILY_TRUST_PROXY_IP === "true"
      ? request.headers.get("x-daylily-connecting-ip")
      : null;
  const connectingIp = proxyIp && isIP(proxyIp) ? proxyIp : undefined;
  const run = async () => {
    updateLogContext({
      usage_transport: transport,
      usage_request_id: crypto.randomUUID(),
      ...(transport === "public_api"
        ? { usage_operation_id: crypto.randomUUID() }
        : {}),
      identity_source: request.headers.has("authorization")
        ? "unresolved"
        : "anonymous",
    });
    return privateUsage.run(
      {
        connecting_ip: connectingIp,
        connecting_ip_source: connectingIp
          ? "caddy_cloudflare_header"
          : "unverified_proxy",
        declared_user_agent: usageScalar(request.headers.get("user-agent")),
        declared_client: usageScalar(request.headers.get("x-client-name")),
        traffic_class: "unclassified",
      },
      async () => {
        const startedAt = performance.now();
        if (transport === "public_api") await attributePublicUsage(request);
        try {
          const response = await callback();
          usageLog("api_usage_request", {
            event_id: crypto.randomUUID(),
            http_status: response.status,
            outcome: response.status >= 400 ? "http_error" : "response_created",
            response_bytes: response.headers.has("content-length")
              ? Number(response.headers.get("content-length"))
              : undefined,
            duration_ms: Math.round(performance.now() - startedAt),
          });
          return response;
        } catch (error) {
          usageLog("api_usage_request", {
            event_id: crypto.randomUUID(),
            outcome: "exception",
            duration_ms: Math.round(performance.now() - startedAt),
          });
          throw error;
        }
      },
    );
  };
  return transport === "public_api"
    ? withLogContext(requestLogContext(request), run)
    : withRequestLogging(request, run);
}

let pendingAttributions = 0;
export async function attributePublicUsage(request: Request) {
  if (!/^Bearer\s+\S+$/i.test(request.headers.get("authorization") ?? ""))
    return;
  if (pendingAttributions >= 16) {
    updateLogContext({ identity_note: "attribution_in_flight_limit" });
    return;
  }
  pendingAttributions++;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const identity = await Promise.race([
      withLogContext({ ...getLogContext() }, async () => {
        const { getScopedOAuthClient } = await import(
          "@/server/api/member-oauth"
        );
        const client = await getScopedOAuthClient(request, "catalog:read");
        if (client.status === "unauthenticated")
          return { identity_source: "unauthenticated" };
        const { db } = await import("@/server/db");
        const user = await db.user.findUnique({
          where: { clerkUserId: client.clerkUserId },
          select: { id: true },
        });
        return {
          identity_source: "clerk_oauth",
          clerk_user_id: client.clerkUserId,
          oauth_client_id: client.clientId,
          app_user_id: user?.id,
        };
      }).finally(() => {
        pendingAttributions--;
      }),
      new Promise<undefined>((resolve) => {
        timer = setTimeout(() => resolve(undefined), 250);
      }),
    ]);
    updateLogContext(identity ?? { identity_note: "attribution_timeout" });
  } catch {
    updateLogContext({ identity_note: "attribution_unavailable" });
  } finally {
    clearTimeout(timer);
  }
}
