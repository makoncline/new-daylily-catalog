"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { api } from "@/trpc/react";
import {
  capturePosthogEvent,
  getPosthogDistinctId,
  preloadPosthog,
  startOnboardingSessionRecording,
} from "@/lib/analytics/posthog";
import { ANONYMOUS_ONBOARDING_FLOW_VERSION } from "./anonymous-onboarding-draft";
import {
  ANONYMOUS_ONBOARDING_STEPS,
  normalizeEmail,
  type AnonymousOnboardingPageClientProps,
} from "./anonymous-onboarding-config";
import {
  createAnonymousOnboardingId,
  createAnonymousOnboardingDraft,
  readAnonymousOnboardingDraft,
  writeAnonymousOnboardingDraft,
  type AnonymousOnboardingDraft,
  type AnonymousOnboardingCollectionItem,
} from "./anonymous-onboarding-draft";
import type {
  AnonymousOnboardingCatalogSize,
  AnonymousOnboardingStepId,
  AnonymousOnboardingWorkflow,
} from "./anonymous-onboarding-draft";

function readOnboardingStep(value: string | null) {
  return ANONYMOUS_ONBOARDING_STEPS.find((step) => step.id === value)?.id;
}

function migrateRemovedOnboardingStep(step: AnonymousOnboardingStepId) {
  switch (step) {
    case "catalog-size":
      return "workflow";
    case "listing-demo":
      return "proof";
    case "profile":
      return "personalize";
    case "buyer-preview":
      return "email";
    default:
      return step;
  }
}

function getOnboardingStepIndex(step: AnonymousOnboardingStepId) {
  return ANONYMOUS_ONBOARDING_STEPS.findIndex((item) => item.id === step);
}

export function useAnonymousOnboardingController({
  membershipPriceDisplay,
}: AnonymousOnboardingPageClientProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [draft, setDraftState] = useState(() =>
    createAnonymousOnboardingDraft(),
  );
  const draftRef = useRef(draft);
  const hasHydratedDraftRef = useRef(false);
  const [draftIsHydrated, setDraftIsHydrated] = useState(false);
  const analyticsDistinctIdRef = useRef<string | null>(null);
  const entryTrackedRef = useRef(false);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);

  const setDraft = useCallback(
    (
      updater:
        | AnonymousOnboardingDraft
        | ((draft: AnonymousOnboardingDraft) => AnonymousOnboardingDraft),
    ) => {
      const currentDraft = draftRef.current;
      const nextDraft =
        typeof updater === "function" ? updater(currentDraft) : updater;
      draftRef.current = nextDraft;
      const didPersist = writeAnonymousOnboardingDraft(nextDraft);
      setDraftState(nextDraft);
      setStorageWarning(
        didPersist
          ? null
          : "Your browser did not save this draft. You can keep going, but you may need to re-enter details if you leave this page.",
      );
    },
    [],
  );

  const [emailInputOverride, setEmailInputOverride] = useState<string | null>(
    null,
  );
  const [isEditingCheckoutEmail, setIsEditingCheckoutEmail] = useState(false);
  const collectEmail = api.onboarding.collectEmail.useMutation();
  const createCheckout = api.onboarding.createCheckout.useMutation();
  const [cultivarQuery, setCultivarQuery] = useState("");
  const normalizedCultivarQuery = cultivarQuery.trim();
  const [debouncedCultivarQuery, setDebouncedCultivarQuery] = useState("");
  useEffect(() => {
    const timeout = window.setTimeout(
      () => setDebouncedCultivarQuery(normalizedCultivarQuery),
      300,
    );
    return () => window.clearTimeout(timeout);
  }, [normalizedCultivarQuery]);
  const cultivarSearch = api.onboarding.searchCultivars.useQuery(
    { query: debouncedCultivarQuery },
    {
      enabled: debouncedCultivarQuery.length >= 3,
      staleTime: 5 * 60 * 1000,
    },
  );
  const cultivarSearchData = cultivarSearch.data;

  const buildStepUrl = useCallback(
    (step: AnonymousOnboardingStepId) => {
      const nextSearchParams = new URLSearchParams(searchParams.toString());
      nextSearchParams.set("step", step);
      return `${pathname}?${nextSearchParams.toString()}`;
    },
    [pathname, searchParams],
  );

  useEffect(() => {
    if (!draftIsHydrated) return;
    preloadPosthog();
    startOnboardingSessionRecording();
    void getPosthogDistinctId()
      .then((distinctId) => {
        analyticsDistinctIdRef.current = distinctId;
      })
      .catch(() => undefined);
    if (entryTrackedRef.current) return;
    entryTrackedRef.current = true;
    capturePosthogEvent("onboarding_entry_viewed", {
      flow_version: ANONYMOUS_ONBOARDING_FLOW_VERSION,
      draft_id: draftRef.current.draftId,
      step_id: draftRef.current.step,
      is_resumed: draftRef.current.updatedAt !== draftRef.current.createdAt,
    });
  }, [draftIsHydrated]);

  useEffect(() => {
    if (!draftIsHydrated) return;
    const currentDraft = draftRef.current;
    const stepVisitId = createAnonymousOnboardingId();
    const startedAt = performance.now();
    const stepIndex = getOnboardingStepIndex(currentDraft.step);
    const sharedProperties = {
      flow_version: ANONYMOUS_ONBOARDING_FLOW_VERSION,
      draft_id: currentDraft.draftId,
      step_id: currentDraft.step,
      step_index: stepIndex + 1,
      total_steps: ANONYMOUS_ONBOARDING_STEPS.length,
      step_visit_id: stepVisitId,
      workflow: currentDraft.workflow,
      catalog_size: currentDraft.catalogSize,
      buyer_need: currentDraft.buyerNeed,
    };
    capturePosthogEvent("onboarding_step_viewed", sharedProperties);
    return () => {
      capturePosthogEvent("onboarding_step_exited", {
        ...sharedProperties,
        elapsed_ms: Math.round(performance.now() - startedAt),
        exit_reason: "step_changed_or_page_hidden",
      });
    };
  }, [draft.step, draftIsHydrated]);

  useEffect(() => {
    if (hasHydratedDraftRef.current) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      if (hasHydratedDraftRef.current) return;
      hasHydratedDraftRef.current = true;

      const storedDraft = readAnonymousOnboardingDraft();
      const requestedStep = readOnboardingStep(searchParams.get("step"));
      const storedStep = migrateRemovedOnboardingStep(storedDraft.step);
      const storedFurthestStep = migrateRemovedOnboardingStep(
        storedDraft.furthestStep,
      );
      const requestedStepIndex = requestedStep
        ? getOnboardingStepIndex(requestedStep)
        : -1;
      const furthestStepIndex = getOnboardingStepIndex(storedFurthestStep);
      const initialStep =
        requestedStep && requestedStepIndex <= furthestStepIndex
          ? requestedStep
          : storedStep;
      const hydratedDraft = {
        ...storedDraft,
        step: initialStep,
        furthestStep: storedFurthestStep,
      };

      draftRef.current = hydratedDraft;
      setDraftState(hydratedDraft);
      setDraftIsHydrated(true);
      if (requestedStep !== initialStep) {
        window.history.replaceState(null, "", buildStepUrl(initialStep));
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [buildStepUrl, searchParams]);

  useEffect(() => {
    if (!hasHydratedDraftRef.current) {
      return;
    }

    const requestedStep = readOnboardingStep(searchParams.get("step"));
    if (requestedStep === draftRef.current.step) {
      return;
    }

    if (
      !requestedStep ||
      getOnboardingStepIndex(requestedStep) >
        getOnboardingStepIndex(draftRef.current.furthestStep)
    ) {
      window.history.replaceState(
        null,
        "",
        buildStepUrl(draftRef.current.step),
      );
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      if (requestedStep === "email") {
        setEmailInputOverride(null);
      }
      setDraft((currentDraft) => ({
        ...currentDraft,
        step: requestedStep,
      }));
    });

    return () => window.cancelAnimationFrame(frame);
  }, [buildStepUrl, searchParams, setDraft]);

  const stepIndex = ANONYMOUS_ONBOARDING_STEPS.findIndex(
    (step) => step.id === draft.step,
  );
  const currentStepIndex = stepIndex >= 0 ? stepIndex : 0;
  const furthestStepIndex = Math.max(
    0,
    getOnboardingStepIndex(draft.furthestStep),
  );
  const progressValue =
    ((currentStepIndex + 1) / ANONYMOUS_ONBOARDING_STEPS.length) * 100;
  const emailInput = emailInputOverride ?? draft.email ?? "";
  const emailIsValid = /.+@.+\..+/.test(normalizeEmail(emailInput));
  const personalizeNameIsValid = draft.profile.gardenName.trim().length >= 2;
  const hasPreviewCollection = draft.collection.length >= 2;
  const currentStepCanContinue = (() => {
    switch (draft.step) {
      case "workflow":
        return Boolean(draft.workflow && draft.catalogSize);
      case "buyer-need":
        return hasPreviewCollection;
      case "problem":
      case "search-tour":
      case "proof":
        return hasPreviewCollection;
      case "personalize":
        return hasPreviewCollection && personalizeNameIsValid;
      case "email":
        return (
          hasPreviewCollection &&
          emailIsValid &&
          !collectEmail.isPending
        );
      case "checkout":
        return hasPreviewCollection && Boolean(draft.email);
      default:
        return true;
    }
  })();

  const goToStep = useCallback(
    (step: AnonymousOnboardingStepId) => {
      if (step === "email") {
        setEmailInputOverride(null);
      }
      setDraft((currentDraft) => {
        const furthestStep =
          getOnboardingStepIndex(step) >
          getOnboardingStepIndex(currentDraft.furthestStep)
            ? step
            : currentDraft.furthestStep;

        return { ...currentDraft, step, furthestStep };
      });
      window.history.pushState(null, "", buildStepUrl(step));
    },
    [buildStepUrl, setDraft],
  );

  const saveEmailAndContinue = useCallback(
    async (stage: "initial" | "pre_checkout_review") => {
      const email = normalizeEmail(emailInput);
      if (!emailIsValid) {
        return;
      }

      const changed = Boolean(draft.email && draft.email !== email);
      setDraft((currentDraft) => ({ ...currentDraft, email }));
      setEmailInputOverride(null);
      try {
        const analyticsDistinctId =
          analyticsDistinctIdRef.current ??
          (await getPosthogDistinctId().catch(() => null));
        await collectEmail.mutateAsync({
          email,
          draftId: draft.draftId,
          stage,
          changed: stage === "pre_checkout_review" ? changed : false,
          analyticsDistinctId: analyticsDistinctId ?? undefined,
        });
      } catch (error) {
        console.warn("Unable to capture onboarding email lead", error);
      }

      if (stage === "pre_checkout_review") {
        setIsEditingCheckoutEmail(false);
        return;
      }

      capturePosthogEvent("onboarding_step_completed", {
        flow_version: ANONYMOUS_ONBOARDING_FLOW_VERSION,
        draft_id: draft.draftId,
        step_id: "email",
        step_index: getOnboardingStepIndex("email") + 1,
        total_steps: ANONYMOUS_ONBOARDING_STEPS.length,
        workflow: draft.workflow,
        catalog_size: draft.catalogSize,
        buyer_need: draft.buyerNeed,
      });
      goToStep("checkout");
    },
    [
      collectEmail,
      draft.draftId,
      draft.email,
      draft.buyerNeed,
      draft.catalogSize,
      draft.workflow,
      emailInput,
      emailIsValid,
      goToStep,
      setDraft,
    ],
  );

  const updateProfileGardenName = useCallback(
    (gardenName: string) => {
      setDraft((currentDraft) => ({
        ...currentDraft,
        profile: {
          ...currentDraft.profile,
          gardenName,
        },
      }));
    },
    [setDraft],
  );

  const setWorkflow = useCallback(
    (workflow: AnonymousOnboardingWorkflow) => {
      capturePosthogEvent("onboarding_quiz_answered", {
        flow_version: ANONYMOUS_ONBOARDING_FLOW_VERSION,
        draft_id: draftRef.current.draftId,
        question_id: "current_workflow",
        answer_id: workflow,
        answer_changed: Boolean(
          draftRef.current.workflow && draftRef.current.workflow !== workflow,
        ),
      });
      setDraft((currentDraft) => ({ ...currentDraft, workflow }));
    },
    [setDraft],
  );

  const setCatalogSize = useCallback(
    (catalogSize: AnonymousOnboardingCatalogSize) => {
      capturePosthogEvent("onboarding_quiz_answered", {
        flow_version: ANONYMOUS_ONBOARDING_FLOW_VERSION,
        draft_id: draftRef.current.draftId,
        question_id: "catalog_size",
        answer_id: catalogSize,
        answer_changed: Boolean(
          draftRef.current.catalogSize &&
            draftRef.current.catalogSize !== catalogSize,
        ),
      });
      setDraft((currentDraft) => ({ ...currentDraft, catalogSize }));
    },
    [setDraft],
  );

  const addCultivarToCollection = useCallback(
    (cultivar: NonNullable<typeof cultivarSearchData>[number]) => {
      if (
        draftRef.current.collection.some(
          (item) => item.cultivarReferenceId === cultivar.cultivarReferenceId,
        ) ||
        draftRef.current.collection.length >= 5
      ) {
        return;
      }

      const item: AnonymousOnboardingCollectionItem = {
        cultivarReferenceId: cultivar.cultivarReferenceId,
        name: cultivar.name,
        hybridizer: cultivar.hybridizer,
        year: cultivar.year,
        imageUrl: cultivar.image?.url ?? cultivar.ahsImageUrl,
        scapeHeight: cultivar.scapeHeight,
        bloomSize: cultivar.bloomSize,
        bloomSeason: cultivar.bloomSeason,
        form: cultivar.form,
        ploidy: cultivar.ploidy,
        foliageType: cultivar.foliageType,
        color: cultivar.color,
        fragrance: cultivar.fragrance,
        parentage: cultivar.parentage,
        quantity: 1,
        price: 25,
        status: "for_sale",
        description:
          "Healthy plant from our garden. Contact us for current shipping or pickup details.",
      };
      const selectionCount = draftRef.current.collection.length + 1;
      setDraft((currentDraft) => ({
        ...currentDraft,
        buyerNeed: currentDraft.buyerNeed ?? "find_cultivar",
        collection: [...currentDraft.collection, item],
      }));
      capturePosthogEvent("onboarding_cultivar_selected", {
        flow_version: ANONYMOUS_ONBOARDING_FLOW_VERSION,
        draft_id: draftRef.current.draftId,
        interaction_type: "real_cultivar_selected",
        cultivar_reference_id: cultivar.cultivarReferenceId,
        selection_count: selectionCount,
      });
    },
    [setDraft],
  );

  const removeCultivarFromCollection = useCallback(
    (cultivarReferenceId: string) => {
      capturePosthogEvent("onboarding_cultivar_removed", {
        flow_version: ANONYMOUS_ONBOARDING_FLOW_VERSION,
        draft_id: draftRef.current.draftId,
        cultivar_reference_id: cultivarReferenceId,
        selection_count: Math.max(0, draftRef.current.collection.length - 1),
      });
      setDraft((currentDraft) => ({
        ...currentDraft,
        collection: currentDraft.collection.filter(
          (item) => item.cultivarReferenceId !== cultivarReferenceId,
        ),
      }));
    },
    [setDraft],
  );

  const updateCollectionItem = useCallback(
    (
      cultivarReferenceId: string,
      patch: Partial<
        Pick<
          AnonymousOnboardingCollectionItem,
          "description" | "price" | "quantity" | "status"
        >
      >,
    ) => {
      capturePosthogEvent("onboarding_listing_preview_edited", {
        flow_version: ANONYMOUS_ONBOARDING_FLOW_VERSION,
        draft_id: draftRef.current.draftId,
        cultivar_reference_id: cultivarReferenceId,
        field: Object.keys(patch)[0] ?? "unknown",
      });
      setDraft((currentDraft) => ({
        ...currentDraft,
        collection: currentDraft.collection.map((item) =>
          item.cultivarReferenceId === cultivarReferenceId
            ? { ...item, ...patch }
            : item,
        ),
      }));
    },
    [setDraft],
  );

  const markProofViewed = useCallback(
    (type: "catalog" | "listing") => {
      capturePosthogEvent("onboarding_example_viewed", {
        flow_version: ANONYMOUS_ONBOARDING_FLOW_VERSION,
        draft_id: draftRef.current.draftId,
        example_type: type,
        presentation_mode: "embedded_share_preview",
      });
      setDraft((currentDraft) => ({
        ...currentDraft,
        proof: {
          ...currentDraft.proof,
          viewedCatalogExample:
            type === "catalog" || currentDraft.proof.viewedCatalogExample,
          viewedListingExample:
            type === "listing" || currentDraft.proof.viewedListingExample,
        },
      }));
    },
    [setDraft],
  );

  const goForward = useCallback(async () => {
    if (!currentStepCanContinue) return;
    capturePosthogEvent("onboarding_step_completed", {
      flow_version: ANONYMOUS_ONBOARDING_FLOW_VERSION,
      draft_id: draft.draftId,
      step_id: draft.step,
      step_index: currentStepIndex + 1,
      total_steps: ANONYMOUS_ONBOARDING_STEPS.length,
      workflow: draft.workflow,
      catalog_size: draft.catalogSize,
      buyer_need: draft.buyerNeed,
    });
    if (draft.step === "email") {
      await saveEmailAndContinue("initial");
      return;
    }
    const nextStep = ANONYMOUS_ONBOARDING_STEPS[currentStepIndex + 1]?.id;
    if (!nextStep) return;
    if (
      draft.step === "proof" &&
      nextStep === "personalize" &&
      !draft.ahaReachedAt
    ) {
      capturePosthogEvent("onboarding_aha_reached", {
        flow_version: ANONYMOUS_ONBOARDING_FLOW_VERSION,
        draft_id: draft.draftId,
        aha_type: "buyer_experience_previewed",
        workflow: draft.workflow,
        catalog_size: draft.catalogSize,
        buyer_need: draft.buyerNeed,
      });
      setDraft((currentDraft) => ({
        ...currentDraft,
        ahaReachedAt: new Date().toISOString(),
      }));
    }
    goToStep(nextStep);
  }, [
    currentStepCanContinue,
    currentStepIndex,
    draft.ahaReachedAt,
    draft.buyerNeed,
    draft.catalogSize,
    draft.draftId,
    draft.step,
    draft.workflow,
    goToStep,
    saveEmailAndContinue,
    setDraft,
  ]);

  const goBack = useCallback(() => {
    const previousStep = ANONYMOUS_ONBOARDING_STEPS[currentStepIndex - 1]?.id;
    if (previousStep) {
      goToStep(previousStep);
    }
  }, [currentStepIndex, goToStep]);

  const startCheckout = useCallback(async () => {
    if (draft.collection.length < 2) {
      goToStep("buyer-need");
      return;
    }
    if (!draft.email) {
      goToStep("email");
      return;
    }

    capturePosthogEvent("checkout_started", {
      source: "anonymous_onboarding",
      flow_version: ANONYMOUS_ONBOARDING_FLOW_VERSION,
      draft_id: draft.draftId,
    });
    try {
      const result = await createCheckout.mutateAsync({
        email: draft.email,
        draftId: draft.draftId,
      });
      capturePosthogEvent("checkout_redirect_ready", {
        source: "anonymous_onboarding",
        flow_version: ANONYMOUS_ONBOARDING_FLOW_VERSION,
        draft_id: draft.draftId,
      });
      window.location.href = result.url;
    } catch {
      capturePosthogEvent("checkout_failed", {
        source: "anonymous_onboarding",
        flow_version: ANONYMOUS_ONBOARDING_FLOW_VERSION,
        draft_id: draft.draftId,
      });
      return;
    }
  }, [
    createCheckout,
    draft.collection.length,
    draft.draftId,
    draft.email,
    goToStep,
  ]);

  return {
    addCultivarToCollection,
    collectEmail,
    createCheckout,
    currentStepIndex,
    currentStepCanContinue,
    cultivarQuery,
    cultivarSearchError: cultivarSearch.error,
    cultivarSearchIsLoading:
      normalizedCultivarQuery.length >= 3 &&
      (normalizedCultivarQuery !== debouncedCultivarQuery ||
        cultivarSearch.isFetching),
    cultivarSearchResults:
      normalizedCultivarQuery === debouncedCultivarQuery
        ? (cultivarSearchData ?? [])
        : [],
    draft,
    draftIsHydrated,
    emailInput,
    emailIsValid,
    furthestStepIndex,
    goBack,
    goForward,
    goToStep,
    isEditingCheckoutEmail,
    markProofViewed,
    membershipPriceDisplay,
    removeCultivarFromCollection,
    progressValue,
    saveEmailAndContinue,
    setCatalogSize,
    setCultivarQuery,
    setDraft,
    setEmailInput: setEmailInputOverride,
    setIsEditingCheckoutEmail,
    setWorkflow,
    startCheckout,
    storageWarning,
    updateProfileGardenName,
    updateCollectionItem,
  };
}

export type AnonymousOnboardingController = ReturnType<
  typeof useAnonymousOnboardingController
>;
