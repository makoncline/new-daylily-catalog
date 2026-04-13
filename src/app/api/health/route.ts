import { NextResponse } from "next/server";
import { runHealthCheck } from "@/server/health/run-health-check";

export const dynamic = "force-dynamic";

const HEALTH_RESPONSE_HEADERS = {
  "Cache-Control": "no-store",
};

function getHealthStatus(ok: boolean) {
  return ok ? 200 : 503;
}

export async function GET() {
  const result = await runHealthCheck();

  return NextResponse.json(
    result.ok
      ? {
          ok: true,
          checkedAt: result.checkedAt,
          checks: result.passed,
        }
      : {
          ok: false,
          checkedAt: result.checkedAt,
          failed: result.failed,
        },
    {
      status: getHealthStatus(result.ok),
      headers: HEALTH_RESPONSE_HEADERS,
    },
  );
}

export async function HEAD() {
  const result = await runHealthCheck();

  return new Response(null, {
    status: getHealthStatus(result.ok),
    headers: HEALTH_RESPONSE_HEADERS,
  });
}
