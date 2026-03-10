import { CACHE_CONFIG } from "@/config/cache-config";

export const PUBLIC_CLIENT_QUERY_CACHE = {
  staleTime: CACHE_CONFIG.PUBLIC.CLIENT_QUERY.STALE_TIME_MS,
  gcTime: CACHE_CONFIG.PUBLIC.CLIENT_QUERY.GC_TIME_MS,
  refetchOnMount: CACHE_CONFIG.PUBLIC.CLIENT_QUERY.REFETCH_ON_MOUNT,
  refetchOnWindowFocus:
    CACHE_CONFIG.PUBLIC.CLIENT_QUERY.REFETCH_ON_WINDOW_FOCUS,
  refetchOnReconnect: CACHE_CONFIG.PUBLIC.CLIENT_QUERY.REFETCH_ON_RECONNECT,
} as const;

export function withPublicClientQueryCache<TOptions extends object>(
  options: TOptions,
) {
  return {
    ...PUBLIC_CLIENT_QUERY_CACHE,
    ...options,
  };
}
