import { unstable_cache } from "next/cache";

interface UnstableCacheOptions {
  revalidate?: number | false;
  tags?: string[];
}

type CacheableFn<Args extends unknown[], Result> = (
  ...args: Args
) => Promise<Result>;

export function unstableCacheUnlessE2E<Args extends unknown[], Result>(
  fetchData: CacheableFn<Args, Result>,
  keyParts?: string[],
  options?: UnstableCacheOptions,
): CacheableFn<Args, Result> {
  if (process.env.PLAYWRIGHT_LOCAL_E2E === "true") {
    return fetchData;
  }

  return unstable_cache(fetchData, keyParts, options);
}
