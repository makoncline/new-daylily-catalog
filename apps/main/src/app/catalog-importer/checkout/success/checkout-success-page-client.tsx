"use client";

import { SignIn, useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { SUBSCRIPTION_CONFIG } from "@/config/subscription-config";
import { api } from "@/trpc/react";
import { CheckoutStatusPage } from "../checkout-status-page";
import {
  CATALOG_IMPORTER_MEMBERSHIP_RETURN_PATH,
  CATALOG_IMPORTER_RETURN_PATH,
} from "@/lib/catalog-importer-membership";

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
  const claimCheckout = api.catalogImporter.claimCheckout.useMutation();
  const hasStartedClaim = useRef(false);
  const autoClaimedSessionId = useRef<string | null>(null);
  const activeSessionId = status?.isActive ? status.sessionId : null;
  const returnTo = status
    ? `/catalog-importer/checkout/success?session_id=${encodeURIComponent(
        status.sessionId,
      )}`
    : CATALOG_IMPORTER_RETURN_PATH;

  const claimCheckoutAndContinue = useCallback(() => {
    if (!activeSessionId || hasStartedClaim.current) {
      return;
    }

    hasStartedClaim.current = true;
    claimCheckout.mutate(
      {
        sessionId: activeSessionId,
      },
      {
        onSuccess: () => {
          router.replace(CATALOG_IMPORTER_MEMBERSHIP_RETURN_PATH);
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
          <Link href={CATALOG_IMPORTER_RETURN_PATH}>
            Return to catalog importer
          </Link>
        </Button>
      </CheckoutShell>
    );
  }

  if (!status.isActive) {
    return (
      <CheckoutShell
        eyebrow="Checkout"
        title="Checkout still needs attention"
        description={SUBSCRIPTION_CONFIG.COPY.STATUS.INACTIVE_DESCRIPTION}
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild>
            <Link href={CATALOG_IMPORTER_RETURN_PATH}>Retry checkout</Link>
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
        eyebrow={SUBSCRIPTION_CONFIG.COPY.STATUS.ACTIVE_EYEBROW}
        title="Opening your import"
        description={SUBSCRIPTION_CONFIG.COPY.STATUS.ACTIVE_DESCRIPTION}
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
    <CheckoutAuthShell data-testid="checkout-clerk-sign-in">
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
    <CheckoutStatusPage
      eyebrow={eyebrow}
      title={title}
      description={description}
      testId="catalog-importer-checkout-success"
      actions={children}
    />
  );
}

function CheckoutAuthShell({
  children,
  "data-testid": testId,
}: {
  children: React.ReactNode;
  "data-testid"?: string;
}) {
  return (
    <div
      className="bg-muted/20"
      data-testid="catalog-importer-checkout-success"
    >
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-10 sm:gap-12 sm:py-16 lg:grid-cols-[minmax(0,1fr)_28rem] lg:px-8">
        <div className="flex max-w-2xl flex-col gap-3">
          <p className="text-xs font-semibold tracking-wide text-[#b7791f] uppercase">
            {SUBSCRIPTION_CONFIG.COPY.STATUS.ACTIVE_EYEBROW}
          </p>
          <h1 className="text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl">
            Verify your email to continue.
          </h1>
          <p className="text-muted-foreground max-w-xl text-base leading-7">
            Use the email from checkout. We will send your one-time login code.
            Your spreadsheet and progress remain in this browser.
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
