import { getStorefrontSiteConfig } from "@/config/storefront-site-config";
import { createAgentSkillsIndexResponse } from "@/server/machine-contract/machine-discovery";

export function GET(): Response {
  return createAgentSkillsIndexResponse(getStorefrontSiteConfig());
}
