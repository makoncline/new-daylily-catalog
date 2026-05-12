import {
  AGENT_DISCOVERY_HEADERS,
  getDaylilyCatalogSkill,
  getRequestBaseUrl,
} from "@/lib/agent-readiness";
import { getCanonicalBaseUrl } from "@/lib/utils/getBaseUrl";

export function GET(request?: Request): Response {
  const baseUrl = getRequestBaseUrl(request) ?? getCanonicalBaseUrl();

  return new Response(getDaylilyCatalogSkill(baseUrl), {
    headers: {
      ...AGENT_DISCOVERY_HEADERS,
      "Content-Type": "text/markdown; charset=utf-8",
    },
  });
}
