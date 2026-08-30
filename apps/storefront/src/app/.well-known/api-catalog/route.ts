import { getStorefrontSiteConfig } from "@/config/storefront-site-config";
import { createApiCatalogResponse } from "@/server/machine-contract/machine-discovery";

export function GET(): Response {
  return createApiCatalogResponse(getStorefrontSiteConfig());
}
