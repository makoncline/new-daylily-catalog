import { getStorefrontSiteConfig } from "@/config/storefront-site-config";
import { createLlmsResponse } from "@/server/machine-contract/machine-discovery";

export function GET(): Response {
  return createLlmsResponse(getStorefrontSiteConfig());
}
