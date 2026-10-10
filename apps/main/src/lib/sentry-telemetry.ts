import * as Sentry from "@sentry/nextjs";
import { configureTraceContext } from "./telemetry";

export function connectSentryLogging() {
  configureTraceContext(() => {
    const span = Sentry.getActiveSpan();
    if (!span) return undefined;
    const { traceId, spanId } = span.spanContext();
    return {
      correlation_id: traceId,
      correlation_scope: "trace",
      trace_id: traceId,
      span_id: spanId,
    };
  });
}
