import { withRequestLogging } from "@/server/observability/log-context";
import { handleMcpRequest } from "@/server/mcp/read-only-mcp";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return withRequestLogging(request, () => handleMcpRequest(request));
}

export function GET() {
  return new Response(null, {
    headers: { Allow: "POST" },
    status: 405,
  });
}
