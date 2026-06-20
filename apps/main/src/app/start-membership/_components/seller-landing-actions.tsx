"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useCallback, useEffect, useRef, type ReactNode } from "react";
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
  children?: ReactNode;
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
    trackSellerExampleClicked,
  };
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
  const { trackSellerCtaClicked } = useSellerLandingEvents();

  const startSellerOnboarding = () => {
    trackSellerCtaClicked({
      ctaId,
      ctaLabel,
      targetPath: ONBOARDING_PATH,
      nextPath: ONBOARDING_PATH,
      isAuthenticated: Boolean(userId),
    });
  };

  if (!isLoaded) {
    return (
      <Button className={className} size="lg" aria-disabled="true">
        {ctaLabel}
      </Button>
    );
  }

  return (
    <Button asChild className={className} size="lg">
      <Link
        href={ONBOARDING_PATH}
        data-testid={testId}
        onClick={startSellerOnboarding}
      >
        {ctaLabel}
      </Link>
    </Button>
  );
}

export function SellerLandingExampleLink({
  ctaId,
  ctaLabel,
  href,
  className,
  testId,
  children,
}: SellerLandingExampleLinkProps) {
  const { userId } = useAuth();
  const { trackSellerExampleClicked } = useSellerLandingEvents();

  const trackExampleClick = () => {
    trackSellerExampleClicked({
      ctaId,
      ctaLabel,
      href,
      isAuthenticated: Boolean(userId),
    });
  };

  return (
    <Link
      href={href}
      className={className}
      data-testid={testId}
      onClick={trackExampleClick}
    >
      {children ?? ctaLabel}
    </Link>
  );
}
