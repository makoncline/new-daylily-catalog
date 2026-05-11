import {
  AGENT_DISCOVERY_HEADERS,
  getLlmsFullTxt,
  getRequestBaseUrl,
} from "@/lib/agent-readiness";
import { getCanonicalBaseUrl } from "@/lib/utils/getBaseUrl";

export function GET(request?: Request): Response {
  const baseUrl = getRequestBaseUrl(request) ?? getCanonicalBaseUrl();

  return new Response(getLlmsFullTxt(baseUrl), {
    headers: {
      ...AGENT_DISCOVERY_HEADERS,
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
