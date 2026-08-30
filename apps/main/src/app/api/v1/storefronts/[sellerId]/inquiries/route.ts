import { env } from "@/env";
import { sendPublicInquiry } from "@/server/services/public-inquiry";
import {
  getConfiguredStorefrontInquiryToken,
  isConfiguredStorefrontSeller,
} from "@/server/services/storefront-inquiry-credentials";
import { createStorefrontInquiryHandler } from "@/server/services/storefront-inquiry-http";

export const runtime = "nodejs";

const handleStorefrontInquiry = createStorefrontInquiryHandler({
  getToken: (sellerId) =>
    getConfiguredStorefrontInquiryToken(
      sellerId,
      env.STOREFRONT_INQUIRY_TOKENS_JSON,
      env.PUBLIC_STOREFRONT_SELLER_IDS,
    ),
  isSellerApproved: (sellerId) =>
    isConfiguredStorefrontSeller(sellerId, env.PUBLIC_STOREFRONT_SELLER_IDS),
  sendInquiry: sendPublicInquiry,
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sellerId: string }> },
): Promise<Response> {
  const { sellerId } = await params;
  return handleStorefrontInquiry(request, { sellerId });
}
