import "server-only";

import { unstable_cache } from "next/cache";
import { CACHE_CONFIG } from "@/config/cache-config";

interface CreateServerCacheOptions {
  key: string;
  revalidateSeconds?: number;
  tags?: string[];
}

export function createServerCache<Args extends unknown[], Result>(
  fn: (...args: Args) => Promise<Result>,
  options: CreateServerCacheOptions,
) {
  const cached = unstable_cache(fn, [options.key], {
    revalidate:
      options.revalidateSeconds ?? CACHE_CONFIG.SERVER.DEFAULT_REVALIDATE_SECONDS,
    tags: options.tags,
  });

  return (...args: Args) => cached(...args);
}
