import { getStorefrontSiteConfig } from "@/config/storefront-site-config";
import { createOpenApiResponse } from "@/server/machine-contract/machine-discovery";

export function GET(): Response {
  return createOpenApiResponse(getStorefrontSiteConfig());
}
