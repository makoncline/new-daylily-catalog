import { assertInquiryDeliveryReady } from "@/server/inquiries/inquiry-adapter";
import { createHealthHandler } from "@/server/storefront/health-handler";
import { getStorefrontSnapshotStatus } from "@/server/storefront";

export async function GET(): Promise<Response> {
  return createHealthHandler(
    getStorefrontSnapshotStatus,
    assertInquiryDeliveryReady,
  )();
}
