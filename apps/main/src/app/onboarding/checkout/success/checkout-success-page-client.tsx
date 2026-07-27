"use client";

import { SignIn, useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";
import { OnboardingStatusPage } from "../../onboarding-status-page";
import {
  clearAnonymousOnboardingDraft,
  readAnonymousOnboardingDraft,
} from "../../anonymous-onboarding-draft";
import {
  CATALOG_IMPORTER_ENTRY_SOURCE,
  CATALOG_IMPORTER_MEMBERSHIP_RETURN_PATH,
} from "@/lib/catalog-importer-membership";

interface CheckoutStatus {
  sessionId: string;
  email: string;
  status: string | null;
  isActive: boolean;
  entrySource: string | null;
  returnTo: string | null;
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

  const claimCheckoutAndContinue = useCallback(() => {
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
          if (status?.entrySource === CATALOG_IMPORTER_ENTRY_SOURCE) {
            router.replace(CATALOG_IMPORTER_MEMBERSHIP_RETURN_PATH);
            return;
          }
          clearAnonymousOnboardingDraft();
          router.replace("/dashboard?subscriptionSynced=1");
        },
        onError: () => {
          hasStartedClaim.current = false;
        },
      },
    );
  }, [activeSessionId, claimCheckout, router, status?.entrySource]);

  useEffect(() => {
    if (!isLoaded || !userId || !activeSessionId) {
      return;
    }

    if (autoClaimedSessionId.current === activeSessionId) {
      return;
    }

    autoClaimedSessionId.current = activeSessionId;
    claimCheckoutAndContinue();
  }, [activeSessionId, claimCheckoutAndContinue, isLoaded, userId]);

  if (!status) {
    return (
      <CheckoutShell
        eyebrow="Checkout"
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
        eyebrow="Checkout"
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
        eyebrow="Trial active"
        title={
          status.entrySource === CATALOG_IMPORTER_ENTRY_SOURCE
            ? "Opening your catalog import"
            : "Opening your dashboard"
        }
        description={
          status.entrySource === CATALOG_IMPORTER_ENTRY_SOURCE
            ? "Your trial is active. Your browser-local catalog project will continue in the dashboard."
            : "Your trial is active. We are setting up your dashboard and adding the profile you built."
        }
      >
        {claimCheckout.error ? (
          <div className="space-y-3">
            <p className="text-destructive text-sm">
              {claimCheckout.error.message}
            </p>
            <Button type="button" onClick={claimCheckoutAndContinue}>
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
    <CheckoutAuthShell
      data-testid="checkout-clerk-sign-in"
      returningToImporter={status.entrySource === CATALOG_IMPORTER_ENTRY_SOURCE}
    >
      <SignIn
        routing="virtual"
        forceRedirectUrl={returnTo}
        fallbackRedirectUrl={returnTo}
        signUpForceRedirectUrl={returnTo}
        signUpFallbackRedirectUrl={returnTo}
        initialValues={{ emailAddress: status.email }}
        withSignUp
      />
    </CheckoutAuthShell>
  );
}

function CheckoutShell({
  children,
  description,
  eyebrow,
  title,
}: {
  children: React.ReactNode;
  description: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <OnboardingStatusPage
      eyebrow={eyebrow}
      title={title}
      description={description}
      testId="onboarding-checkout-success"
      actions={children}
    />
  );
}

function CheckoutAuthShell({
  children,
  "data-testid": testId,
  returningToImporter = false,
}: {
  children: React.ReactNode;
  "data-testid"?: string;
  returningToImporter?: boolean;
}) {
  return (
    <div className="bg-muted/20" data-testid="onboarding-checkout-success">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-14 sm:py-20 lg:grid-cols-[minmax(0,1fr)_28rem] lg:px-8 lg:py-24">
        <div className="max-w-2xl space-y-4">
          <p className="text-primary text-sm font-semibold">Trial active</p>
          <h1 className="text-2xl leading-tight font-semibold tracking-tight text-balance sm:text-3xl">
            {returningToImporter
              ? "Verify your email to continue."
              : "Sign in to open your dashboard."}
          </h1>
          <p className="text-muted-foreground max-w-xl text-lg leading-8">
            Use the email from checkout. We will send your one-time login code.
            {returningToImporter
              ? " Your spreadsheet and progress remain in this browser."
              : null}
          </p>
        </div>

        <div
          className="w-full max-w-md lg:justify-self-end"
          data-testid={testId}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
