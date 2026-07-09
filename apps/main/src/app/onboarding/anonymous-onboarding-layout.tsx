"use client";

import { useEffect, useRef } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ANONYMOUS_ONBOARDING_DRAFT_KEY } from "./anonymous-onboarding-draft";
import {
  ANONYMOUS_ONBOARDING_STEPS,
  type AnonymousOnboardingPageClientProps,
} from "./anonymous-onboarding-config";
import {
  CheckoutStep,
  EmailStep,
  ListingStep,
  PreviewStep,
  ProfileStep,
} from "./anonymous-onboarding-steps";
import {
  useAnonymousOnboardingController,
  type AnonymousOnboardingController,
} from "./use-anonymous-onboarding-controller";

export function AnonymousOnboardingPageClient(
  props: AnonymousOnboardingPageClientProps,
) {
  const controller = useAnonymousOnboardingController(props);
  const { draft, storageWarning } = controller;
  const stepContentRef = useRef<HTMLDivElement | null>(null);
  const previousStepRef = useRef(draft.step);

  useEffect(() => {
    if (previousStepRef.current === draft.step) {
      return;
    }

    previousStepRef.current = draft.step;
    const frame = window.requestAnimationFrame(() => {
      stepContentRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [draft.step]);

  return (
    <div
      className="bg-muted/20 min-h-svh"
      data-testid="anonymous-onboarding-page"
      data-draft-storage-key={ANONYMOUS_ONBOARDING_DRAFT_KEY}
    >
      <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-6 lg:px-8 lg:py-10">
        <AnonymousOnboardingHeader
          currentStepIndex={controller.currentStepIndex}
          draft={controller.draft}
          furthestStepIndex={controller.furthestStepIndex}
          goToStep={controller.goToStep}
          progressValue={controller.progressValue}
        />

        {storageWarning ? (
          <div className="text-foreground rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-4 text-sm">
            {storageWarning}
          </div>
        ) : null}

        <div
          ref={stepContentRef}
          className="scroll-mt-20 lg:scroll-mt-24"
          data-testid="anonymous-onboarding-step-content"
        >
          {draft.step === "email" ? (
            <EmailStep
              collectEmail={controller.collectEmail}
              emailInput={controller.emailInput}
              emailIsValid={controller.emailIsValid}
              saveEmailAndContinue={controller.saveEmailAndContinue}
              setEmailInput={controller.setEmailInput}
            />
          ) : null}
          {draft.step === "profile" ? (
            <ProfileStep
              applyStarterNameOverlay={controller.applyStarterNameOverlay}
              clearProfileImage={controller.clearProfileImage}
              draft={controller.draft}
              imageError={controller.imageError}
              isGeneratingStarterProfileImage={
                controller.isGeneratingStarterProfileImage
              }
              profileImageInputMode={controller.profileImageInputMode}
              profilePreview={controller.profilePreview}
              selectStarterProfileImage={controller.selectStarterProfileImage}
              selectedStarterProfileImageUrl={
                controller.selectedStarterProfileImageUrl
              }
              setApplyStarterNameOverlay={controller.setApplyStarterNameOverlay}
              setDraft={controller.setDraft}
              setImageError={controller.setImageError}
              setProfileImageInputMode={controller.setProfileImageInputMode}
              updateProfileGardenName={controller.updateProfileGardenName}
              updateProfileImage={controller.updateProfileImage}
            />
          ) : null}
          {draft.step === "listing" ? (
            <ListingStep
              draft={controller.draft}
              exampleCultivars={controller.exampleCultivars}
              imageError={controller.imageError}
              listingPreview={controller.listingPreview}
              setDraft={controller.setDraft}
              setImageError={controller.setImageError}
              updateListingImage={controller.updateListingImage}
            />
          ) : null}
          {draft.step === "preview" ? (
            <PreviewStep
              draft={controller.draft}
              goToStep={controller.goToStep}
              listingPreview={controller.listingPreview}
              profilePreview={controller.profilePreview}
            />
          ) : null}
          {draft.step === "checkout" ? (
            <CheckoutStep
              createCheckout={controller.createCheckout}
              draft={controller.draft}
              emailInput={controller.emailInput}
              emailIsValid={controller.emailIsValid}
              isEditingCheckoutEmail={controller.isEditingCheckoutEmail}
              membershipPriceDisplay={controller.membershipPriceDisplay}
              saveEmailAndContinue={controller.saveEmailAndContinue}
              setEmailInput={controller.setEmailInput}
              setIsEditingCheckoutEmail={controller.setIsEditingCheckoutEmail}
              startCheckout={controller.startCheckout}
            />
          ) : null}
        </div>

        {draft.step !== "email" && draft.step !== "checkout" ? (
          <AnonymousOnboardingFooter
            collectEmail={controller.collectEmail}
            currentStepIndex={controller.currentStepIndex}
            draft={controller.draft}
            emailIsValid={controller.emailIsValid}
            goBack={controller.goBack}
            goForward={controller.goForward}
          />
        ) : null}
      </div>
    </div>
  );
}

type AnonymousOnboardingHeaderProps = Pick<
  AnonymousOnboardingController,
  | "currentStepIndex"
  | "draft"
  | "furthestStepIndex"
  | "goToStep"
  | "progressValue"
>;

function AnonymousOnboardingHeader({
  currentStepIndex,
  draft,
  furthestStepIndex,
  goToStep,
  progressValue,
}: AnonymousOnboardingHeaderProps) {
  const currentStep = ANONYMOUS_ONBOARDING_STEPS[currentStepIndex]!;

  return (
    <header className="space-y-4">
      <div className="space-y-3">
        <Badge variant="secondary" className="w-fit">
          Guided onboarding
        </Badge>
        <h1 className="text-3xl font-semibold tracking-tight lg:text-5xl">
          Build your catalog in minutes.
        </h1>
        <p className="text-muted-foreground max-w-3xl text-base lg:text-lg">
          We&apos;ll walk through profile setup and your first listing so buyers
          can discover you before you get started in the dashboard. This takes
          about 2 minutes, and you can edit everything later.
        </p>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 lg:items-center">
          <p className="text-lg leading-tight font-semibold lg:text-xl">
            {currentStep.title}
          </p>
          <Badge
            variant="outline"
            className="mt-0.5 text-xs whitespace-nowrap lg:mt-0"
          >
            Step {currentStepIndex + 1} of {ANONYMOUS_ONBOARDING_STEPS.length}
          </Badge>
        </div>
      </div>

      <Progress value={progressValue} className="h-2" />

      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {ANONYMOUS_ONBOARDING_STEPS.map((step, index) => {
          const isCurrent = step.id === draft.step;
          const isComplete = index < furthestStepIndex;
          const canOpen = index <= furthestStepIndex;

          return (
            <button
              key={step.id}
              type="button"
              disabled={!canOpen || isCurrent}
              aria-current={isCurrent ? "step" : undefined}
              className="focus-visible:ring-ring disabled:text-muted-foreground/50 data-[current=true]:border-primary data-[current=true]:bg-primary/10 data-[current=true]:text-primary shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:ring-1 focus-visible:outline-none disabled:cursor-not-allowed data-[complete=true]:border-emerald-500/40 data-[complete=true]:bg-emerald-500/10 data-[complete=true]:text-emerald-700"
              data-current={isCurrent}
              data-complete={isComplete}
              data-testid={`anonymous-onboarding-step-${step.id}`}
              onClick={() => goToStep(step.id)}
            >
              <span className="inline-flex items-center gap-1.5">
                {isComplete ? <CheckCircle2 className="size-3.5" /> : null}
                <span className="lg:hidden">{index + 1}</span>
                <span className="hidden lg:inline">{step.chipLabel}</span>
              </span>
            </button>
          );
        })}
      </div>
    </header>
  );
}

type AnonymousOnboardingFooterProps = Pick<
  AnonymousOnboardingController,
  | "collectEmail"
  | "currentStepIndex"
  | "draft"
  | "emailIsValid"
  | "goBack"
  | "goForward"
>;

function AnonymousOnboardingFooter({
  collectEmail,
  currentStepIndex,
  draft,
  emailIsValid,
  goBack,
  goForward,
}: AnonymousOnboardingFooterProps) {
  const currentStep = ANONYMOUS_ONBOARDING_STEPS[currentStepIndex]!;

  return (
    <footer className="border-t pt-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          {currentStep.description}
        </p>
        <div className="flex items-center gap-2">
          {currentStepIndex > 0 ? (
            <Button type="button" variant="outline" onClick={goBack}>
              Back
            </Button>
          ) : null}

          <Button
            type="button"
            onClick={() => void goForward()}
            disabled={
              draft.step === "email" &&
              (!emailIsValid || collectEmail.isPending)
            }
            data-testid="anonymous-onboarding-primary-action"
          >
            Continue
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </div>

    </footer>
  );
}
