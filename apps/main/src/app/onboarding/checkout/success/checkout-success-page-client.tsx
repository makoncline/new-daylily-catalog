"use client";

import { SignInButton, SignUpButton, useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { AlertCircle, CheckCircle2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";
import {
  clearAnonymousOnboardingDraft,
  readAnonymousOnboardingDraft,
} from "../../anonymous-onboarding-draft";

interface CheckoutStatus {
  sessionId: string;
  email: string;
  status: string | null;
  isActive: boolean;
}

interface CheckoutSuccessPageClientProps {
  status: CheckoutStatus | null;
}

export function CheckoutSuccessPageClient({
  status,
}: CheckoutSuccessPageClientProps) {
  const router = useRouter();
  const { isLoaded, userId } = useAuth();
  const claimCheckout = api.onboarding.claimCheckout.useMutation();
  const hasStartedClaim = useRef(false);
  const autoClaimedSessionId = useRef<string | null>(null);
  const activeSessionId = status?.isActive ? status.sessionId : null;
  const returnTo = status
    ? `/onboarding/checkout/success?session_id=${encodeURIComponent(
        status.sessionId,
      )}`
    : "/onboarding";

  const claimCheckoutAndOpenDashboard = useCallback(() => {
    if (!activeSessionId || hasStartedClaim.current) {
      return;
    }

    const draft = readAnonymousOnboardingDraft();
    hasStartedClaim.current = true;
    claimCheckout.mutate(
      {
        sessionId: activeSessionId,
        profile: {
          gardenName: draft.profile.gardenName,
          location: draft.profile.location,
          description: draft.profile.description,
          profileImageDataUrl: draft.profile.profileImageDataUrl,
        },
      },
      {
        onSuccess: () => {
          clearAnonymousOnboardingDraft();
          router.replace("/dashboard?subscriptionSynced=1");
        },
        onError: () => {
          hasStartedClaim.current = false;
        },
      },
    );
  }, [activeSessionId, claimCheckout, router]);

  useEffect(() => {
    if (!isLoaded || !userId || !activeSessionId) {
      return;
    }

    if (autoClaimedSessionId.current === activeSessionId) {
      return;
    }

    autoClaimedSessionId.current = activeSessionId;
    claimCheckoutAndOpenDashboard();
  }, [activeSessionId, claimCheckoutAndOpenDashboard, isLoaded, userId]);

  if (!status) {
    return (
      <CheckoutShell
        icon={<AlertCircle className="size-6" />}
        title="Checkout session not found"
        description="We could not find the checkout details for this page."
      >
        <Button asChild>
          <Link href="/onboarding">Return to onboarding</Link>
        </Button>
      </CheckoutShell>
    );
  }

  if (!status.isActive) {
    return (
      <CheckoutShell
        icon={<AlertCircle className="size-6" />}
        title="Checkout still needs attention"
        description="Your trial or membership is not active yet. You can retry checkout, or contact support if you already paid."
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild>
            <Link href="/onboarding">Retry checkout</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="mailto:support@daylilycatalog.com">
              Contact support
            </Link>
          </Button>
        </div>
      </CheckoutShell>
    );
  }

  if (isLoaded && userId) {
    return (
      <CheckoutShell
        icon={<CheckCircle2 className="size-6" />}
        title="Opening your dashboard"
        description="Your trial is active. We are setting up your dashboard and adding the profile you built."
      >
        {claimCheckout.error ? (
          <div className="space-y-3">
            <p className="text-destructive text-sm">
              {claimCheckout.error.message}
            </p>
            <Button
              type="button"
              onClick={claimCheckoutAndOpenDashboard}
            >
              Try again
            </Button>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">Please wait…</p>
        )}
      </CheckoutShell>
    );
  }

  return (
    <CheckoutShell
      icon={<Mail className="size-6" />}
      title="Verify your email to open your dashboard"
      description={`Your trial is active. We will email your login code to ${status.email}.`}
    >
      <div className="space-y-4">
        <div className="bg-muted rounded-lg p-4">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Account email
          </p>
          <p
            className="text-lg font-semibold"
            data-testid="checkout-paid-email"
          >
            {status.email}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          {isLoaded ? (
            <SignUpButton
              mode="modal"
              forceRedirectUrl={returnTo}
              fallbackRedirectUrl={returnTo}
              signInForceRedirectUrl={returnTo}
              signInFallbackRedirectUrl={returnTo}
            >
              <Button data-testid="checkout-create-account">
                Send code and create account
              </Button>
            </SignUpButton>
          ) : (
            <Button data-testid="checkout-create-account" disabled>
              Send code and create account
            </Button>
          )}

          {isLoaded ? (
            <SignInButton
              mode="modal"
              forceRedirectUrl={returnTo}
              fallbackRedirectUrl={returnTo}
              signUpForceRedirectUrl={returnTo}
              signUpFallbackRedirectUrl={returnTo}
            >
              <Button variant="outline">Already have an account? Log in</Button>
            </SignInButton>
          ) : (
            <Button variant="outline" disabled>
              Already have an account? Log in
            </Button>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-muted-foreground text-sm">
            If this email is wrong, do not create an account yet. Contact
            support and include this checkout code.
          </p>
          <p className="font-mono text-xs break-all">{status.sessionId}</p>
          <Button asChild variant="link" className="h-auto p-0">
            <Link href="mailto:support@daylilycatalog.com">
              This email is wrong
            </Link>
          </Button>
        </div>
      </div>
    </CheckoutShell>
  );
}

function CheckoutShell({
  children,
  description,
  icon,
  title,
}: {
  children: React.ReactNode;
  description: string;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="bg-muted/20 min-h-svh">
      <div className="mx-auto flex min-h-svh w-full max-w-3xl items-center px-4 py-10">
        <div
          className="bg-card w-full space-y-6 rounded-lg border p-8 shadow-sm"
          data-testid="onboarding-checkout-success"
        >
          <div className="space-y-3">
            <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-full">
              {icon}
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
            <p className="text-muted-foreground leading-relaxed">
              {description}
            </p>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
