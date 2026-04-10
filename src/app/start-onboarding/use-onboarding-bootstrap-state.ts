"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { RouterOutputs } from "@/trpc/react";
import {
  getEarliestByCreatedAt,
  ONBOARDING_LISTING_DEFAULTS,
  type ListingOnboardingDraft,
  type ProfileOnboardingDraft,
} from "./onboarding-utils";

type DashboardImage = RouterOutputs["dashboardDb"]["image"]["list"][number];
type DashboardListing = RouterOutputs["dashboardDb"]["listing"]["list"][number];
type DashboardProfile = RouterOutputs["dashboardDb"]["userProfile"]["get"];

const ONBOARDING_DRAFT_STORAGE_LEGACY_KEY = "start-onboarding:draft-v1";

interface OnboardingDraftSnapshot {
  profileDraft: ProfileOnboardingDraft;
  listingDraft: ListingOnboardingDraft;
  selectedCultivarName: string | null;
  selectedCultivarAhsId: string | null;
}

interface UseOnboardingBootstrapStateArgs {
  currentUserEmail: string | null | undefined;
  currentUserId: string | null | undefined;
  images: DashboardImage[] | undefined;
  listingDraft: ListingOnboardingDraft;
  listings: DashboardListing[] | undefined;
  profile: DashboardProfile | undefined;
  profileDraft: ProfileOnboardingDraft;
  profileUserId: string | null | undefined;
  savedListingId: string | null;
  selectedCultivarAhsId: string | null;
  selectedCultivarName: string | null;
  setListingDraft: Dispatch<SetStateAction<ListingOnboardingDraft>>;
  setProfileDraft: Dispatch<SetStateAction<ProfileOnboardingDraft>>;
  setSavedListingId: Dispatch<SetStateAction<string | null>>;
  setSelectedCultivarAhsId: Dispatch<SetStateAction<string | null>>;
  setSelectedCultivarName: Dispatch<SetStateAction<string | null>>;
  setSelectedListingImageId: Dispatch<SetStateAction<string | null>>;
  setSelectedListingImageUrl: Dispatch<SetStateAction<string | null>>;
}

function buildOnboardingDraftStorageKey(
  userScope: string | null | undefined,
): string | null {
  const normalizedScope = userScope?.trim().toLowerCase();
  if (!normalizedScope) {
    return null;
  }

  return `${ONBOARDING_DRAFT_STORAGE_LEGACY_KEY}:${encodeURIComponent(normalizedScope)}`;
}

export function useOnboardingBootstrapState({
  currentUserEmail,
  currentUserId,
  images,
  listingDraft,
  listings,
  profile,
  profileDraft,
  profileUserId,
  savedListingId,
  selectedCultivarAhsId,
  selectedCultivarName,
  setListingDraft,
  setProfileDraft,
  setSavedListingId,
  setSelectedCultivarAhsId,
  setSelectedCultivarName,
  setSelectedListingImageId,
  setSelectedListingImageUrl,
}: UseOnboardingBootstrapStateArgs) {
  const hasHydratedProfile = useRef(false);
  const hasHydratedListing = useRef(false);
  const hasHydratedListingImage = useRef(false);
  const hasHydratedSessionDraft = useRef(false);

  const onboardingDraftStorageKey = useMemo(() => {
    if (currentUserEmail) {
      return buildOnboardingDraftStorageKey(currentUserEmail);
    }

    return buildOnboardingDraftStorageKey(currentUserId ?? profileUserId);
  }, [currentUserEmail, currentUserId, profileUserId]);

  const clearOnboardingDraftSnapshot = useCallback(() => {
    window.sessionStorage.removeItem(ONBOARDING_DRAFT_STORAGE_LEGACY_KEY);

    if (onboardingDraftStorageKey) {
      window.sessionStorage.removeItem(onboardingDraftStorageKey);
    }
  }, [onboardingDraftStorageKey]);

  useEffect(() => {
    if (hasHydratedSessionDraft.current) {
      return;
    }

    if (!onboardingDraftStorageKey) {
      return;
    }

    hasHydratedSessionDraft.current = true;

    try {
      const rawSnapshot = window.sessionStorage.getItem(
        onboardingDraftStorageKey,
      );
      if (!rawSnapshot) {
        window.sessionStorage.removeItem(ONBOARDING_DRAFT_STORAGE_LEGACY_KEY);
        return;
      }

      const parsedSnapshot = JSON.parse(
        rawSnapshot,
      ) as OnboardingDraftSnapshot | null;
      if (!parsedSnapshot) {
        return;
      }

      if (parsedSnapshot.profileDraft) {
        setProfileDraft((previous) => ({
          ...previous,
          ...parsedSnapshot.profileDraft,
          profileImageUrl: null,
        }));
      }

      if (parsedSnapshot.listingDraft) {
        setListingDraft((previous) => ({
          ...previous,
          ...parsedSnapshot.listingDraft,
          status: ONBOARDING_LISTING_DEFAULTS.defaultStatus,
        }));
      }

      setSelectedCultivarName(parsedSnapshot.selectedCultivarName ?? null);
      setSelectedCultivarAhsId(parsedSnapshot.selectedCultivarAhsId ?? null);
    } catch {
      window.sessionStorage.removeItem(onboardingDraftStorageKey);
    }
  }, [
    onboardingDraftStorageKey,
    setListingDraft,
    setProfileDraft,
    setSelectedCultivarAhsId,
    setSelectedCultivarName,
  ]);

  useEffect(() => {
    if (!hasHydratedSessionDraft.current || !onboardingDraftStorageKey) {
      return;
    }

    const snapshot: OnboardingDraftSnapshot = {
      profileDraft: {
        ...profileDraft,
        profileImageUrl: null,
      },
      listingDraft,
      selectedCultivarName,
      selectedCultivarAhsId,
    };

    window.sessionStorage.setItem(
      onboardingDraftStorageKey,
      JSON.stringify(snapshot),
    );
  }, [
    listingDraft,
    onboardingDraftStorageKey,
    profileDraft,
    selectedCultivarAhsId,
    selectedCultivarName,
  ]);

  useEffect(() => {
    if (!profile || hasHydratedProfile.current) {
      return;
    }

    hasHydratedProfile.current = true;

    setProfileDraft((previous) => ({
      gardenName: previous.gardenName.trim()
        ? previous.gardenName
        : (profile.title?.trim() ?? ""),
      location: previous.location.trim()
        ? previous.location
        : (profile.location ?? ""),
      description: previous.description.trim()
        ? previous.description
        : (profile.description ?? ""),
      profileImageUrl: previous.profileImageUrl ?? null,
    }));
  }, [profile, setProfileDraft]);

  const earliestExistingListing = useMemo(
    () => getEarliestByCreatedAt(listings ?? []),
    [listings],
  );

  useEffect(() => {
    if (!listings || hasHydratedListing.current) {
      return;
    }

    hasHydratedListing.current = true;
    if (!earliestExistingListing) {
      return;
    }

    setSavedListingId(earliestExistingListing.id);
    setListingDraft((previous) => ({
      cultivarReferenceId:
        previous.cultivarReferenceId ??
        earliestExistingListing.cultivarReferenceId,
      title: previous.title.trim()
        ? previous.title
        : earliestExistingListing.title,
      price: previous.price ?? earliestExistingListing.price,
      description: previous.description.trim()
        ? previous.description
        : (earliestExistingListing.description ?? ""),
      status: ONBOARDING_LISTING_DEFAULTS.defaultStatus,
    }));
  }, [earliestExistingListing, listings, setListingDraft, setSavedListingId]);

  useEffect(() => {
    hasHydratedListingImage.current = false;
  }, [savedListingId]);

  useEffect(() => {
    if (!savedListingId || !images || hasHydratedListingImage.current) {
      return;
    }

    hasHydratedListingImage.current = true;
    const earliestListingImage = getEarliestByCreatedAt(
      images.filter((image) => image.listingId === savedListingId),
    );

    if (!earliestListingImage) {
      return;
    }

    setSelectedListingImageId(earliestListingImage.id);
    setSelectedListingImageUrl(earliestListingImage.url);
  }, [
    images,
    savedListingId,
    setSelectedListingImageId,
    setSelectedListingImageUrl,
  ]);

  return {
    clearOnboardingDraftSnapshot,
    earliestExistingListing,
  };
}
