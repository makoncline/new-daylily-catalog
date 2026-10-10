"use client";

import {
  httpLink,
  loggerLink,
  splitLink,
  unstable_httpBatchStreamLink,
} from "@trpc/client";
import SuperJSON from "superjson";
import { correlatedFetch } from "./correlated-fetch";
import {
  getErrorContext,
  getLogContext,
  logEvent,
  setErrorContext,
} from "@/lib/telemetry";
import { getBaseUrl } from "@/lib/utils/getBaseUrl";

const UNBATCHED_DASHBOARD_PATHS = new Set([
  "dashboardDb.bootstrap.roots",
  "dashboardDb.bootstrap.replicaRoots",
  "dashboardDb.listing.sync",
  "dashboardDb.list.sync",
  "dashboardDb.image.sync",
  "dashboardDb.image.listByListingIds",
  "dashboardDb.image.listByListingIdsReplica",
  "dashboardDb.cultivarReference.sync",
  "dashboardDb.cultivarReference.getByIdsBatch",
  "dashboardDb.cultivarReference.getByIdsBatchReplica",
]);

export function shouldUnbatchDashboardOperation(op: {
  type: string;
  path: string;
}) {
  return UNBATCHED_DASHBOARD_PATHS.has(op.path);
}

export function createClientLinks() {
  const url = getBaseUrl() + "/api/trpc";
  const headers = () => {
    const nextHeaders = new Headers();
    nextHeaders.set("x-trpc-source", "nextjs-react");
    return nextHeaders;
  };

  return [
    loggerLink({
      logger: (options) => {
        if (options.direction !== "down") return;
        const error =
          options.result instanceof Error ? options.result : undefined;
        const context =
          getErrorContext(
            options.result instanceof Error
              ? options.result
              : options.result.context?.response,
          ) ?? getLogContext();
        if (error)
          setErrorContext(error, {
            ...context,
            procedure: options.path,
            operation_type: options.type,
          });
        logEvent(
          error ? "error" : "debug",
          error ? "trpc_client_failed" : "trpc_client_completed",
          {
            ...context,
            procedure: options.path,
            operation_type: options.type,
            duration_ms: options.elapsedMs,
            error,
          },
        );
      },
      enabled: (op) =>
        process.env.NODE_ENV === "development" ||
        (op.direction === "down" && op.result instanceof Error),
    }),
    splitLink({
      condition: shouldUnbatchDashboardOperation,
      true: httpLink({
        fetch: correlatedFetch,
        transformer: SuperJSON,
        url,
        headers,
      }),
      false: unstable_httpBatchStreamLink({
        fetch: correlatedFetch,
        transformer: SuperJSON,
        url,
        headers,
        maxItems: 10,
        maxURLLength: 2000,
      }),
    }),
  ];
}
