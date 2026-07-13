"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, CheckCircle2, CreditCard, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SUBSCRIPTION_CONFIG } from "@/config/subscription-config";
import type { AnonymousOnboardingController } from "./use-anonymous-onboarding-controller";

type EmailStepProps = Pick<
  AnonymousOnboardingController,
  | "collectEmail"
  | "draft"
  | "emailInput"
  | "emailIsValid"
  | "saveEmailAndContinue"
  | "setEmailInput"
>;

export function EmailStep({
  collectEmail,
  draft,
  emailInput,
  emailIsValid,
  saveEmailAndContinue,
  setEmailInput,
}: EmailStepProps) {
  const [emailWasBlurred, setEmailWasBlurred] = useState(false);
  const showEmailError = emailWasBlurred && !emailIsValid;

  return (
    <form
      className="mx-auto grid max-w-5xl gap-10 md:grid-cols-[1fr_0.8fr] md:items-start"
      onSubmit={(event) => {
        event.preventDefault();
        void saveEmailAndContinue("initial");
      }}
    >
      <div className="space-y-5">
        <div className="space-y-2">
          <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">
            Save the catalog you just shaped.
          </h2>
          <p className="text-muted-foreground max-w-xl text-sm leading-relaxed">
            We will use this email for checkout and your login code. Nothing is
            public yet.
          </p>
        </div>

        <div className="max-w-md space-y-2">
          <Label htmlFor="anonymous-onboarding-email">Email address</Label>
          <Input
            id="anonymous-onboarding-email"
            name="email"
            data-testid="anonymous-onboarding-email"
            data-1p-ignore="true"
            data-bwignore="true"
            data-lpignore="true"
            type="email"
            required
            autoComplete="email"
            value={emailInput}
            onChange={(event) => setEmailInput(event.target.value)}
            onBlur={() => setEmailWasBlurred(true)}
            aria-invalid={showEmailError}
            aria-describedby={
              showEmailError ? "anonymous-onboarding-email-error" : undefined
            }
            placeholder="you@example.com"
          />
          {showEmailError ? (
            <p
              id="anonymous-onboarding-email-error"
              className="text-destructive text-sm"
              role="alert"
            >
              Enter a valid email address.
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button
            type="submit"
            disabled={!emailIsValid || collectEmail.isPending}
            data-testid="anonymous-onboarding-email-submit"
          >
            Save and continue
            <ArrowRight className="size-4" />
          </Button>
          <Button asChild variant="outline">
            <Link href="/sign-in">Already have an account? Log in</Link>
          </Button>
        </div>
      </div>

      <aside className="border-y border-[#cbd4c8] py-5">
        <p className="text-xs font-bold tracking-[0.16em] text-[#a94e38] uppercase">
          Your preview
        </p>
        <p className="ph-mask mt-3 text-xl font-semibold text-[#142118]">
          {draft.profile.gardenName}
        </p>
        <dl className="mt-5 divide-y divide-[#d8dfd2] text-sm">
          <div className="flex justify-between gap-4 py-3">
            <dt className="text-[#657267]">Cultivars enriched</dt>
            <dd className="font-semibold">{draft.collection.length}</dd>
          </div>
          <div className="flex justify-between gap-4 py-3">
            <dt className="text-[#657267]">You tried</dt>
            <dd className="text-right font-semibold">
              Listings, buyer search, sharing
            </dd>
          </div>
          <div className="py-3 text-[#657267]">
            The sample listings stay private and disposable. Your garden name is
            the only preview detail carried into the new account.
          </div>
        </dl>
      </aside>
    </form>
  );
}

type CheckoutStepProps = Pick<
  AnonymousOnboardingController,
  | "createCheckout"
  | "currentStepCanContinue"
  | "draft"
  | "emailInput"
  | "emailIsValid"
  | "isEditingCheckoutEmail"
  | "membershipPriceDisplay"
  | "saveEmailAndContinue"
  | "setEmailInput"
  | "setIsEditingCheckoutEmail"
  | "startCheckout"
>;

export function CheckoutStep({
  createCheckout,
  currentStepCanContinue,
  draft,
  emailInput,
  emailIsValid,
  isEditingCheckoutEmail,
  membershipPriceDisplay,
  saveEmailAndContinue,
  setEmailInput,
  setIsEditingCheckoutEmail,
  startCheckout,
}: CheckoutStepProps) {
  return (
    <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_minmax(280px,380px)] lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
      <div className="space-y-7">
        <div className="space-y-2">
          <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">
            Publish when you are ready to start your trial.
          </h2>
          <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">
            Review your account email, membership, and what happens after
            checkout before starting your trial.
          </p>
        </div>

        <div className="max-w-xl border-y border-[#cbd4c8] py-5">
          {isEditingCheckoutEmail ? (
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                void saveEmailAndContinue("pre_checkout_review");
              }}
            >
              <Label htmlFor="anonymous-checkout-email">Account email</Label>
              <Input
                id="anonymous-checkout-email"
                name="email"
                data-testid="anonymous-checkout-email"
                data-1p-ignore="true"
                data-bwignore="true"
                data-lpignore="true"
                type="email"
                required
                autoComplete="email"
                value={emailInput}
                onChange={(event) => setEmailInput(event.target.value)}
              />
              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={!emailIsValid}
                  data-testid="anonymous-checkout-email-save"
                >
                  Save email
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEmailInput(draft.email ?? "");
                    setIsEditingCheckoutEmail(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="min-w-0">
                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Account email
                </p>
                <p
                  className="ph-mask text-lg font-semibold break-all"
                  data-testid="anonymous-checkout-email-value"
                >
                  {draft.email}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-fit"
                onClick={() => setIsEditingCheckoutEmail(true)}
              >
                <Pencil className="size-4" />
                Edit email
              </Button>
            </div>
          )}
        </div>

        <Button
          type="button"
          size="lg"
          disabled={
            createCheckout.isPending ||
            isEditingCheckoutEmail ||
            !currentStepCanContinue
          }
          onClick={() => void startCheckout()}
          data-testid="anonymous-onboarding-checkout"
        >
          <CreditCard className="size-4" />
          Start my trial and open the dashboard
        </Button>

        {createCheckout.error ? (
          <p className="text-destructive text-sm">
            {createCheckout.error.message}
          </p>
        ) : null}
      </div>

      <aside className="h-fit border-y border-[#cbd4c8] py-6">
        <p className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
          Grower membership
        </p>
        <p className="mt-4 text-5xl leading-none font-bold tracking-tight">
          {membershipPriceDisplay.amount}
          {membershipPriceDisplay.interval}
        </p>
        <p className="text-muted-foreground mt-4 text-sm leading-relaxed">
          Start with a {SUBSCRIPTION_CONFIG.FREE_TRIAL_DAYS}-day free trial. We
          will add your garden name to the dashboard after you verify your
          email.
        </p>
        <div className="mt-5 space-y-3 border-t border-[#d8dfd2] pt-5 text-sm">
          <p className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
            Your garden name imports after checkout and email verification.
          </p>
          <p className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
            The sample listings do not import; add real daylilies from the
            dashboard.
          </p>
          <p className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
            Buyers contact you directly. You keep control of payment and
            shipping.
          </p>
        </div>
      </aside>
    </div>
  );
}
