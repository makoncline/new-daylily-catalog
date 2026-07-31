import { randomUUID } from "node:crypto";
import { getCultivarSearchTelemetryProperties } from "@/lib/analytics/cultivar-search-telemetry";

type SearchRequestStatus = "error" | "index_unavailable" | "success";

function roundDurationMs(durationMs: number) {
  return Math.round(durationMs * 10) / 10;
}

export function getRequestId(headers: Headers) {
  return headers.get("cf-ray") ?? headers.get("x-request-id") ?? randomUUID();
}

export function getTelemetryHeaders(requestId: string, durationMs: number) {
  return {
    "X-Cultivar-Search-Duration-Ms": String(roundDurationMs(durationMs)),
    "X-Cultivar-Search-Request-Id": requestId,
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
  const payload = JSON.stringify({
    component: "public-cultivar-search",
    event: "public_cultivar_search_request",
    timestamp: new Date().toISOString(),
    request_id: requestId,
    status,
    http_status: httpStatus,
    duration_ms: roundDurationMs(durationMs),
    mode,
    source_surface: mode === "summary" ? "public_page" : "public_api",
    results_returned: resultsReturned,
    has_more: hasMore,
    error_name: errorName,
    ...getCultivarSearchTelemetryProperties(searchParams),
  });

  if (status === "success") {
    console.info(payload);
  } else if (status === "index_unavailable") {
    console.warn(payload);
  } else {
    console.error(payload);
  }
}
