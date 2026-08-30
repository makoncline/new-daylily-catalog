import "server-only";

import { getStorefrontSiteConfig } from "@/config/storefront-site-config";
import { calculateShipping } from "@/lib/shipping";
import { getStorefrontSnapshot } from "@/server/storefront";

import { InvalidCartInquiryError } from "./inquiry-handler";
import type { CartInquiry } from "./inquiry-schema";

function moneyEquals(left: number, right: number) {
  return Math.abs(left - right) < 0.005;
}

export async function validateCartInquiry(
  inquiry: CartInquiry,
): Promise<CartInquiry> {
  const site = getStorefrontSiteConfig();
  const snapshot = await getStorefrontSnapshot(site);
  const listingById = new Map(
    snapshot.listings.map((listing) => [listing.id, listing]),
  );
  const seenIds = new Set<string>();
  let itemCount = 0;
  let subtotal = 0;

  const lines = inquiry.lines.map((line) => {
    if (seenIds.has(line.listingId)) {
      throw new InvalidCartInquiryError(
        "The cart contains a duplicate listing.",
      );
    }
    seenIds.add(line.listingId);
    const listing = listingById.get(line.listingId);
    if (!listing?.price || listing.price <= 0) {
      throw new InvalidCartInquiryError(
        "One or more listings are no longer available.",
      );
    }
    if (
      listing.slug !== line.slug ||
      listing.title !== line.title ||
      !moneyEquals(listing.price, line.unitPrice)
    ) {
      throw new InvalidCartInquiryError(
        "One or more cart listings changed. Refresh the catalog and try again.",
      );
    }
    itemCount += line.quantity;
    subtotal += listing.price * line.quantity;
    return { ...line, unitPrice: listing.price };
  });

  const shipping = calculateShipping(itemCount, site.commerce.shipping);
  const total = subtotal + shipping;
  if (
    !moneyEquals(subtotal, inquiry.subtotal) ||
    !moneyEquals(shipping, inquiry.shipping) ||
    !moneyEquals(total, inquiry.total)
  ) {
    throw new InvalidCartInquiryError(
      "The cart total changed. Refresh the catalog and try again.",
    );
  }

  return { ...inquiry, lines, subtotal, shipping, total };
}
