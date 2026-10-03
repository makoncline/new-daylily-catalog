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

  try {
    return publicJson(await read());
  } catch (error) {
    if (error instanceof TRPCError && error.code === "NOT_FOUND") {
      return publicJson({ error: "not_found" }, 404);
    }
    reportError({ error, context: { source } });
    return publicJson({ error: "internal_server_error" }, 500);
  }
}
