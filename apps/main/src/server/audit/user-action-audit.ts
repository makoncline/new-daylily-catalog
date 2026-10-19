import { usageScalar } from "@/server/observability/api-usage";
import { logEvent, safeUrl } from "@/lib/telemetry";

type AuditValue = boolean | null | number | string | undefined;

interface AuditUser {
  id?: string | null;
  clerkUserId?: string | null;
}

interface LogUserMutationInput {
  path: string;
  user: AuditUser;
  rawInput: unknown;
  persistedResult?: unknown;
  requestUrl?: string;
  oauthClientId?: string;
  oauthScope?: string;
  mcpToolName?: string;
  status: "success" | "error";
  durationMs: number;
  errorCode?: string;
}

interface LogUserAuthInput {
  action: "signup" | "signin";
  appUserId?: string | null;
  clerkUserId?: string | null;
  source: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pickInputIdentifiers(input: unknown): Record<string, AuditValue> {
  if (!isRecord(input)) {
    return {};
  }

  const summary: Record<string, AuditValue> = {};
  const idKeys = [
    "id",
    "listingId",
    "listId",
    "imageId",
    "referenceId",
    "userProfileId",
    "cultivarReferenceId",
  ];

  for (const key of idKeys) {
    const value = usageScalar(input[key]);
    if (typeof value !== "undefined") {
      summary[key] = value;
    }
  }

  for (const key of ["ids", "listingIds", "imageIds", "images", "rows"]) {
    const value = input[key];
    if (Array.isArray(value)) {
      summary[`${key}Count`] = value.length;
    }
  }

  return summary;
}

export function logUserMutation({
  path,
  user,
  rawInput,
  persistedResult,
  requestUrl,
  oauthClientId,
  oauthScope,
  mcpToolName,
  status,
  durationMs,
  errorCode,
}: LogUserMutationInput) {
  logEvent("info", "user_mutation", {
    event_id: crypto.randomUUID(),
    status,
    procedure: path,
    appUserId: user.id ?? undefined,
    clerkUserId: user.clerkUserId ?? undefined,
    requestUrl: requestUrl ? safeUrl(requestUrl) : undefined,
    oauthClientId,
    oauthScope,
    mcpToolName,
    clientRequestId:
      isRecord(rawInput) && typeof rawInput.requestId === "string"
        ? rawInput.requestId.slice(0, 200)
        : undefined,
    duration_ms: durationMs,
    error_code: errorCode,
    ...pickInputIdentifiers(rawInput),
    ...(status === "success" && isRecord(persistedResult)
      ? {
          saved: Object.fromEntries(
            [
              "id",
              "title",
              "price",
              "status",
              "cultivarReferenceId",
              "updatedAt",
              "listId",
              "listingId",
              "count",
            ].flatMap((key) => {
              const value = usageScalar(persistedResult[key]);
              return value === undefined ? [] : [[key, value]];
            }),
          ),
          saved_evidence: "persisted_result",
        }
      : {}),
  });
}

export function logUserAuth({
  action,
  appUserId,
  clerkUserId,
  source,
}: LogUserAuthInput) {
  logEvent("info", "user_auth", {
    action,
    appUserId,
    clerkUserId,
    source,
  });
}
