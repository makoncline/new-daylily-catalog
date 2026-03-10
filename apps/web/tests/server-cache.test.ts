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
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VITEST", undefined);
    vi.stubEnv("PLAYWRIGHT_LOCAL_E2E", undefined);
    vi.stubEnv("LOCAL_QUERY_PROFILER", undefined);

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
      vi.unstubAllEnvs();
    }
  });
});
