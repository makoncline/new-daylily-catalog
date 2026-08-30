"use client";

import { Button } from "@daylily-catalog/ui/components/button";
import Link from "next/link";
import type { ReactNode } from "react";

interface LinkButtonProps {
  href: string;
  children: ReactNode;
  variant?: "default" | "outline";
  className?: string;
  external?: boolean;
}

export function LinkButton({
  href,
  children,
  variant = "default",
  className = "",
  external = false,
}: LinkButtonProps) {
  if (external) {
    return (
      <Button asChild size="lg" variant={variant} className={className}>
        <a href={href} target="_blank" rel="noreferrer">
          {children}
        </a>
      </Button>
    );
  }
  return (
    <Button asChild size="lg" variant={variant} className={className}>
      <Link href={href}>{children}</Link>
    </Button>
  );
}
