import { logEvent } from "@/lib/telemetry";
import { getOptionalRuntimePosthogConfig } from "@/lib/observability-env";

interface CaptureServerPosthogEventInput {
  distinctId: string;
  event: string;
  properties?: Record<string, boolean | null | number | string | undefined>;
}

function getPosthogServerConfig() {
  if (process.env.NODE_ENV !== "production") {
    return null;
  }

  return getOptionalRuntimePosthogConfig();
}

export async function captureServerPosthogEvent({
  distinctId,
  event,
  properties,
}: CaptureServerPosthogEventInput) {
  const config = getPosthogServerConfig();
  if (!config) {
    return;
  }

  try {
    const response = await fetch(`${config.host}/capture/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: config.posthogKey,
        event,
        distinct_id: distinctId,
        properties,
      }),
    });

    if (!response.ok) {
      logEvent("error", "posthog_capture_failed", {
        analytics_event: event,
        http_status: response.status,
      });
    }
  } catch (error) {
    logEvent("error", "posthog_capture_failed", {
      analytics_event: event,
      error,
    });
  }
}
