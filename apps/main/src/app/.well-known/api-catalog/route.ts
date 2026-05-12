import {
  AGENT_DISCOVERY_HEADERS,
  getApiCatalog,
  getRequestBaseUrl,
} from "@/lib/agent-readiness";
import { getCanonicalBaseUrl } from "@/lib/utils/getBaseUrl";

export function GET(request?: Request): Response {
  const baseUrl = getRequestBaseUrl(request) ?? getCanonicalBaseUrl();

  return Response.json(getApiCatalog(baseUrl), {
    headers: {
      ...AGENT_DISCOVERY_HEADERS,
      "Content-Type": "application/linkset+json; charset=utf-8",
    },
  });
}
