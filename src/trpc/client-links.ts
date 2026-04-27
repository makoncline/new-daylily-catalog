"use client";

import {
  httpLink,
  loggerLink,
  splitLink,
  unstable_httpBatchStreamLink,
} from "@trpc/client";
import SuperJSON from "superjson";
import { getBaseUrl } from "@/lib/utils/getBaseUrl";

const UNBATCHED_DASHBOARD_QUERY_PATHS = new Set([
  "dashboardDb.bootstrap.snapshot",
  "dashboardDb.listing.sync",
  "dashboardDb.list.sync",
  "dashboardDb.image.sync",
  "dashboardDb.cultivarReference.sync",
]);

export function createClientLinks() {
  const url = getBaseUrl() + "/api/trpc";
  const headers = () => {
    const nextHeaders = new Headers();
    nextHeaders.set("x-trpc-source", "nextjs-react");
    return nextHeaders;
  };

  return [
    loggerLink({
      enabled: (op) =>
        process.env.NODE_ENV === "development" ||
        (op.direction === "down" && op.result instanceof Error),
    }),
    splitLink({
      condition: (op) =>
        op.type === "query" && UNBATCHED_DASHBOARD_QUERY_PATHS.has(op.path),
      true: httpLink({
        transformer: SuperJSON,
        url,
        headers,
      }),
      false: unstable_httpBatchStreamLink({
        transformer: SuperJSON,
        url,
        headers,
        maxItems: 10,
        maxURLLength: 2000,
      }),
    }),
  ];
}
