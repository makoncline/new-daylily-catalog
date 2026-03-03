interface CaptureServerPosthogEventInput {
  distinctId: string;
  event: string;
  properties?: Record<string, boolean | null | number | string | undefined>;
}

function getPosthogServerConfig() {
  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (process.env.NODE_ENV !== "production" || !posthogKey) {
    return null;
  }

  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";
  return { host, posthogKey };
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
