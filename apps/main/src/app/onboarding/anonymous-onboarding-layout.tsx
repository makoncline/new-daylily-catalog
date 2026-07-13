"use client";

import { useEffect, useRef } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { ANONYMOUS_ONBOARDING_DRAFT_KEY } from "./anonymous-onboarding-draft";
import {
  ANONYMOUS_ONBOARDING_STEPS,
  type AnonymousOnboardingPageClientProps,
} from "./anonymous-onboarding-config";
import { CheckoutStep, EmailStep } from "./anonymous-onboarding-steps";
import {
  PersonalizeStep,
  WorkflowStep,
} from "./anonymous-onboarding-persuasion-steps";
import {
  BuyerExperienceStep,
  CollectionEnrichmentStep,
  CultivarCollectionStep,
  ListingsWorkspaceStep,
} from "./anonymous-onboarding-product-steps";
import {
  useAnonymousOnboardingController,
  type AnonymousOnboardingController,
} from "./use-anonymous-onboarding-controller";

export function AnonymousOnboardingPageClient(
  props: AnonymousOnboardingPageClientProps,
) {
  const controller = useAnonymousOnboardingController(props);
  const { draft, storageWarning } = controller;
  const previousStepRef = useRef(draft.step);

  useEffect(() => {
    if (previousStepRef.current === draft.step) return;
    previousStepRef.current = draft.step;
    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({
        behavior: "instant",
        top: 0,
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [draft.step]);

  return (
    <div
      className="min-h-svh bg-[radial-gradient(circle_at_top_left,rgba(244,196,119,0.16),transparent_30%),linear-gradient(180deg,#fbfaf4_0%,#f5f4ec_100%)] text-[#142118]"
      data-testid="anonymous-onboarding-page"
      data-draft-storage-key={ANONYMOUS_ONBOARDING_DRAFT_KEY}
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-4 pb-24 sm:px-6 md:py-7 lg:px-8">
        <AnonymousOnboardingHeader controller={controller} />

        {storageWarning ? (
          <div className="rounded-2xl border border-yellow-600/30 bg-yellow-50 p-4 text-sm">
            {storageWarning}
          </div>
        ) : null}

        <main
          className="mt-8 md:mt-12"
          data-testid="anonymous-onboarding-step-content"
        >
          <OnboardingStepContent controller={controller} />
        </main>

        {controller.draftIsHydrated &&
        !["email", "checkout"].includes(draft.step) ? (
          <AnonymousOnboardingFooter controller={controller} />
        ) : null}
      </div>
    </div>
  );
}

function OnboardingStepContent({
  controller,
}: {
  controller: AnonymousOnboardingController;
}) {
  const { draft } = controller;

  if (!controller.draftIsHydrated) {
    return (
      <div
        className="flex min-h-72 items-center justify-center text-center text-sm text-[#526157]"
        role="status"
      >
        Loading your saved catalog preview…
      </div>
    );
  }

  if (draft.step === "workflow") return <WorkflowStep {...controller} />;
  if (draft.step === "buyer-need")
    return <CultivarCollectionStep {...controller} />;
  if (draft.step === "problem")
    return <CollectionEnrichmentStep draft={draft} />;
  // Keep the persisted step id for draft compatibility; real_product_v2 uses
  // the production-shaped listings workspace instead of the retired demo tour.
  if (draft.step === "search-tour")
    return <ListingsWorkspaceStep {...controller} />;
  if (draft.step === "personalize") return <PersonalizeStep {...controller} />;
  if (draft.step === "email") {
    return (
      <EmailStep
        collectEmail={controller.collectEmail}
        draft={draft}
        emailInput={controller.emailInput}
        emailIsValid={controller.emailIsValid}
        saveEmailAndContinue={controller.saveEmailAndContinue}
        setEmailInput={controller.setEmailInput}
      />
    );
  }
  if (draft.step === "proof") {
    return <BuyerExperienceStep {...controller} />;
  }
  return (
    <CheckoutStep
      createCheckout={controller.createCheckout}
      currentStepCanContinue={controller.currentStepCanContinue}
      draft={draft}
      emailInput={controller.emailInput}
      emailIsValid={controller.emailIsValid}
      isEditingCheckoutEmail={controller.isEditingCheckoutEmail}
      membershipPriceDisplay={controller.membershipPriceDisplay}
      saveEmailAndContinue={controller.saveEmailAndContinue}
      setEmailInput={controller.setEmailInput}
      setIsEditingCheckoutEmail={controller.setIsEditingCheckoutEmail}
      startCheckout={controller.startCheckout}
    />
  );
}

function getPhase(index: number) {
  if (index === 0) return { label: "Your needs", number: 1 };
  if (index <= 5) return { label: "Build your preview", number: 2 };
  return { label: "Start your trial", number: 3 };
}

function AnonymousOnboardingHeader({
  controller,
}: {
  controller: AnonymousOnboardingController;
}) {
  const {
    currentStepIndex,
    draft,
    furthestStepIndex,
    goToStep,
    progressValue,
  } = controller;
  const currentStep = ANONYMOUS_ONBOARDING_STEPS[currentStepIndex]!;
  const phase = getPhase(currentStepIndex);

  return (
    <header className="border-b border-[#cbd4c8] pb-5 md:pb-7">
      <div className="flex justify-end">
        <Badge variant="outline" className="border-[#b9c6b8] text-[#536357]">
          Phase {phase.number} of 3 · {phase.label}
        </Badge>
      </div>

      <div className="mt-5 grid gap-2 md:mt-7 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="text-sm font-semibold text-[#a94e38]">
            {currentStep.title}
          </p>
          <h1 className="mt-1 hidden max-w-3xl text-3xl leading-tight font-semibold tracking-tight md:block md:text-4xl">
            From a plain collection list to a catalog buyers want to explore.
          </h1>
        </div>
        <p className="max-w-sm text-sm leading-5 text-[#657267] md:leading-6">
          {currentStep.description}
        </p>
      </div>

      <Progress value={progressValue} className="mt-5 h-1 bg-[#e1e5dc]" />

      <div className="mt-2 flex items-center justify-between text-xs md:hidden">
        <span className="font-medium text-[#a94e38]">
          {currentStep.chipLabel}
        </span>
        <span className="text-[#657267]">
          Step {currentStepIndex + 1} of {ANONYMOUS_ONBOARDING_STEPS.length}
        </span>
      </div>

      <div className="mt-3 hidden gap-4 overflow-x-auto pb-1 [scrollbar-width:none] md:flex [&::-webkit-scrollbar]:hidden">
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
              data-testid={`anonymous-onboarding-step-${step.id}`}
              onClick={() => goToStep(step.id)}
              className={cn(
                "shrink-0 border-b px-0 py-1 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-[#b7791f] focus-visible:outline-none disabled:cursor-not-allowed",
                isCurrent
                  ? "border-[#a94e38] text-[#142118]"
                  : isComplete
                    ? "border-transparent text-[#536357]"
                    : "border-transparent text-[#9aa49a]",
              )}
            >
              <span className="inline-flex items-center gap-1.5">
                {step.chipLabel}
              </span>
            </button>
          );
        })}
      </div>
    </header>
  );
}

function AnonymousOnboardingFooter({
  controller,
}: {
  controller: AnonymousOnboardingController;
}) {
  const { currentStepIndex, currentStepCanContinue, goBack, goForward, draft } =
    controller;
  const nextLabels: Partial<Record<typeof draft.step, string>> = {
    workflow: "Find my cultivars",
    "buyer-need": "Transform my collection",
    problem: "Open my private listings workspace",
    "search-tour": "Try the buyer experience",
    proof: "Name my catalog",
    personalize: "Save my private preview",
  };

  return (
    <footer className="mt-10 flex items-center justify-between gap-3 border-t border-[#cbd4c8] py-4">
      <div>
        {currentStepIndex > 0 ? (
          <Button type="button" variant="ghost" onClick={goBack}>
            <ArrowLeft className="size-4" />
            Back
          </Button>
        ) : null}
      </div>
      <Button
        type="button"
        onClick={() => void goForward()}
        disabled={!currentStepCanContinue}
        data-testid="anonymous-onboarding-primary-action"
      >
        {nextLabels[draft.step] ?? "Continue"}
        <ArrowRight className="size-4" />
      </Button>
    </footer>
  );
}
