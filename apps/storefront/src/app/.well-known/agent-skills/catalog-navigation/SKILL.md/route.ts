import { getStorefrontSiteConfig } from "@/config/storefront-site-config";
import { createAgentSkillResponse } from "@/server/machine-contract/machine-discovery";

export function GET(): Response {
  return createAgentSkillResponse(
    getStorefrontSiteConfig(),
    "catalog-navigation",
  );
}
