import { createStorefrontIconResponse } from "@/server/branding/storefront-icon";

export const dynamic = "force-dynamic";

export function GET() {
  return createStorefrontIconResponse();
}
