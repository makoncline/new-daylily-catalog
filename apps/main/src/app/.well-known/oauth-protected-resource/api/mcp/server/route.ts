import {
  AGENT_DISCOVERY_HEADERS,
  getMcpOAuthProtectedResourceMetadata,
  getTrustedBaseUrl,
} from "@/lib/agent-readiness";

export function GET(request: Request): Response {
  return Response.json(
    getMcpOAuthProtectedResourceMetadata(getTrustedBaseUrl(request)),
    { headers: AGENT_DISCOVERY_HEADERS },
  );
}
