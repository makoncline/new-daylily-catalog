"use client";

import { httpBatchStreamLink, loggerLink } from "@trpc/client";
import SuperJSON from "superjson";
import { getBaseUrl } from "@/lib/utils/getBaseUrl";

export function createClientLinks() {
  return [
    loggerLink({
      enabled: (op) =>
        process.env.NODE_ENV === "development" ||
        (op.direction === "down" && op.result instanceof Error),
    }),
    httpBatchStreamLink({
      transformer: SuperJSON,
      url: getBaseUrl() + "/api/trpc",
      headers: () => {
        const headers = new Headers();
        headers.set("x-trpc-source", "nextjs-react");
        return headers;
      },
    }),
  ];
}
