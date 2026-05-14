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
      console.error(
        `PostHog server capture failed for ${event}: ${response.status}`,
      );
    }
  } catch (error) {
    console.error(`PostHog server capture error for ${event}:`, error);
  }
}
