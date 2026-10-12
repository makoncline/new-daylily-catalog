import { AsyncLocalStorage } from "node:async_hooks";
import {
  configureLogContext,
  getErrorContext,
  getLogContext,
  logEvent,
  setErrorContext,
  validCorrelationId,
  type LogContext,
} from "@/lib/telemetry";

const contextKey = Symbol.for("daylily.log-context");
const globals = globalThis as typeof globalThis & {
  [contextKey]?: AsyncLocalStorage<LogContext>;
};
const storage = (globals[contextKey] ??= new AsyncLocalStorage<LogContext>());
configureLogContext(() => storage.getStore());

export function withLogContext<T>(context: LogContext, callback: () => T): T {
  return storage.run(context, callback);
}

export function requestLogContext(request: Request): LogContext {
  const current = getLogContext();
  const correlationId =
    validCorrelationId(request.headers.get("x-correlation-id")) ??
    (current.correlation_scope === "trace"
      ? current.correlation_id
      : crypto.randomUUID());
  const url = new URL(request.url);
  return {
    correlation_id: correlationId,
    correlation_scope: "request",
    method: request.method,
    pathname: url.pathname,
    host: url.host,
    cf_ray: validCorrelationId(request.headers.get("cf-ray")),
    release: process.env.SENTRY_RELEASE,
  };
}

/** Use for uncached API responses. Cached responses must not reuse request IDs. */
export function withRequestLogging(
  request: Request,
  callback: () => Promise<Response>,
) {
  const context = requestLogContext(request);
  return withLogContext(context, async () => {
    const startedAt = performance.now();
    logEvent("info", "http_request_started");
    try {
      const response = await callback();
      response.headers.set("x-correlation-id", context.correlation_id);
      logEvent("info", "http_response_created", {
        http_status: response.status,
        duration_ms: Math.round(performance.now() - startedAt),
      });
      return response;
    } catch (error) {
      setErrorContext(error, getErrorContext(error) ?? context);
      logEvent("error", "http_request_failed", {
        error,
        duration_ms: Math.round(performance.now() - startedAt),
      });
      throw error;
    }
  });
}
