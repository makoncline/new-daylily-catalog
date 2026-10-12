import {
  getLogContext,
  setErrorContext,
  validCorrelationId,
} from "@/lib/telemetry";

export const correlatedFetch: typeof fetch = async (input, init) => {
  const activeContext = getLogContext();
  const correlationId =
    activeContext.correlation_scope === "trace"
      ? activeContext.correlation_id
      : crypto.randomUUID();
  const headers = new Headers(
    input instanceof Request ? input.headers : undefined,
  );
  new Headers(init?.headers).forEach((value, key) => headers.set(key, value));
  headers.set("x-correlation-id", correlationId);
  const url = new URL(
    input instanceof Request ? input.url : String(input),
    globalThis.location?.origin ?? "http://localhost",
  );
  const context = {
    correlation_id: correlationId,
    correlation_scope: "request" as const,
    pathname: url.pathname,
    method: init?.method ?? (input instanceof Request ? input.method : "GET"),
  };
  let response: Response;
  try {
    response = await fetch(input, { ...init, headers });
  } catch (error) {
    setErrorContext(error, { ...context, failure_kind: "network" });
    throw error;
  }
  const contentType = response.headers.get("content-type") ?? "";
  const responseContext = {
    ...context,
    correlation_id:
      validCorrelationId(response.headers.get("x-correlation-id")) ??
      correlationId,
    http_status: response.status,
    content_type: contentType,
    cf_ray: response.headers.get("cf-ray"),
  };
  if (!contentType.toLowerCase().includes("application/json")) {
    const error = new Error(
      "The server returned an invalid response. Try again.",
    );
    error.name = "TRPCTransportError";
    setErrorContext(error, {
      ...responseContext,
      failure_kind: "invalid_response",
    });
    // Do not retain or report the response body. It can contain private data.
    void response.body?.cancel().catch(() => undefined);
    throw error;
  }
  setErrorContext(response, responseContext);
  return response;
};
