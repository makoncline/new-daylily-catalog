import { AGENT_DISCOVERY_HEADERS, getTrustedBaseUrl } from "@/lib/agent-readiness";
import { getMcpServerCard } from "@/server/mcp/read-only-mcp";

export const runtime = "nodejs";

export function GET(request: Request) {
  const baseUrl = getTrustedBaseUrl(request);

  return Response.json(getMcpServerCard(baseUrl), {
    headers: {
      ...AGENT_DISCOVERY_HEADERS,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}
