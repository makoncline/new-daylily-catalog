import {
  getInquiryAdapter,
  InquiryConfigurationError,
} from "@/server/inquiries/inquiry-adapter";
import { createInquiryHandler } from "@/server/inquiries/inquiry-handler";
import { validateCartInquiry } from "@/server/inquiries/validate-cart-inquiry";

export async function POST(request: Request): Promise<Response> {
  try {
    return createInquiryHandler(
      getInquiryAdapter(),
      validateCartInquiry,
    )(request);
  } catch (error) {
    if (error instanceof InquiryConfigurationError) {
      return Response.json(
        { error: "Inquiry delivery is unavailable." },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }
    throw error;
  }
}
