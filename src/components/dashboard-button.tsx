"use client";

import { Button } from "@/components/ui/button";
import { SignInButton, useAuth } from "@clerk/nextjs";
import Link from "next/link";

interface DashboardButtonProps {
  className?: string;
  variant?: "default" | "outline";
}

export function DashboardButton({
  className,
  variant = "default",
}: DashboardButtonProps) {
  const { isLoaded, userId } = useAuth();

  if (!isLoaded) {
    return (
      <Button className={className} disabled size="sm" variant={variant}>
        Dashboard
      </Button>
    );
  }

  if (userId) {
    return (
      <Button className={className} asChild size="sm" variant={variant}>
        <Link href="/dashboard">Dashboard</Link>
      </Button>
    );
  }

  return (
    <Button className={className} size="sm" asChild variant={variant}>
      <div>
        <SignInButton
          mode="modal"
          forceRedirectUrl="/dashboard"
          signUpForceRedirectUrl="/dashboard"
        >
          Dashboard
        </SignInButton>
      </div>
    </Button>
  );
}
