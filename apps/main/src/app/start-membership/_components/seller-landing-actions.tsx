"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { SUBSCRIPTION_CONFIG } from "@/config/subscription-config";
import { capturePosthogEvent } from "@/lib/analytics/posthog";

const SELLER_LANDING_PATH = "/start-membership";
const ONBOARDING_PATH = SUBSCRIPTION_CONFIG.NEW_USER_ONBOARDING_PATH;

interface SellerLandingOnboardingCtaProps {
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
  const trackLandingViewed = useCallback(() => {
    capturePosthogEvent("seller_landing_viewed", {
      source_page_type: "seller_landing",
      source_path: SELLER_LANDING_PATH,
      target_path: SELLER_LANDING_PATH,
    });
  }, []);

  const trackSellerCtaClicked = useCallback(
    ({
      ctaId,
      ctaLabel,
      targetPath,
      nextPath,
    }: {
      ctaId: string;
      ctaLabel: string;
      targetPath: string;
      nextPath?: string;
    }) => {
      capturePosthogEvent("seller_cta_clicked", {
        source_page_type: "seller_landing",
        source_path: SELLER_LANDING_PATH,
        cta_id: ctaId,
        cta_label: ctaLabel,
        target_path: targetPath,
        next_path: nextPath,
      });
    },
    [],
  );

  const trackSellerExampleClicked = useCallback(
    ({
      ctaId,
      ctaLabel,
      href,
    }: {
      ctaId: string;
      ctaLabel: string;
      href: string;
    }) => {
      capturePosthogEvent("seller_example_clicked", {
        source_page_type: "seller_landing",
        source_path: SELLER_LANDING_PATH,
        cta_id: ctaId,
        cta_label: ctaLabel,
        target_path: href,
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
  const { trackLandingViewed } = useSellerLandingEvents();
  const hasTrackedViewRef = useRef(false);

  useEffect(() => {
    if (hasTrackedViewRef.current) {
      return;
    }

    hasTrackedViewRef.current = true;
    trackLandingViewed();
  }, [trackLandingViewed]);

  return null;
}

export function SellerLandingOnboardingCta({
  ctaId,
  ctaLabel,
  className,
  testId,
}: SellerLandingOnboardingCtaProps) {
  const { trackSellerCtaClicked } = useSellerLandingEvents();

  const startSellerOnboarding = () => {
    trackSellerCtaClicked({
      ctaId,
      ctaLabel,
      targetPath: ONBOARDING_PATH,
      nextPath: ONBOARDING_PATH,
    });
  };

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
  const { trackSellerExampleClicked } = useSellerLandingEvents();

  const trackExampleClick = () => {
    trackSellerExampleClicked({
      ctaId,
      ctaLabel,
      href,
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
