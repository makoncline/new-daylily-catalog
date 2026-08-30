import { createCatalogHandler } from "@/server/public-api/public-read-api";
import { getStorefrontSnapshot } from "@/server/storefront";

interface CatalogRouteContext {
  params: Promise<{ catalog: string }>;
}

const handleCatalog = createCatalogHandler(getStorefrontSnapshot);

export async function GET(
  request: Request,
  { params }: CatalogRouteContext,
): Promise<Response> {
  const { catalog } = await params;
  return handleCatalog(request, catalog);
}
