"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { capturePosthogEvent } from "@/lib/analytics/posthog";
import { cn } from "@/lib/utils";

interface CopyListingLinkButtonProps {
  listingId: string;
  listingUrl: string;
  sellerId: string;
  pageType: string;
  className?: string;
  size?: "sm" | "icon";
}

function getAbsoluteUrl(url: string) {
  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  if (typeof window === "undefined") {
    return url;
  }

  return new URL(url, window.location.origin).toString();
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

export function CopyListingLinkButton({
  listingId,
  listingUrl,
  sellerId,
  pageType,
  className,
  size = "icon",
}: CopyListingLinkButtonProps) {
  async function copyListingLink() {
    const absoluteUrl = getAbsoluteUrl(listingUrl);

    await navigator.clipboard.writeText(absoluteUrl);
    capturePosthogEvent("listing_link_copied", {
      sellerId,
      listingId,
      pageType,
      sourcePage:
        typeof window === "undefined" ? undefined : window.location.pathname,
      referrer:
        typeof document === "undefined" ? undefined : document.referrer || undefined,
      referringDomain: getReferringDomain(),
    });
    toast.success("Listing link copied");
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size={size}
      className={cn("text-muted-foreground hover:text-foreground", className)}
      onClick={() => void copyListingLink()}
      title="Copy listing link"
      aria-label="Copy listing link"
    >
      <Copy className="size-4" />
    </Button>
  );
}
