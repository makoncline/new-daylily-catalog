import { withUsageRequest } from "@/server/observability/api-usage";
import { handleMcpRequest } from "@/server/mcp/read-only-mcp";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return withUsageRequest(request, "mcp", () => handleMcpRequest(request));
}

export function GET() {
  return new Response(null, {
    headers: { Allow: "POST" },
    status: 405,
  });
}
