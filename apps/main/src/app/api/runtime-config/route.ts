import { NextResponse } from "next/server";
import {
  getRuntimePosthogClientConfig,
  getRuntimeSentryEnabled,
  getRuntimeSentryEnvironment,
  getRuntimeSentryRelease,
} from "@/lib/observability-env";
import { SENTRY_DSN } from "@/lib/sentry-config";

export const dynamic = "force-dynamic";

export function GET() {
  const posthogConfig = getRuntimePosthogClientConfig();

  return NextResponse.json(
    {
      sentry: {
        enabled: getRuntimeSentryEnabled(),
        dsn: SENTRY_DSN,
        environment: getRuntimeSentryEnvironment(),
        release: getRuntimeSentryRelease(),
      },
      posthog: posthogConfig
        ? {
            enabled: true,
            key: posthogConfig.posthogKey,
            host: posthogConfig.host,
          }
        : {
            enabled: false,
          },
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
