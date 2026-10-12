import type { Event, EventHint, Log } from "@sentry/nextjs";

export interface LogContext {
  correlation_id: string;
  correlation_scope?: "request" | "trace" | "operation" | "runtime";
  [key: string]: unknown;
}

type LogLevel = "debug" | "info" | "warn" | "error";
const stateKey = Symbol.for("daylily.telemetry");
interface TelemetryState {
  runtimeId: string;
  errorContexts: WeakMap<object, LogContext>;
  getContext?: () => LogContext | undefined;
  getTraceContext?: () => LogContext | undefined;
  restoreConsole?: () => void;
}
const globals = globalThis as typeof globalThis & {
  [stateKey]?: TelemetryState;
};
const state = (globals[stateKey] ??= {
  runtimeId: crypto.randomUUID(),
  errorContexts: new WeakMap(),
});

export function validCorrelationId(value: unknown): string | undefined {
  return typeof value === "string" && /^[a-zA-Z0-9_-]{8,80}$/.test(value)
    ? value
    : undefined;
}

export function configureLogContext(getContext: () => LogContext | undefined) {
  state.getContext = getContext;
}

export function configureTraceContext(
  getContext: () => LogContext | undefined,
) {
  state.getTraceContext = getContext;
}

export function getLogContext(): LogContext {
  return {
    ...(typeof window === "undefined"
      ? {
          release: process.env.SENTRY_RELEASE,
          environment: process.env.NODE_ENV,
        }
      : {}),
    ...(state.getContext?.() ??
      state.getTraceContext?.() ?? {
        correlation_id: state.runtimeId,
        correlation_scope: "runtime",
      }),
  };
}

export function setErrorContext(error: unknown, context: LogContext) {
  if (typeof error === "object" && error !== null) {
    state.errorContexts.set(error, context);
  }
}

export function getErrorContext(error: unknown): LogContext | undefined {
  // tRPC wraps transport errors in TRPCClientError.cause.
  const seen = new Set<object>();
  while (typeof error === "object" && error !== null && !seen.has(error)) {
    seen.add(error);
    const context = state.errorContexts.get(error);
    if (context) return context;
    let responseContext: LogContext | undefined;
    if (
      "meta" in error &&
      typeof error.meta === "object" &&
      error.meta !== null &&
      "response" in error.meta
    ) {
      const response = error.meta.response;
      if (typeof response === "object" && response !== null) {
        responseContext = state.errorContexts.get(response);
      }
    }
    if (
      "data" in error &&
      typeof error.data === "object" &&
      error.data !== null
    ) {
      const data = error.data;
      const id =
        "correlationId" in data && validCorrelationId(data.correlationId);
      if (id)
        return {
          ...responseContext,
          correlation_id: id,
          correlation_scope: "request",
          error_code: "code" in data ? data.code : undefined,
          procedure: "path" in data ? data.path : undefined,
          http_status: "httpStatus" in data ? data.httpStatus : undefined,
        };
    }
    if (responseContext) return responseContext;
    error = "cause" in error ? error.cause : undefined;
  }
  return undefined;
}

export function safeUrl(value: string) {
  return value
    .replace(/([?#]).*$/, "")
    .replace(/(https?:\/\/)[^/@\s]+:[^/@\s]+@/g, "$1");
}

function errorGroup(message: string) {
  if (
    message.startsWith(
      "The Server Reference ID did not match the expected format.",
    )
  ) {
    return {
      error_kind: "invalid_server_action",
      message: "Server Action reference is invalid",
    };
  }
  if (message.startsWith("Failed to find Server Action")) {
    return {
      error_kind: "server_action_unavailable",
      message: "Server Action is not available for this deployment",
    };
  }
  if (message === "Failed to parse body as FormData.") {
    return {
      error_kind: "invalid_form_data",
      message: "Request body could not be parsed as FormData",
    };
  }
  return undefined;
}

export function sanitizeTelemetry(
  value: unknown,
  seen = new WeakSet<object>(),
  depth = 0,
): unknown {
  if (typeof value === "string") {
    return value.replace(/https?:\/\/[^\s"'<>]+/g, safeUrl).slice(0, 8000);
  }
  if (typeof value === "bigint") return String(value);
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) return "[Circular]";
  if (depth > 6) return "[Truncated]";
  seen.add(value);
  if (value instanceof Error) {
    return sanitizeTelemetry(
      {
        name: value.name,
        message: value.message,
        ...errorGroup(value.message),
        stack: value.stack,
        cause: value.cause,
        ...Object.fromEntries(Object.entries(value)),
      },
      seen,
      depth + 1,
    );
  }
  if (Array.isArray(value))
    return value
      .slice(0, 50)
      .map((item) => sanitizeTelemetry(item, seen, depth + 1));
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      /authorization|cookie|token|secret|password|signature|email|^input$|^rawInput$|^body$|^requestBody$/i.test(
        key,
      ) ||
      (key.startsWith("http.request.header.") &&
        !/\.(cf_ray|content_type|x_correlation_id)$/.test(key))
        ? "[Redacted]"
        : /url|uri|referer|http\.target/i.test(key) && typeof item === "string"
          ? safeUrl(item)
          : sanitizeTelemetry(item, seen, depth + 1),
    ]),
  );
}

export function logEvent(
  level: LogLevel,
  event: string,
  attributes: Record<string, unknown> = {},
) {
  const context = getErrorContext(attributes.error) ?? getLogContext();
  const correlationId =
    validCorrelationId(attributes.correlation_id) ?? context.correlation_id;
  console[level](
    JSON.stringify(
      sanitizeTelemetry({
        ...context,
        ...attributes,
        event,
        level,
        timestamp: new Date().toISOString(),
        correlation_id: correlationId,
      }),
    ),
  );
}

/** Cover framework and dependency console output as well as application logs. */
export function installConsoleLogging() {
  if (state.restoreConsole) return state.restoreConsole;
  const originals = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
    debug: console.debug,
  };
  let writing = false;
  for (const level of Object.keys(originals) as (keyof typeof originals)[]) {
    console[level] = (...args: unknown[]) => {
      if (writing) return;
      writing = true;
      try {
        let payload: Record<string, unknown> = {};
        if (typeof args[0] === "string" && args[0].startsWith("{")) {
          try {
            const parsed: unknown = JSON.parse(args[0]);
            if (parsed && typeof parsed === "object" && !Array.isArray(parsed))
              payload = parsed as Record<string, unknown>;
          } catch {
            /* Plain console message. */
          }
        }
        const error = args.find((arg) => arg instanceof Error);
        const context = getErrorContext(error) ?? getLogContext();
        const group = error && errorGroup(error.message);
        if (error) setErrorContext(error, context);
        const record = {
          ...context,
          level: level === "log" ? "info" : level,
          timestamp: new Date().toISOString(),
          event: "console_message",
          ...(Object.keys(payload).length
            ? payload
            : {
                message:
                  typeof args[0] === "string" ? args[0] : "Console message",
                details: typeof args[0] === "string" ? args.slice(1) : args,
              }),
          ...(group ? { event: group.error_kind, ...group } : {}),
          correlation_id:
            validCorrelationId(payload.correlation_id) ??
            context.correlation_id,
        };
        originals[level].call(
          console,
          JSON.stringify(sanitizeTelemetry(record)),
        );
      } catch {
        originals[level].call(
          console,
          JSON.stringify({
            event: "log_serialization_failed",
            timestamp: new Date().toISOString(),
            level: "error",
            correlation_id: state.runtimeId,
          }),
        );
      } finally {
        writing = false;
      }
    };
  }
  state.restoreConsole = () => {
    Object.assign(console, originals);
    state.restoreConsole = undefined;
  };
  return state.restoreConsole;
}

export function enrichSentryEvent<T extends Event>(
  event: T,
  hint?: EventHint,
): T & Event {
  const errorContext = getErrorContext(hint?.originalException);
  const savedCorrelationId = validCorrelationId(event.extra?.correlation_id);
  const savedContext: LogContext | undefined = savedCorrelationId
    ? { ...event.extra, correlation_id: savedCorrelationId }
    : undefined;
  const traceId = validCorrelationId(event.contexts?.trace?.trace_id);
  const context =
    errorContext ??
    savedContext ??
    (traceId
      ? {
          correlation_id: traceId,
          correlation_scope: "trace" as const,
          trace_id: traceId,
        }
      : getLogContext());
  const correlationId =
    validCorrelationId(event.tags?.correlation_id) ??
    errorContext?.correlation_id ??
    traceId ??
    context.correlation_id;
  setErrorContext(hint?.originalException, {
    ...context,
    correlation_id: correlationId,
  });
  event.tags = {
    ...event.tags,
    correlation_id: correlationId,
    ...(typeof context.http_status === "number"
      ? { http_status: context.http_status }
      : {}),
    ...(typeof context.procedure === "string"
      ? { procedure: context.procedure }
      : {}),
    ...(typeof context.failure_kind === "string"
      ? { failure_kind: context.failure_kind }
      : {}),
  };
  event.contexts = {
    ...event.contexts,
    debugging: {
      ...context,
      correlation_id: correlationId,
    },
  };
  if (context.failure_kind === "invalid_response") {
    event.fingerprint = [
      "trpc_transport",
      "invalid_response",
      String(context.http_status),
    ];
  }
  for (const exception of event.exception?.values ?? []) {
    const group = exception.value && errorGroup(exception.value);
    if (group) {
      exception.value = group.message;
      event.tags.error_kind = group.error_kind;
    }
  }
  if (event.request) {
    event.request = {
      ...event.request,
      url: event.request.url && safeUrl(event.request.url),
      headers: undefined,
      cookies: undefined,
      data: undefined,
      query_string: undefined,
    };
  }
  event.contexts = sanitizeTelemetry(event.contexts) as Event["contexts"];
  event.tags = sanitizeTelemetry(event.tags) as Event["tags"];
  event.extra = sanitizeTelemetry(event.extra) as Event["extra"];
  event.breadcrumbs = sanitizeTelemetry(
    event.breadcrumbs,
  ) as Event["breadcrumbs"];
  for (const span of event.spans ?? []) {
    span.data = sanitizeTelemetry(span.data) as typeof span.data;
  }
  return event;
}

export function enrichSentryLog(log: Log): Log {
  const context = getLogContext();
  return {
    ...log,
    attributes: sanitizeTelemetry({
      ...context,
      ...log.attributes,
      correlation_id:
        validCorrelationId(log.attributes?.correlation_id) ??
        context.correlation_id,
    }) as Log["attributes"],
  };
}
