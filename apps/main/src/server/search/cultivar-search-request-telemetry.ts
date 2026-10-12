import { logEvent } from "@/lib/telemetry";
import { getCultivarSearchTelemetryProperties } from "@/lib/analytics/cultivar-search-telemetry";

type SearchRequestStatus = "error" | "index_unavailable" | "success";

function roundDurationMs(durationMs: number) {
  return Math.round(durationMs * 10) / 10;
}

export function getTelemetryHeaders(requestId: string, durationMs: number) {
  return {
    "X-Cultivar-Search-Duration-Ms": String(roundDurationMs(durationMs)),
    "X-Correlation-Id": requestId,
  };
}

export function logSearchRequest({
  durationMs,
  errorName,
  hasMore,
  httpStatus,
  mode,
  requestId,
  resultsReturned,
  searchParams,
  status,
}: {
  durationMs: number;
  errorName?: string;
  hasMore?: boolean;
  httpStatus: number;
  mode: "full" | "summary";
  requestId: string;
  resultsReturned?: number;
  searchParams: URLSearchParams;
  status: SearchRequestStatus;
}) {
  logEvent(
    status === "success"
      ? "info"
      : status === "index_unavailable"
        ? "warn"
        : "error",
    "public_cultivar_search_request",
    {
      component: "public-cultivar-search",
      correlation_id: requestId,
      status,
      http_status: httpStatus,
      duration_ms: roundDurationMs(durationMs),
      mode,
      source_surface: mode === "summary" ? "public_page" : "public_api",
      results_returned: resultsReturned,
      has_more: hasMore,
      error_name: errorName,
      ...getCultivarSearchTelemetryProperties(searchParams),
    },
  );
}
