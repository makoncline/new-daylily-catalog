import { createCatalogsHandler } from "@/server/public-api/public-read-api";
import { getStorefrontSnapshot } from "@/server/storefront";

const handleCatalogs = createCatalogsHandler(getStorefrontSnapshot);

export async function GET(): Promise<Response> {
  return handleCatalogs();
}
