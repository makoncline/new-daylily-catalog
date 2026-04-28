import { unstable_cache } from "next/cache";
import { CACHE_CONFIG } from "@/config/cache-config";

interface CreateServerCacheOptions {
  key: string;
  revalidateSeconds?: number | false;
  tags?: string[];
}

interface CreateKeyedServerCacheOptions<Args extends unknown[]> {
  getKeyParts: (...args: Args) => string[];
  getTags?: (...args: Args) => string[] | undefined;
  revalidateSeconds?: number | false;
}

export function createServerCache<Args extends unknown[], Result>(
  fn: (...args: Args) => Promise<Result>,
  options: CreateServerCacheOptions,
) {
  if (shouldBypassServerCache()) {
    return (...args: Args) => fn(...args);
  }

  const cached = unstable_cache(fn, [options.key], {
    revalidate:
      options.revalidateSeconds ??
      CACHE_CONFIG.SERVER.DEFAULT_REVALIDATE_SECONDS,
    tags: options.tags,
  });

  return (...args: Args) => cached(...args);
}

export function createKeyedServerCache<Args extends unknown[], Result>(
  fn: (...args: Args) => Promise<Result>,
  options: CreateKeyedServerCacheOptions<Args>,
) {
  return async (...args: Args) => {
    if (shouldBypassServerCache()) {
      return fn(...args);
    }

    const cached = unstable_cache(
      async () => fn(...args),
      options.getKeyParts(...args),
      {
        revalidate:
          options.revalidateSeconds ??
          CACHE_CONFIG.SERVER.DEFAULT_REVALIDATE_SECONDS,
        tags: options.getTags?.(...args),
      },
    );

    return cached();
  };
}

export function shouldBypassServerCache() {
  return (
    process.env.NODE_ENV === "test" ||
    process.env.VITEST === "true" ||
    process.env.PLAYWRIGHT_LOCAL_E2E === "true" ||
    process.env.LOCAL_QUERY_PROFILER === "1"
  );
}
