"use client";

import { SignUpButton, useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { SUBSCRIPTION_CONFIG } from "@/config/subscription-config";
import { capturePosthogEvent } from "@/lib/analytics/posthog";

const SELLER_LANDING_PATH = "/start-membership";
const ONBOARDING_PATH = SUBSCRIPTION_CONFIG.NEW_USER_ONBOARDING_PATH;

interface SellerLandingAuthCtaProps {
  ctaId: string;
  ctaLabel: string;
  className?: string;
  testId?: string;
}

interface SellerLandingExampleLinkProps {
  ctaId: string;
  ctaLabel: string;
  href: string;
  className?: string;
  testId?: string;
}

function useSellerLandingEvents() {
  const trackLandingViewed = useCallback((isAuthenticated: boolean) => {
    capturePosthogEvent("seller_landing_viewed", {
      source_page_type: "seller_landing",
      source_path: SELLER_LANDING_PATH,
      target_path: SELLER_LANDING_PATH,
      is_authenticated: isAuthenticated,
    });
  }, []);

  const trackSellerCtaClicked = useCallback(
    ({
      ctaId,
      ctaLabel,
      targetPath,
      isAuthenticated,
      nextPath,
    }: {
      ctaId: string;
      ctaLabel: string;
      targetPath: string;
      isAuthenticated: boolean;
      nextPath?: string;
    }) => {
      capturePosthogEvent("seller_cta_clicked", {
        source_page_type: "seller_landing",
        source_path: SELLER_LANDING_PATH,
        cta_id: ctaId,
        cta_label: ctaLabel,
        target_path: targetPath,
        next_path: nextPath,
        is_authenticated: isAuthenticated,
      });
    },
    [],
  );

  const trackAuthStarted = useCallback(
    ({
      ctaId,
      ctaLabel,
      nextPath,
    }: {
      ctaId: string;
      ctaLabel: string;
      nextPath: string;
    }) => {
      capturePosthogEvent("auth_started", {
        source_page_type: "seller_landing",
        source_path: SELLER_LANDING_PATH,
        cta_id: ctaId,
        cta_label: ctaLabel,
        target_path: nextPath,
        next_path: nextPath,
        is_authenticated: false,
      });
    },
    [],
  );

  const trackSellerExampleClicked = useCallback(
    ({
      ctaId,
      ctaLabel,
      href,
      isAuthenticated,
    }: {
      ctaId: string;
      ctaLabel: string;
      href: string;
      isAuthenticated: boolean;
    }) => {
      capturePosthogEvent("seller_example_clicked", {
        source_page_type: "seller_landing",
        source_path: SELLER_LANDING_PATH,
        cta_id: ctaId,
        cta_label: ctaLabel,
        target_path: href,
        is_authenticated: isAuthenticated,
      });
    },
    [],
  );

  return {
    trackLandingViewed,
    trackSellerCtaClicked,
    trackAuthStarted,
    trackSellerExampleClicked,
  };
}

interface SellerLandingCtaVariantProps {
  ctaLabel: string;
  className?: string;
  testId?: string;
  onClick: () => void;
}

function SellerLandingAuthCtaLoading({
  ctaLabel,
  className,
}: Pick<SellerLandingCtaVariantProps, "ctaLabel" | "className">) {
  return (
    <Button className={className} size="lg" disabled>
      {ctaLabel}
    </Button>
  );
}

function SellerLandingAuthCtaSignedIn({
  ctaLabel,
  className,
  testId,
  onClick,
}: SellerLandingCtaVariantProps) {
  return (
    <Button asChild className={className} size="lg">
      <Link href={ONBOARDING_PATH} data-testid={testId} onClick={onClick}>
        {ctaLabel}
      </Link>
    </Button>
  );
}

function SellerLandingAuthCtaSignedOut({
  ctaLabel,
  className,
  testId,
  onClick,
}: SellerLandingCtaVariantProps) {
  return (
    <SignUpButton
      mode="modal"
      forceRedirectUrl={ONBOARDING_PATH}
      signInForceRedirectUrl={ONBOARDING_PATH}
    >
      <Button className={className} size="lg" data-testid={testId} onClick={onClick}>
        {ctaLabel}
      </Button>
    </SignUpButton>
  );
}

export function SellerLandingViewTracker() {
  const { isLoaded, userId } = useAuth();
  const { trackLandingViewed } = useSellerLandingEvents();
  const hasTrackedViewRef = useRef(false);

  useEffect(() => {
    if (!isLoaded || hasTrackedViewRef.current) {
      return;
    }

    hasTrackedViewRef.current = true;
    trackLandingViewed(Boolean(userId));
  }, [isLoaded, trackLandingViewed, userId]);

  return null;
}

export function SellerLandingAuthCta({
  ctaId,
  ctaLabel,
  className,
  testId,
}: SellerLandingAuthCtaProps) {
  const { isLoaded, userId } = useAuth();
  const { trackAuthStarted, trackSellerCtaClicked } = useSellerLandingEvents();

  const handleClick = () => {
    trackSellerCtaClicked({
      ctaId,
      ctaLabel,
      targetPath: ONBOARDING_PATH,
      nextPath: ONBOARDING_PATH,
      isAuthenticated: Boolean(userId),
    });

    if (!userId) {
      trackAuthStarted({
        ctaId,
        ctaLabel,
        nextPath: ONBOARDING_PATH,
      });
    }
  };

  if (!isLoaded) {
    return <SellerLandingAuthCtaLoading ctaLabel={ctaLabel} className={className} />;
  }

  if (userId) {
    return (
      <SellerLandingAuthCtaSignedIn
        ctaLabel={ctaLabel}
        className={className}
        testId={testId}
        onClick={handleClick}
      />
    );
  }

  return (
    <SellerLandingAuthCtaSignedOut
      ctaLabel={ctaLabel}
      className={className}
      testId={testId}
      onClick={handleClick}
    />
  );
}

export function SellerLandingExampleLink({
  ctaId,
  ctaLabel,
  href,
  className,
  testId,
}: SellerLandingExampleLinkProps) {
  const { userId } = useAuth();
  const { trackSellerExampleClicked } = useSellerLandingEvents();

  const handleClick = () => {
    trackSellerExampleClicked({
      ctaId,
      ctaLabel,
      href,
      isAuthenticated: Boolean(userId),
    });
  };

  return (
    <Link href={href} className={className} data-testid={testId} onClick={handleClick}>
      {ctaLabel}
    </Link>
  );
}

