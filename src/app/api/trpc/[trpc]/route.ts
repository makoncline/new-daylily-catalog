import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { type NextRequest } from "next/server";

import { env } from "@/env";
import { appRouter } from "@/server/api/root";
import { createTRPCContext } from "@/server/api/trpc";
import { APP_CONFIG } from "@/config/constants";

/**
 * This wraps the `createTRPCContext` helper and provides the required context for the tRPC API when
 * handling a HTTP request (e.g. when you make requests from Client Components).
 */
const createContext = async (req: NextRequest) => {
  return createTRPCContext({
    headers: req.headers,
  });
};

const handler = (req: NextRequest) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createContext(req),
    onError:
      env.NODE_ENV === "development"
        ? ({ path, error }) => {
            console.error(
              `❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`,
            );
          }
        : undefined,
    responseMeta(opts) {
      const { paths, type } = opts;

      // Don't cache if no paths
      if (!paths?.length) return {};

      // Don't cache specific routes
      const isPrivateRoute = paths.some(
        (path) =>
          path.includes("dashboard") ||
          path.includes("api") ||
          path.includes("subscribe"),
      );

      // Only cache queries that aren't private routes
      const isQuery = type === "query";

      if (!isPrivateRoute && isQuery) {
        // Cache for 1 hour
        const ONE_HOUR = APP_CONFIG.CACHE.PUBLIC_ROUTER.TTL_S;
        return {
          headers: {
            "cache-control": `s-maxage=${ONE_HOUR}, stale-while-revalidate`,
          },
        };
      }
      return {};
    },
  });

export { handler as GET, handler as POST };
