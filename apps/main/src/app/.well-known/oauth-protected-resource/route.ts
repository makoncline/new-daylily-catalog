import {
  AGENT_DISCOVERY_HEADERS,
  getOAuthProtectedResourceMetadata,
  getTrustedBaseUrl,
} from "@/lib/agent-readiness";

export function GET(request?: Request): Response {
  const baseUrl = getTrustedBaseUrl(request);

  return Response.json(getOAuthProtectedResourceMetadata(baseUrl), {
    headers: {
      ...AGENT_DISCOVERY_HEADERS,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}
