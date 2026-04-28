"use client";

import {
  httpLink,
  loggerLink,
  splitLink,
  unstable_httpBatchStreamLink,
} from "@trpc/client";
import SuperJSON from "superjson";
import { getBaseUrl } from "@/lib/utils/getBaseUrl";

const UNBATCHED_DASHBOARD_PATHS = new Set([
  "dashboardDb.bootstrap.roots",
  "dashboardDb.listing.sync",
  "dashboardDb.list.sync",
  "dashboardDb.image.sync",
  "dashboardDb.image.listByListingIds",
  "dashboardDb.cultivarReference.sync",
  "dashboardDb.cultivarReference.getByIdsBatch",
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
      enabled: (op) =>
        process.env.NODE_ENV === "development" ||
        (op.direction === "down" && op.result instanceof Error),
    }),
    splitLink({
      condition: shouldUnbatchDashboardOperation,
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
