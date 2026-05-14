import {
  AGENT_DISCOVERY_HEADERS,
  getOAuthAuthorizationServerMetadata,
  getTrustedBaseUrl,
} from "@/lib/agent-readiness";

export function GET(request?: Request): Response {
  const baseUrl = getTrustedBaseUrl(request);

  return Response.json(getOAuthAuthorizationServerMetadata(baseUrl), {
    headers: {
      ...AGENT_DISCOVERY_HEADERS,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}
