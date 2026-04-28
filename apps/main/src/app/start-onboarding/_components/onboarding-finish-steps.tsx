"use client";

import Link from "next/link";
import type { MouseEventHandler } from "react";
import { MessageCircle } from "lucide-react";
import { PRO_FEATURES } from "@/config/constants";
import { Button } from "@/components/ui/button";
import { SUBSCRIPTION_CONFIG } from "@/config/subscription-config";
import { OnboardingCheckoutButton } from "./onboarding-checkout-button";
import {
  ListingPreviewCard,
  OnboardingSectionCard,
  PreviewBullet,
  ProfilePreviewCard,
} from "./onboarding-preview-cards";

interface OnboardingBuyerContactPreviewStepProps {
  hybridizerYear: string | null;
  isHydrating: boolean;
  linkedLabel: string | null;
  listingDescription: string;
  listingImageUrl: string;
  listingPrice: number | null;
  listingTitle: string;
  onEditListing: () => void;
  onEditProfile: () => void;
  profileDescription: string;
  profileImageUrl: string;
  profileLocation: string;
  profileName: string;
}

export function OnboardingBuyerContactPreviewStep({
  hybridizerYear,
  isHydrating,
  linkedLabel,
  listingDescription,
  listingImageUrl,
  listingPrice,
  listingTitle,
  onEditListing,
  onEditProfile,
  profileDescription,
  profileImageUrl,
  profileLocation,
  profileName,
}: OnboardingBuyerContactPreviewStepProps) {
  return (
    <div className="space-y-6">
      {isHydrating ? (
        <div className="bg-background text-muted-foreground rounded-lg border p-4 text-sm">
          Loading your saved catalog and listing preview...
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid gap-6 lg:grid-cols-[repeat(2,minmax(0,24rem))] lg:justify-start">
            <div className="space-y-3">
              <p className="text-sm font-semibold">Catalog card preview</p>
              <div className="relative max-w-sm">
                <ProfilePreviewCard
                  title={profileName}
                  description={profileDescription}
                  imageUrl={profileImageUrl}
                  location={profileLocation}
                  variant="owned"
                  ownershipBadge="Yours"
                  footerAction={
                    <Button type="button" className="w-full lg:w-auto">
                      <MessageCircle className="h-4 w-4" />
                      Contact this seller
                    </Button>
                  }
                />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold">
                  Are you happy with your catalog card?
                </p>
                <p className="text-muted-foreground text-sm">
                  If not, go back and update your catalog card before
                  continuing.
                </p>
                <Button type="button" variant="outline" onClick={onEditProfile}>
                  Go back and edit catalog card
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold">Listing card preview</p>
              <div className="relative max-w-sm">
                <ListingPreviewCard
                  title={listingTitle}
                  description={listingDescription}
                  price={listingPrice}
                  linkedLabel={linkedLabel}
                  hybridizerYear={hybridizerYear}
                  imageUrl={listingImageUrl}
                  variant="owned"
                  ownershipBadge="Your listing"
                />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold">
                  Are you happy with your listing?
                </p>
                <p className="text-muted-foreground text-sm">
                  If not, go back and update your listing card before
                  continuing.
                </p>
                <Button type="button" variant="outline" onClick={onEditListing}>
                  Go back and edit listing card
                </Button>
              </div>
            </div>
          </div>

          <OnboardingSectionCard title="How buyers contact you">
            <p className="text-muted-foreground text-sm leading-relaxed">
              Buyers can contact you directly from your catalog, or add priced
              listings to cart and send one message with selected items.
            </p>
            <div className="space-y-2 text-sm">
              <PreviewBullet text="Path 1: Buyer opens your catalog and sends an email immediately." />
              <PreviewBullet text="Path 2: Buyer adds priced listings to cart, then sends one message with item details." />
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Buyers do not pay on Daylily Catalog. You arrange payment and
              shipping directly after inquiry.
            </p>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Your catalog and listings will not be publicly discoverable until
              you have an active trial or membership.
            </p>
          </OnboardingSectionCard>

          <OnboardingSectionCard title="Explore real examples">
            <div className="flex flex-col items-start gap-2 text-sm">
              <a
                href="/rollingoaksdaylilies"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary/80 block underline underline-offset-2"
              >
                See a real business catalog example
              </a>
              <a
                href="/cultivar/starman"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary/80 block underline underline-offset-2"
              >
                See a popular cultivar discovery page
              </a>
              <p className="text-muted-foreground text-xs">
                Public catalog updates can take up to 24 hours.
              </p>
            </div>
          </OnboardingSectionCard>
        </div>
      )}
    </div>
  );
}

interface MembershipPriceDisplay {
  amount: string;
  interval: string;
  monthlyEquivalent: string | null;
}

interface OnboardingMembershipStepProps {
  membershipPriceDisplay: MembershipPriceDisplay | null;
  onContinueForNow: MouseEventHandler<HTMLAnchorElement>;
}

export function OnboardingMembershipStep({
  membershipPriceDisplay,
  onContinueForNow,
}: OnboardingMembershipStepProps) {
  return (
    <div
      className="space-y-6"
      data-testid="onboarding-start-membership-step"
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,560px)] lg:items-start lg:gap-8">
        <div className="space-y-8 py-2 lg:py-6">
          <div className="space-y-4">
            <h2 className="text-5xl leading-[0.92] font-bold tracking-tight lg:text-7xl">
              <span className="block">Get found by daylily buyers.</span>
              <span className="block">
                Turn your catalog into a storefront.
              </span>
            </h2>
            <p className="text-muted-foreground max-w-xl text-2xl leading-tight lg:text-3xl">
              Publish a clean catalog under your seller name and appear in
              seller browsing, search, and cultivar pages where collectors
              research varieties.
            </p>
          </div>

          <div className="space-y-4">
            <OnboardingCheckoutButton
              size="lg"
              variant="default"
              className="h-12 w-full text-base font-semibold lg:w-auto lg:px-8"
              data-testid="start-membership-checkout"
              source="onboarding-membership-step"
            >
              Start {SUBSCRIPTION_CONFIG.FREE_TRIAL_DAYS}-day free trial
            </OnboardingCheckoutButton>

            <p className="text-muted-foreground text-sm">
              Then{" "}
              {membershipPriceDisplay
                ? `${membershipPriceDisplay.amount}${membershipPriceDisplay.interval}${
                    membershipPriceDisplay.monthlyEquivalent
                      ? ` (${membershipPriceDisplay.monthlyEquivalent}/mo)`
                      : ""
                  }`
                : "the starting Pro subscription price shown in Stripe subscription checkout before you confirm"}
              . Cancel anytime.
            </p>
            {SUBSCRIPTION_CONFIG.FREE_TRIAL_DAYS > 0 ? (
              <p className="text-muted-foreground text-xs">
                No charge now. You&apos;ll be charged after your{" "}
                {SUBSCRIPTION_CONFIG.FREE_TRIAL_DAYS}-day trial ends if you
                haven&apos;t canceled.
              </p>
            ) : null}
            {!membershipPriceDisplay ? (
              <p className="text-muted-foreground text-xs">
                You&apos;ll see the exact amount before any charge is made.
              </p>
            ) : null}

            <Link
              href="/dashboard"
              className="text-muted-foreground/70 hover:text-muted-foreground decoration-muted-foreground/40 inline-block text-xs underline underline-offset-2"
              data-testid="start-membership-continue"
              onClick={onContinueForNow}
            >
              Keep unlisted
            </Link>
          </div>
        </div>

        <div className="bg-card rounded-[2rem] border p-6 shadow-sm lg:p-10">
          <p className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
            Pro plan
          </p>

          {membershipPriceDisplay ? (
            <p
              className="mt-4 flex items-end gap-1 leading-none"
              data-testid="start-membership-price"
            >
              <span className="text-6xl font-bold tracking-tight lg:text-7xl">
                {membershipPriceDisplay.amount}
              </span>
              <span className="text-4xl font-semibold tracking-tight lg:text-5xl">
                {membershipPriceDisplay.interval}
              </span>
            </p>
          ) : (
            <p
              className="mt-4 text-4xl leading-tight font-semibold tracking-tight lg:text-5xl"
              data-testid="start-membership-price"
            >
              Starting price shown in Stripe
            </p>
          )}

          <p className="text-muted-foreground mt-3 text-lg">
            Secure subscription billing powered by Stripe.
          </p>

          {membershipPriceDisplay?.monthlyEquivalent ? (
            <p className="text-muted-foreground mt-1 text-base">
              {membershipPriceDisplay.monthlyEquivalent}/mo billed annually.
            </p>
          ) : null}

          <ul className="mt-8 space-y-5 text-2xl leading-tight">
            {PRO_FEATURES.map((feature) => {
              const Icon = feature.icon;

              return (
                <li key={feature.id} className="flex items-start gap-3">
                  <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                  <span>{feature.text}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
