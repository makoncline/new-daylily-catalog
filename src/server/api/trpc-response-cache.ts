import { PUBLIC_CACHE_CONFIG } from "@/config/public-cache-config";

interface TrpcResponseMetaInfoCall {
  path: string;
}

interface TrpcResponseMetaInfo {
  calls: readonly TrpcResponseMetaInfoCall[];
}

interface TrpcResponseMetaLike {
  type: "query" | "mutation" | "subscription" | "unknown";
  errors: readonly unknown[];
  paths: readonly string[] | undefined;
  info: TrpcResponseMetaInfo | undefined;
}

const TRPC_PUBLIC_CACHEABLE_QUERY_PATHS = {
  GET_PUBLIC_PROFILES: "public.getPublicProfiles",
  GET_PROFILE: "public.getProfile",
  GET_LISTINGS: "public.getListings",
  GET_LISTING: "public.getListing",
  GET_LISTING_BY_ID: "public.getListingById",
  GET_CULTIVAR_PAGE: "public.getCultivarPage",
  GET_CULTIVAR_ROUTE_SEGMENTS: "public.getCultivarRouteSegments",
} as const;

const TRPC_PUBLIC_CACHEABLE_QUERY_PATH_SET = new Set<string>(
  Object.values(TRPC_PUBLIC_CACHEABLE_QUERY_PATHS),
);

const TRPC_PUBLIC_QUERY_CACHE_CONTROL = [
  "public",
  "max-age=0",
  `s-maxage=${PUBLIC_CACHE_CONFIG.REVALIDATE_SECONDS.DATA.PUBLIC_ROUTER_LISTINGS}`,
  `stale-while-revalidate=${PUBLIC_CACHE_CONFIG.REVALIDATE_SECONDS.DATA.PUBLIC_ROUTER_LISTINGS}`,
].join(", ");

function getRequestedPaths(meta: TrpcResponseMetaLike) {
  const infoPaths = meta.info?.calls.map((call) => call.path);

  if (infoPaths && infoPaths.length > 0) {
    return infoPaths;
  }

  return meta.paths ?? [];
}

export function shouldCachePublicTrpcResponse(meta: TrpcResponseMetaLike) {
  if (meta.type !== "query") {
    return false;
  }

  if (meta.errors.length > 0) {
    return false;
  }

  const paths = getRequestedPaths(meta);
  const [path] = paths;

  return (
    paths.length === 1 &&
    typeof path === "string" &&
    TRPC_PUBLIC_CACHEABLE_QUERY_PATH_SET.has(path)
  );
}

export function getTrpcResponseCacheHeaders(meta: TrpcResponseMetaLike) {
  if (!shouldCachePublicTrpcResponse(meta)) {
    return undefined;
  }

  const headers = new Headers();
  headers.set("Cache-Control", TRPC_PUBLIC_QUERY_CACHE_CONTROL);
  return headers;
}

export const TRPC_RESPONSE_CACHE = {
  PUBLIC_CACHEABLE_QUERY_PATHS: TRPC_PUBLIC_CACHEABLE_QUERY_PATHS,
  PUBLIC_QUERY_CACHE_CONTROL: TRPC_PUBLIC_QUERY_CACHE_CONTROL,
} as const;
