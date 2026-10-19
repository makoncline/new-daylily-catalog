import {
  AGENT_DISCOVERY_HEADERS,
  getOpenApiDocument,
  getRequestBaseUrl,
} from "@/lib/agent-readiness";
import { getCanonicalBaseUrl } from "@/lib/utils/getBaseUrl";

export async function GET(request?: Request): Promise<Response> {
  const baseUrl = getRequestBaseUrl(request) ?? getCanonicalBaseUrl();

  return Response.json(await getOpenApiDocument(baseUrl), {
    headers: {
      ...AGENT_DISCOVERY_HEADERS,
      "Content-Type": "application/openapi+json; charset=utf-8",
    },
  });
}
