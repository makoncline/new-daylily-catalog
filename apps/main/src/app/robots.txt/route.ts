import { getCanonicalBaseUrl } from "@/lib/utils/getBaseUrl";
import {
  AGENT_DISCOVERY_HEADERS,
  AI_AGENT_USER_AGENTS,
  getRequestBaseUrl,
  PRIVATE_AGENT_DISALLOWS,
} from "@/lib/agent-readiness";

export function GET(request?: Request): Response {
  const baseUrl = getRequestBaseUrl(request) ?? getCanonicalBaseUrl();
  const lines = [
    ...AI_AGENT_USER_AGENTS.flatMap((userAgent) => [`User-Agent: ${userAgent}`]),
    "Allow: /",
    ...PRIVATE_AGENT_DISALLOWS.map((route) => `Disallow: ${route}`),
    "",
    "User-Agent: *",
    "Allow: /",
    ...PRIVATE_AGENT_DISALLOWS.map((route) => `Disallow: ${route}`),
    "",
    "Content-Signal: ai-train=yes, search=yes, ai-input=yes",
    "",
    `Host: ${baseUrl}`,
    `Sitemap: ${baseUrl}/sitemap.xml`,
    "",
  ];

  return new Response(lines.join("\n"), {
    headers: {
      ...AGENT_DISCOVERY_HEADERS,
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
