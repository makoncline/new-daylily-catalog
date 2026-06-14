type AuditValue = boolean | null | number | string | undefined;

interface AuditUser {
  id?: string | null;
  clerkUserId?: string | null;
  clerk?: {
    email?: string | null;
  } | null;
}

interface LogUserMutationInput {
  path: string;
  user: AuditUser;
  rawInput: unknown;
  requestUrl?: string;
  headers?: Headers;
  status: "success" | "error";
  durationMs: number;
  errorCode?: string;
}

interface LogUserAuthInput {
  action: "signup" | "signin";
  appUserId?: string | null;
  clerkUserId?: string | null;
  email?: string | null;
  source: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asAuditValue(value: unknown): AuditValue {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null ||
    typeof value === "undefined"
  ) {
    return value;
  }

  return undefined;
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
    const value = asAuditValue(input[key]);
    if (typeof value !== "undefined") {
      summary[key] = value;
    }
  }

  for (const [key, value] of Object.entries(input)) {
    if (Array.isArray(value)) {
      summary[`${key}Count`] = value.length;
    }
  }

  return summary;
}

function requestIdFromHeaders(headers?: Headers) {
  return (
    headers?.get("x-vercel-id") ??
    headers?.get("x-request-id") ??
    headers?.get("cf-ray") ??
    undefined
  );
}

export function logUserMutation({
  path,
  user,
  rawInput,
  requestUrl,
  headers,
  status,
  durationMs,
  errorCode,
}: LogUserMutationInput) {
  console.info(JSON.stringify({
    event: "user_mutation",
    status,
    path,
    appUserId: user.id ?? undefined,
    clerkUserId: user.clerkUserId ?? undefined,
    email: user.clerk?.email ?? undefined,
    requestId: requestIdFromHeaders(headers),
    requestUrl,
    durationMs,
    errorCode,
    ...pickInputIdentifiers(rawInput),
  }));
}

export function logUserAuth({
  action,
  appUserId,
  clerkUserId,
  email,
  source,
}: LogUserAuthInput) {
  console.info(JSON.stringify({
    event: "user_auth",
    action,
    appUserId,
    clerkUserId,
    email,
    source,
  }));
}
