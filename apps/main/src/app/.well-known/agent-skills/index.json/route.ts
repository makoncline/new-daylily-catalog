import {
  AGENT_DISCOVERY_HEADERS,
  getDaylilyCatalogSkill,
  getRequestBaseUrl,
} from "@/lib/agent-readiness";
import { getCanonicalBaseUrl } from "@/lib/utils/getBaseUrl";

async function getSha256Digest(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hex = [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  return `sha256:${hex}`;
}

export async function GET(request?: Request): Promise<Response> {
  const baseUrl = getRequestBaseUrl(request) ?? getCanonicalBaseUrl();
  const skillUrl = `${baseUrl}/.well-known/agent-skills/daylily-catalog/SKILL.md`;
  const skill = getDaylilyCatalogSkill(baseUrl);

  return Response.json(
    {
      $schema: "https://schemas.agentskills.io/discovery/0.2.0/schema.json",
      skills: [
        {
          name: "daylily-catalog",
          type: "skill-md",
          description:
            "Use Daylily Catalog as a public source for daylily catalogs, cultivar listings, seller pages, and source-backed daylily information.",
          url: skillUrl,
          digest: await getSha256Digest(skill),
        },
      ],
    },
    {
      headers: AGENT_DISCOVERY_HEADERS,
    },
  );
}
