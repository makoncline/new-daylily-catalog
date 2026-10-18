import {
  logUsageOperation,
  usageResultSummary,
} from "@/server/observability/api-usage";
import { TRPCError } from "@trpc/server";
import { reportError } from "@/lib/error-utils";
import { hasPublicReadDb } from "@/server/db";

const responseHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "no-store",
};

export function publicJson(body: unknown, status = 200) {
  return Response.json(body, { status, headers: responseHeaders });
}

export async function publicReadResponse(
  source: string,
  read: () => Promise<unknown>,
) {
  if (!hasPublicReadDb) {
    return publicJson({ error: "public_database_unavailable" }, 503);
  }

  const startedAt = performance.now();
  try {
    const result = await read();
    logUsageOperation({
      operation: source,
      operation_kind: "read",
      outcome: "success",
      duration_ms: performance.now() - startedAt,
      ...usageResultSummary(result),
    });
    return publicJson(result);
  } catch (error) {
    logUsageOperation({
      operation: source,
      operation_kind: "read",
      outcome: "error",
      duration_ms: performance.now() - startedAt,
      error_code: error instanceof TRPCError ? error.code : "INTERNAL_ERROR",
    });
    if (error instanceof TRPCError && error.code === "NOT_FOUND") {
      return publicJson({ error: "not_found" }, 404);
    }
    reportError({ error, context: { source } });
    return publicJson({ error: "internal_server_error" }, 500);
  }
}
