"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { toast } from "sonner";
import type { RouterOutputs } from "@/trpc/react";
import { getErrorMessage } from "@/lib/error-utils";
import type { AhsSearchResult } from "./_components/onboarding-ahs-listing-select";
import {
  getEarliestByCreatedAt,
  getNextIncompleteListingField,
  normalizeCultivarSearchValue,
  ONBOARDING_LISTING_DEFAULTS,
  ONBOARDING_STEPS,
  type ListingOnboardingDraft,
  type ListingOnboardingField,
} from "./onboarding-utils";

type DashboardListing = RouterOutputs["dashboardDb"]["listing"]["list"][number];

interface UseOnboardingListingFlowArgs {
  ensureListingDraftRecord: () => Promise<string>;
  isListingsFetched: boolean;
  listingDraft: ListingOnboardingDraft;
  listings: DashboardListing[] | undefined;
  profileId: string | null | undefined;
  rawStepParam: string | null;
  savedListingId: string | null;
  searchOnboardingCultivars: (args: {
    query: string;
  }) => Promise<AhsSearchResult[]>;
  selectedCultivarAhsId: string | null;
  selectedCultivarName: string | null;
  setActiveListingField: Dispatch<SetStateAction<ListingOnboardingField>>;
  setListingDraft: Dispatch<SetStateAction<ListingOnboardingDraft>>;
  setSelectedCultivarAhsId: Dispatch<SetStateAction<string | null>>;
  setSelectedCultivarName: Dispatch<SetStateAction<string | null>>;
  setSelectedListingImageId: Dispatch<SetStateAction<string | null>>;
  setSelectedListingImageUrl: Dispatch<SetStateAction<string | null>>;
}

export function useOnboardingListingFlow({
  ensureListingDraftRecord,
  isListingsFetched,
  listingDraft,
  listings,
  profileId,
  rawStepParam,
  savedListingId,
  searchOnboardingCultivars,
  selectedCultivarAhsId,
  selectedCultivarName,
  setActiveListingField,
  setListingDraft,
  setSelectedCultivarAhsId,
  setSelectedCultivarName,
  setSelectedListingImageId,
  setSelectedListingImageUrl,
}: UseOnboardingListingFlowArgs) {
  const [pendingListingUploadBlob, setPendingListingUploadBlob] =
    useState<Blob | null>(null);
  const [pendingListingUploadPreviewUrl, setPendingListingUploadPreviewUrl] =
    useState<string | null>(null);
  const [onboardingCultivarOptions, setOnboardingCultivarOptions] = useState<
    AhsSearchResult[]
  >([]);
  const [isLoadingOnboardingCultivarOptions, setIsLoadingOnboardingCultivars] =
    useState(true);

  const hasAppliedDefaultCultivar = useRef(false);
  const hasInitializedListingDraft = useRef(false);
  const hasLoadedOnboardingCultivarOptions = useRef(false);

  const currentStepId = useMemo(() => {
    if (!rawStepParam) {
      return ONBOARDING_STEPS[0]?.id ?? "build-profile-card";
    }

    return (
      ONBOARDING_STEPS.find((step) => step.id === rawStepParam)?.id ??
      ONBOARDING_STEPS[0]?.id ??
      "build-profile-card"
    );
  }, [rawStepParam]);

  const earliestExistingListing = useMemo(
    () => getEarliestByCreatedAt(listings ?? []),
    [listings],
  );
  const existingListingCultivarReferenceId =
    earliestExistingListing?.cultivarReferenceId ?? null;
  const shouldAttemptDefaultCultivar =
    isListingsFetched &&
    existingListingCultivarReferenceId === null &&
    listingDraft.cultivarReferenceId === null;

  const clearPendingListingUpload = useCallback(() => {
    setPendingListingUploadPreviewUrl((previousPreviewUrl) => {
      if (previousPreviewUrl) {
        URL.revokeObjectURL(previousPreviewUrl);
      }

      return null;
    });
    setPendingListingUploadBlob(null);
  }, []);

  useEffect(() => {
    return () => {
      if (pendingListingUploadPreviewUrl) {
        URL.revokeObjectURL(pendingListingUploadPreviewUrl);
      }
    };
  }, [pendingListingUploadPreviewUrl]);

  const applyAhsSelection = useCallback(
    (result: AhsSearchResult) => {
      if (!result.cultivarReferenceId) {
        return;
      }

      setListingDraft((previous) => {
        const nextDraft = {
          ...previous,
          cultivarReferenceId: result.cultivarReferenceId,
          title:
            previous.title.trim().length > 0
              ? previous.title
              : (result.name ?? previous.title),
        };

        const nextIncomplete = getNextIncompleteListingField(nextDraft);
        setActiveListingField(nextIncomplete ?? "title");

        return nextDraft;
      });

      setSelectedCultivarName(result.name ?? null);
      setSelectedCultivarAhsId(result.id);
    },
    [
      setActiveListingField,
      setListingDraft,
      setSelectedCultivarAhsId,
      setSelectedCultivarName,
    ],
  );

  const handleAhsSelect = useCallback(
    (result: AhsSearchResult) => {
      if (!result.cultivarReferenceId) {
        toast.error("This cultivar cannot be linked yet.");
        return;
      }

      applyAhsSelection(result);
    },
    [applyAhsSelection],
  );

  useEffect(() => {
    if (!profileId || hasLoadedOnboardingCultivarOptions.current) {
      return;
    }

    hasLoadedOnboardingCultivarOptions.current = true;
    let isCancelled = false;

    void Promise.resolve().then(() => {
      if (!isCancelled) {
        setIsLoadingOnboardingCultivars(true);
      }
    });

    void Promise.all(
      ONBOARDING_LISTING_DEFAULTS.onboardingCultivarQueries.map(
        async (queryText) => {
          const results = await searchOnboardingCultivars({
            query: queryText,
          });
          const normalizedQuery = normalizeCultivarSearchValue(queryText);

          return (
            results.find((result) => {
              const normalizedName = normalizeCultivarSearchValue(result.name);
              return normalizedName === normalizedQuery;
            }) ??
            results[0] ??
            null
          );
        },
      ),
    )
      .then((results) => {
        if (isCancelled) {
          return;
        }

        const deduped: AhsSearchResult[] = [];
        for (const result of results) {
          if (!result?.cultivarReferenceId) {
            continue;
          }

          if (deduped.some((candidate) => candidate.id === result.id)) {
            continue;
          }

          deduped.push(result);
        }

        setOnboardingCultivarOptions(deduped);
      })
      .catch((error) => {
        if (isCancelled) {
          return;
        }

        hasLoadedOnboardingCultivarOptions.current = false;
        toast.error("Unable to load onboarding daylily options.", {
          description: getErrorMessage(error),
        });
      })
      .finally(() => {
        if (isCancelled) {
          return;
        }

        setIsLoadingOnboardingCultivars(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [profileId, searchOnboardingCultivars]);

  useEffect(() => {
    if (!shouldAttemptDefaultCultivar || hasAppliedDefaultCultivar.current) {
      return;
    }

    if (onboardingCultivarOptions.length === 0) {
      return;
    }

    const normalizedTarget = normalizeCultivarSearchValue(
      ONBOARDING_LISTING_DEFAULTS.defaultCultivarName,
    );
    const preferredMatch =
      onboardingCultivarOptions.find((result) => {
        const normalizedName = normalizeCultivarSearchValue(result.name);
        return normalizedName === normalizedTarget;
      }) ?? onboardingCultivarOptions[0];
    if (!preferredMatch) {
      return;
    }

    hasAppliedDefaultCultivar.current = true;
    applyAhsSelection(preferredMatch);
  }, [
    applyAhsSelection,
    onboardingCultivarOptions,
    shouldAttemptDefaultCultivar,
  ]);

  useEffect(() => {
    if (onboardingCultivarOptions.length === 0) {
      return;
    }

    if (selectedCultivarAhsId && selectedCultivarName) {
      return;
    }

    const matchByCultivarReference = listingDraft.cultivarReferenceId
      ? (onboardingCultivarOptions.find(
          (option) =>
            option.cultivarReferenceId === listingDraft.cultivarReferenceId,
        ) ?? null)
      : null;

    const matchByName = selectedCultivarName
      ? (onboardingCultivarOptions.find((option) => {
          const normalizedOptionName = normalizeCultivarSearchValue(
            option.name,
          );
          const normalizedSelectedName =
            normalizeCultivarSearchValue(selectedCultivarName);
          return normalizedOptionName === normalizedSelectedName;
        }) ?? null)
      : null;

    const matchedCultivar = matchByCultivarReference ?? matchByName;
    if (!matchedCultivar) {
      return;
    }

    setSelectedCultivarAhsId(matchedCultivar.id);
    setSelectedCultivarName(matchedCultivar.name ?? selectedCultivarName);
  }, [
    listingDraft.cultivarReferenceId,
    onboardingCultivarOptions,
    selectedCultivarAhsId,
    selectedCultivarName,
    setSelectedCultivarAhsId,
    setSelectedCultivarName,
  ]);

  const handleDeferredListingImageReady = useCallback(
    (file: Blob) => {
      clearPendingListingUpload();
      const previewUrl = URL.createObjectURL(file);
      setPendingListingUploadBlob(file);
      setPendingListingUploadPreviewUrl(previewUrl);
      setSelectedListingImageId(null);
      setSelectedListingImageUrl(previewUrl);
      setActiveListingField("image");
    },
    [
      clearPendingListingUpload,
      setActiveListingField,
      setSelectedListingImageId,
      setSelectedListingImageUrl,
    ],
  );

  const handleDeferredListingImageCleared = useCallback(() => {
    clearPendingListingUpload();
    setSelectedListingImageId(null);
    setSelectedListingImageUrl(null);
    setActiveListingField("image");
  }, [
    clearPendingListingUpload,
    setActiveListingField,
    setSelectedListingImageId,
    setSelectedListingImageUrl,
  ]);

  useEffect(() => {
    if (currentStepId !== "build-listing-card") {
      return;
    }

    if (savedListingId || hasInitializedListingDraft.current) {
      return;
    }

    if (!isListingsFetched || (listings?.length ?? 0) > 0) {
      return;
    }

    hasInitializedListingDraft.current = true;
    void ensureListingDraftRecord().catch((error) => {
      hasInitializedListingDraft.current = false;
      toast.error("Unable to prepare your listing draft", {
        description: getErrorMessage(error),
      });
    });
  }, [
    currentStepId,
    ensureListingDraftRecord,
    isListingsFetched,
    listings,
    savedListingId,
  ]);

  return {
    clearPendingListingUpload,
    handleAhsSelect,
    handleDeferredListingImageCleared,
    handleDeferredListingImageReady,
    isLoadingOnboardingCultivarOptions,
    onboardingCultivarOptions,
    pendingListingUploadBlob,
    pendingListingUploadPreviewUrl,
  };
}
