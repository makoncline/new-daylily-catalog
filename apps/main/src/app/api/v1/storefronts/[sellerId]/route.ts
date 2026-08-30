import { loadPublicStorefrontArtifact } from "@/server/storefront/public-storefront-artifacts";
import { createPublicStorefrontHandler } from "@/server/storefront/public-storefront-route-handler";

export const runtime = "nodejs";
export const GET = createPublicStorefrontHandler(loadPublicStorefrontArtifact);
