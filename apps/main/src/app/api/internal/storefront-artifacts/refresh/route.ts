import { env } from "@/env";
import { refreshPublicStorefrontArtifacts } from "@/server/storefront/public-storefront-refresh";
import { createStorefrontArtifactRefreshHandler } from "@/server/storefront/storefront-artifact-refresh-http";

const handleRefresh = createStorefrontArtifactRefreshHandler({
  getToken: () => env.STOREFRONT_ARTIFACT_REFRESH_TOKEN,
  refresh: refreshPublicStorefrontArtifacts,
});

export async function POST(request: Request) {
  return handleRefresh(request);
}
