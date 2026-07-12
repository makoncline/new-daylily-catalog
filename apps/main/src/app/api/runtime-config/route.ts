import { NextResponse } from "next/server";
import {
  getRuntimePosthogClientConfig,
  getRuntimeSentryEnabled,
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
      localDataRuntime: process.env.REALISTIC_DATA_RUNTIME_ID
        ? {
            mode: "realistic-data",
            databaseId: process.env.REALISTIC_DATA_RUNTIME_ID,
          }
        : process.env.HERMETIC_MODE === "1"
          ? {
              mode: "hermetic",
              databaseId: process.env.HERMETIC_RUNTIME_ID,
            }
          : null,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
