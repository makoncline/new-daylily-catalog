"use client";

import Link from "next/link";
import React from "react";

interface SEOLinkProps {
  href: string;
  onCustomClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  className?: string;
  ariaLabel: string;
  children?: React.ReactNode;
  srText?: string;
  preventDefaultWhenJS?: boolean;
}

/**
 * SEOLink - A component that provides an accessible, SEO-friendly link
 * that can optionally have its default navigation behavior overridden
 * while still being crawlable by search engines.
 */
export function SEOLink({
  href,
  onCustomClick,
  className = "absolute inset-0 z-10",
  ariaLabel,
  children,
  srText,
  preventDefaultWhenJS = true,
}: SEOLinkProps) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (preventDefaultWhenJS) {
      // Prevent default link navigation when JS is enabled
      e.preventDefault();
      // Stop propagation to prevent parent handlers from firing
      e.stopPropagation();
    }

    // Call custom click handler if provided
    if (onCustomClick) {
      onCustomClick(e);
    }
  };

  return (
    <Link
      href={href}
      className={className}
      onClick={handleClick}
      aria-label={ariaLabel}
    >
      {children ?? <span className="sr-only">{srText}</span>}
    </Link>
  );
}
