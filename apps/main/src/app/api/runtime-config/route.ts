import { NextResponse } from "next/server";
import {
  getRuntimePosthogConfig,
  getRuntimeSentryEnabled,
} from "@/lib/observability-env";
import { SENTRY_DSN } from "@/lib/sentry-config";

export const dynamic = "force-dynamic";

export function GET() {
  const posthogConfig = getRuntimePosthogConfig();

  return NextResponse.json(
    {
      sentry: {
        enabled: getRuntimeSentryEnabled(),
        dsn: SENTRY_DSN,
      },
      posthog: {
        key: posthogConfig.posthogKey,
        host: posthogConfig.host,
      },
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
