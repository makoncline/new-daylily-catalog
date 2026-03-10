"use client";

import { loggerLink, unstable_httpBatchStreamLink } from "@trpc/client";
import SuperJSON from "superjson";
import { getBaseUrl } from "@/lib/utils/getBaseUrl";

export function createClientLinks() {
  return [
    loggerLink({
      enabled: (op) =>
        process.env.NODE_ENV === "development" ||
        (op.direction === "down" && op.result instanceof Error),
    }),
    unstable_httpBatchStreamLink({
      transformer: SuperJSON,
      url: getBaseUrl() + "/api/trpc",
      maxItems: 10,
      maxURLLength: 2000,
      headers: () => {
        const headers = new Headers();
        headers.set("x-trpc-source", "nextjs-react");
        return headers;
      },
    }),
  ];
}

