import {
  getErrorContext,
  getLogContext,
  logEvent,
  setErrorContext,
} from "@/lib/telemetry";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { type NextRequest } from "next/server";

import { withRequestLogging } from "@/server/observability/log-context";
import { reportError } from "@/lib/error-utils";
import { appRouter } from "@/server/api/root";
import {
  createTRPCContext,
  resolveAuthenticatedClerkUserId,
} from "@/server/api/trpc";

const handler = async (req: NextRequest) => {
  return withRequestLogging(req, async (logContext) => {
    try {
      const clerkUserId = await resolveAuthenticatedClerkUserId();
      logContext.clerk_user_id = clerkUserId;
      const context = await createTRPCContext({
        headers: req.headers,
        requestUrl: req.url,
        clerkUserId,
      });
      return await fetchRequestHandler({
        endpoint: "/api/trpc",
        req,
        router: appRouter,
        createContext: () => context,
        onError({ path, error }) {
          // Middleware records procedure failures. Also record adapter failures.
          if (getErrorContext(error)) return;
          setErrorContext(error, getLogContext());
          const attributes = {
            source: "trpc-request",
            procedure: path,
            error_code: error.code,
          };
          if (error.code === "INTERNAL_SERVER_ERROR") {
            reportError({ error, context: attributes });
          } else {
            logEvent("warn", "trpc_request_rejected", { ...attributes, error });
          }
        },
      });
    } catch (error) {
      reportError({ error, context: { source: "trpc-request-context" } });
      throw error;
    }
  });
};

export { handler as GET, handler as POST };
