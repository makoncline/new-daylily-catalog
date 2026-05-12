import {
  AGENT_DISCOVERY_HEADERS,
  getOpenApiDocument,
  getRequestBaseUrl,
} from "@/lib/agent-readiness";
import { getCanonicalBaseUrl } from "@/lib/utils/getBaseUrl";

export function GET(request?: Request): Response {
  const baseUrl = getRequestBaseUrl(request) ?? getCanonicalBaseUrl();

  return Response.json(getOpenApiDocument(baseUrl), {
    headers: {
      ...AGENT_DISCOVERY_HEADERS,
      "Content-Type": "application/openapi+json; charset=utf-8",
    },
  });
}
