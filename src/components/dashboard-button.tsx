"use client";

import { Button } from "@/components/ui/button";
import { SignInButton, useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { capturePosthogEvent } from "@/lib/analytics/posthog";
import { SUBSCRIPTION_CONFIG } from "@/config/subscription-config";

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
        <Link
          href="/dashboard"
          onClick={() => {
            capturePosthogEvent("public_nav_dashboard_clicked", {
              auth_state: "signed_in",
            });
          }}
        >
          Dashboard
        </Link>
      </Button>
    );
  }

  return (
    <SignInButton
      mode="modal"
      forceRedirectUrl="/dashboard"
      signUpForceRedirectUrl={SUBSCRIPTION_CONFIG.NEW_USER_MEMBERSHIP_PATH}
    >
      <Button
        className={className}
        size="sm"
        variant={variant}
        onClick={() => {
          capturePosthogEvent("public_nav_dashboard_clicked", {
            auth_state: "signed_out",
          });
        }}
      >
        Dashboard
      </Button>
    </SignInButton>
  );
}
