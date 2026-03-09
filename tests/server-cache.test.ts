// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { CACHE_CONFIG } from "@/config/cache-config";
import { createServerCache } from "@/lib/cache/server-cache";

const unstableCacheMock = vi.hoisted(() => vi.fn());

vi.mock("next/cache", () => ({
  unstable_cache: unstableCacheMock,
}));

describe("createServerCache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    unstableCacheMock.mockImplementation(
      <Args extends unknown[], Result>(
        fn: (...args: Args) => Promise<Result>,
      ) => vi.fn(async (...args: Args) => fn(...args)),
    );
  });

  it("passes invalidation-only revalidation through to unstable_cache", async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    const originalVitest = process.env.VITEST;
    const originalPlaywrightLocalE2E = process.env.PLAYWRIGHT_LOCAL_E2E;
    const originalLocalQueryProfiler = process.env.LOCAL_QUERY_PROFILER;

    process.env.NODE_ENV = "production";
    delete process.env.VITEST;
    delete process.env.PLAYWRIGHT_LOCAL_E2E;
    delete process.env.LOCAL_QUERY_PROFILER;

    const getValue = vi.fn(async (slug: string) => slug);

    try {
      const cached = createServerCache(getValue, {
        key: "public:cultivar-page",
        revalidateSeconds: false,
        tags: [CACHE_CONFIG.TAGS.PUBLIC_CULTIVAR_PAGE],
      });

      await cached("happy-returns");

      expect(unstableCacheMock).toHaveBeenCalledWith(
        getValue,
        ["public:cultivar-page"],
        {
          revalidate: false,
          tags: [CACHE_CONFIG.TAGS.PUBLIC_CULTIVAR_PAGE],
        },
      );
      expect(getValue).toHaveBeenCalledWith("happy-returns");
    } finally {
      process.env.NODE_ENV = originalNodeEnv;

      if (originalVitest === undefined) {
        delete process.env.VITEST;
      } else {
        process.env.VITEST = originalVitest;
      }

      if (originalPlaywrightLocalE2E === undefined) {
        delete process.env.PLAYWRIGHT_LOCAL_E2E;
      } else {
        process.env.PLAYWRIGHT_LOCAL_E2E = originalPlaywrightLocalE2E;
      }

      if (originalLocalQueryProfiler === undefined) {
        delete process.env.LOCAL_QUERY_PROFILER;
      } else {
        process.env.LOCAL_QUERY_PROFILER = originalLocalQueryProfiler;
      }
    }
  });
});
