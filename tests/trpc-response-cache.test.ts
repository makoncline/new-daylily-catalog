import { describe, expect, it } from "vitest";
import {
  getTrpcResponseCacheHeaders,
  shouldCachePublicTrpcResponse,
  TRPC_RESPONSE_CACHE,
} from "@/server/api/trpc-response-cache";

describe("tRPC response cache headers", () => {
  const cacheableQueryPaths = Object.values(
    TRPC_RESPONSE_CACHE.PUBLIC_CACHEABLE_QUERY_PATHS,
  );

  it.each(cacheableQueryPaths)(
    "marks successful %s query responses as cacheable",
    (path) => {
      const meta = {
        type: "query",
        errors: [],
        paths: undefined,
        info: {
          calls: [{ path }],
        },
      } as const;

      expect(shouldCachePublicTrpcResponse(meta)).toBe(true);

      const headers = getTrpcResponseCacheHeaders(meta);
      expect(headers?.get("Cache-Control")).toBe(
        TRPC_RESPONSE_CACHE.PUBLIC_QUERY_CACHE_CONTROL,
      );
    },
  );

  it("does not cache mutations, including public.sendMessage", () => {
    const meta = {
      type: "mutation",
      errors: [],
      paths: undefined,
      info: {
        calls: [{ path: "public.sendMessage" }],
      },
    } as const;

    expect(shouldCachePublicTrpcResponse(meta)).toBe(false);
    expect(getTrpcResponseCacheHeaders(meta)).toBeUndefined();
  });

  it("does not cache responses with errors", () => {
    const meta = {
      type: "query",
      errors: [new Error("boom")],
      paths: undefined,
      info: {
        calls: [
          { path: TRPC_RESPONSE_CACHE.PUBLIC_CACHEABLE_QUERY_PATHS.GET_LISTINGS },
        ],
      },
    } as const;

    expect(shouldCachePublicTrpcResponse(meta)).toBe(false);
    expect(getTrpcResponseCacheHeaders(meta)).toBeUndefined();
  });

  it("does not cache non-whitelisted public routes", () => {
    const meta = {
      type: "query",
      errors: [],
      paths: undefined,
      info: {
        calls: [{ path: "public.unknownQuery" }],
      },
    } as const;

    expect(shouldCachePublicTrpcResponse(meta)).toBe(false);
    expect(getTrpcResponseCacheHeaders(meta)).toBeUndefined();
  });

  it("does not cache multi-path query batches", () => {
    const meta = {
      type: "query",
      errors: [],
      paths: undefined,
      info: {
        calls: [
          { path: TRPC_RESPONSE_CACHE.PUBLIC_CACHEABLE_QUERY_PATHS.GET_PROFILE },
          { path: TRPC_RESPONSE_CACHE.PUBLIC_CACHEABLE_QUERY_PATHS.GET_LISTINGS },
        ],
      },
    } as const;

    expect(shouldCachePublicTrpcResponse(meta)).toBe(false);
    expect(getTrpcResponseCacheHeaders(meta)).toBeUndefined();
  });
});
