import {
  createStorefrontIconResponse,
  storefrontIconSize,
} from "@/server/branding/storefront-icon";

export const dynamic = "force-dynamic";
export const size = storefrontIconSize;
export const contentType = "image/png";

export default function Icon() {
  return createStorefrontIconResponse();
}
