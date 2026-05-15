"use client";

import { useEffect } from "react";
import { capturePosthogEvent } from "@/lib/analytics/posthog";
import { FloatingCartButton } from "@/components/floating-cart-button";
import { CopyListingLinkButton } from "@/components/copy-listing-link-button";

interface PublicListingPageActionsProps {
  listingId: string;
  listingUrl: string;
  sellerId: string;
}

function getReferringDomain() {
  if (typeof document === "undefined" || !document.referrer) {
    return undefined;
  }

  try {
    return new URL(document.referrer).hostname;
  } catch {
    return undefined;
  }
}

export function PublicListingPageViewTracker({
  listingId,
  sellerId,
}: Pick<PublicListingPageActionsProps, "listingId" | "sellerId">) {
  useEffect(() => {
    capturePosthogEvent("listing_page_viewed", {
      sellerId,
      listingId,
      pageType: "public_listing",
      referrer: document.referrer || undefined,
      referringDomain: getReferringDomain(),
    });
  }, [listingId, sellerId]);

  return null;
}

export function PublicListingPageActions({
  listingId,
  listingUrl,
  sellerId,
}: PublicListingPageActionsProps) {
  return (
    <CopyListingLinkButton
      listingId={listingId}
      listingUrl={listingUrl}
      sellerId={sellerId}
      pageType="public_listing"
      className="border border-input bg-background shadow-sm hover:bg-accent"
    />
  );
}

export function usePublicListingContactTracker({
  listingId,
  sellerId,
}: Pick<PublicListingPageActionsProps, "listingId" | "sellerId">) {
  function trackContactClick() {
    capturePosthogEvent("public_listing_contact_clicked", {
      sellerId,
      listingId,
      pageType: "public_listing",
      sourcePage: window.location.pathname,
      orderMethod: "catalog_contact_form",
      referrer: document.referrer || undefined,
      referringDomain: getReferringDomain(),
    });
    capturePosthogEvent("seller_order_method_clicked", {
      sellerId,
      listingId,
      pageType: "public_listing",
      sourcePage: window.location.pathname,
      orderMethod: "catalog_contact_form",
    });
  }

  return trackContactClick;
}

export function PublicListingContactButton({
  listingId,
  sellerId,
  sellerName,
}: Pick<PublicListingPageActionsProps, "listingId" | "sellerId"> & {
  sellerName?: string;
}) {
  const trackContactClick = usePublicListingContactTracker({
    listingId,
    sellerId,
  });

  return (
    <FloatingCartButton
      userId={sellerId}
      userName={sellerName}
      showTopButton
      onContactClick={trackContactClick}
    />
  );
}
