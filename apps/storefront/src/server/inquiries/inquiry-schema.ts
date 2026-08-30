import {
  inquirySchema,
  type CartInquiry,
  type Inquiry,
} from "@daylily-catalog/storefront-contract";

export { inquirySchema };
export type { CartInquiry, Inquiry };

export const inquiryConflictCode = {
  cartChanged: "cart_changed",
  formExpired: "form_expired",
} as const;

export function isInquiryExpired(inquiry: Inquiry, now = new Date()): boolean {
  return (
    now.getTime() - new Date(inquiry.openedAt).getTime() > 2 * 60 * 60 * 1_000
  );
}

export function isLikelySpam(inquiry: Inquiry, now = new Date()): boolean {
  if (inquiry.website) return true;
  const openedAt = new Date(inquiry.openedAt).getTime();
  const ageMilliseconds = now.getTime() - openedAt;
  if (ageMilliseconds < 750) {
    return true;
  }
  const links =
    inquiry.message.match(/(?:https?:\/\/|www\.)[^\s<>()]+/giu)?.length ?? 0;
  return links > 1;
}
