"use client";

import { Button } from "@/components/ui/button";
import { SignInButton, SignedIn, SignedOut } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useState } from "react";

interface DashboardButtonProps {
  className?: string;
  variant?: "default" | "outline";
}

export function DashboardButton({
  className,
  variant = "default",
}: DashboardButtonProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <Button className={className} disabled size="sm" variant={variant}>
        Dashboard
      </Button>
    );
  }

  return (
    <>
      <SignedIn>
        <Button className={className} asChild size="sm" variant={variant}>
          <Link href="/dashboard">Dashboard</Link>
        </Button>
      </SignedIn>
      <SignedOut>
        <Button className={className} size="sm" asChild variant={variant}>
          <SignInButton mode="modal" forceRedirectUrl="/dashboard">
            Dashboard
          </SignInButton>
        </Button>
      </SignedOut>
    </>
  );
}
