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

/**
 * This wraps the `createTRPCContext` helper and provides the required context for the tRPC API when
 * handling a HTTP request (e.g. when you make requests from Client Components).
 */
const createContext = async (req: NextRequest) => {
  const clerkUserId = await resolveAuthenticatedClerkUserId();

  return createTRPCContext({
    headers: req.headers,
    requestUrl: req.url,
    clerkUserId,
  });
};

const handler = async (req: NextRequest) => {
  return withRequestLogging(req, async () => {
    try {
      const context = await createContext(req);
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
