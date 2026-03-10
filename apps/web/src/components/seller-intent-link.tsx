"use client";

import Link from "next/link";
import type { ReactNode } from "react";

interface SellerIntentLinkProps {
  href?: string;
  className?: string;
  children: ReactNode;
  entrySurface: string;
  ctaId: string;
  ctaLabel: string;
  sourcePageType?: string;
  sourcePath?: string;
}

export function SellerIntentLink({
  href = "/start-membership",
  className,
  children,
  entrySurface,
  ctaId,
  ctaLabel,
  sourcePageType,
  sourcePath,
}: SellerIntentLinkProps) {
  const handleClick = () => {
    const resolvedSourcePath = sourcePath ?? globalThis.location?.pathname ?? "/";
    const resolvedSourcePageType = sourcePageType ?? "public";

    const posthog = (globalThis as {
      posthog?: {
        capture?: (
          eventName: string,
          properties?: Record<string, unknown>,
        ) => void;
      };
    }).posthog;

    posthog?.capture?.("seller_cta_clicked", {
      entry_surface: entrySurface,
      source_page_type: resolvedSourcePageType,
      source_path: resolvedSourcePath,
      cta_id: ctaId,
      cta_label: ctaLabel,
      target_path: href,
    });
  };

  return (
    <Link href={href} className={className} onClick={handleClick}>
      {children}
    </Link>
  );
}
