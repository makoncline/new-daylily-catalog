"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Circle,
  CheckCircle2,
  Link2,
  MapPin,
  MessageCircle,
  Pencil,
  ShoppingCart,
} from "lucide-react";
import { toast } from "sonner";
import {
  OnboardingAhsListingSelect,
  type AhsSearchResult,
} from "./_components/onboarding-ahs-listing-select";
import { AhsListingDisplay } from "@/components/ahs-listing-display";
import { OnboardingCheckoutButton } from "./_components/onboarding-checkout-button";
import { CurrencyInput } from "@/components/currency-input";
import { OnboardingDeferredImageUpload } from "./_components/onboarding-deferred-image-upload";
import { IMAGE_CONFIG } from "@/components/optimized-image";
import { PRO_FEATURES } from "@/config/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { SUBSCRIPTION_CONFIG } from "@/config/subscription-config";
import { capturePosthogEvent } from "@/lib/analytics/posthog";
import { getErrorMessage } from "@/lib/error-utils";
import { cn, formatPrice, uploadFileWithProgress } from "@/lib/utils";
import { api } from "@/trpc/react";
import {
  ONBOARDING_LISTING_DEFAULTS,
  ONBOARDING_LISTING_DESCRIPTION_GUIDANCE,
  ONBOARDING_PROFILE_DESCRIPTION_SEO_GUIDANCE,
  getDescriptionLengthAimText,
  getNextIncompleteListingField,
  getNextIncompleteProfileField,
  isListingOnboardingDraftComplete,
  isProfileOnboardingDraftComplete,
  ONBOARDING_STEPS,
  STARTER_PROFILE_IMAGES,
  type ListingOnboardingDraft,
  type ListingOnboardingField,
  type OnboardingStepId,
  type ProfileOnboardingDraft,
  type ProfileOnboardingField,
} from "./onboarding-utils";

const PROFILE_PLACEHOLDER_IMAGE =
  "/assets/onboarding-generated/profile-placeholder.png";
const DEFAULT_STARTER_IMAGE_URL = STARTER_PROFILE_IMAGES[0]?.url ?? null;
const DEFAULT_GARDEN_NAME_PLACEHOLDER = "Your Garden Name";
const DEFAULT_LOCATION_PLACEHOLDER = "Your City, ST";
const DEFAULT_PROFILE_DESCRIPTION_PLACEHOLDER =
  "Daylily collector in Your City, ST offering healthy dormant fans, clearly labeled plants, and prompt replies with spring and fall shipping.";
const DEFAULT_LISTING_TITLE_PLACEHOLDER =
  "Coffee Frenzy spring fan (1 healthy dormant fan)";
const DEFAULT_LISTING_DESCRIPTION_PLACEHOLDER =
  "Healthy dormant fan with strong roots, clearly labeled, and ready for spring shipping or local pickup.";
const ONBOARDING_DRAFT_STORAGE_LEGACY_KEY = "start-onboarding:draft-v1";

function isStarterProfileImageUrl(url: string | null | undefined) {
  if (!url) {
    return false;
  }

  return STARTER_PROFILE_IMAGES.some((image) => image.url === url);
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

interface MembershipPriceDisplay {
  amount: string;
  interval: string;
  monthlyEquivalent: string | null;
}

interface StartOnboardingPageClientProps {
  membershipPriceDisplay: MembershipPriceDisplay | null;
}

interface OnboardingDraftSnapshot {
  profileDraft: ProfileOnboardingDraft;
  listingDraft: ListingOnboardingDraft;
  selectedCultivarName: string | null;
  selectedCultivarAhsId: string | null;
}

function getCreatedAtTimestamp(value: Date | string | null | undefined) {
  if (!value) {
    return Number.POSITIVE_INFINITY;
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  return new Date(value).getTime();
}

function getEarliestByCreatedAt<T extends { createdAt: Date | string }>(
  rows: T[],
) {
  if (rows.length === 0) {
    return null;
  }

  return rows.reduce((earliest, current) => {
    if (!earliest) {
      return current;
    }

    const earliestTimestamp = getCreatedAtTimestamp(earliest.createdAt);
    const currentTimestamp = getCreatedAtTimestamp(current.createdAt);
    return currentTimestamp < earliestTimestamp ? current : earliest;
  }, rows[0] ?? null);
}

function normalizeCultivarSearchValue(value: string | null | undefined) {
  return (value ?? "").toLowerCase().replace(/\s+/g, " ").trim();
}

function normalizePersistedImageUrl(value: string | null | undefined) {
  const trimmedValue = value?.trim();
  if (!trimmedValue) {
    return null;
  }

  return trimmedValue.startsWith("blob:") ? null : trimmedValue;
}

const DEFAULT_PROFILE_DRAFT: ProfileOnboardingDraft = {
  gardenName: "",
  location: "",
  description: "",
  profileImageUrl: null,
};

const DEFAULT_LISTING_DRAFT: ListingOnboardingDraft = {
  cultivarReferenceId: null,
  title: "",
  price: null,
  description: "",
  status: ONBOARDING_LISTING_DEFAULTS.defaultStatus,
};

export function StartOnboardingPageClient({
  membershipPriceDisplay,
}: StartOnboardingPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const utils = api.useUtils();
  const onboardingPath = SUBSCRIPTION_CONFIG.NEW_USER_ONBOARDING_PATH;

  const [focusedProfileField, setFocusedProfileField] =
    useState<ProfileOnboardingField>("gardenName");
  const [activeListingField, setActiveListingField] =
    useState<ListingOnboardingField>("cultivar");

  const [profileDraft, setProfileDraft] = useState<ProfileOnboardingDraft>(
    DEFAULT_PROFILE_DRAFT,
  );
  const [listingDraft, setListingDraft] = useState<ListingOnboardingDraft>(
    DEFAULT_LISTING_DRAFT,
  );

  const [selectedStarterImageUrl, setSelectedStarterImageUrl] = useState<
    string | null
  >(DEFAULT_STARTER_IMAGE_URL);
  const [profileImageInputMode, setProfileImageInputMode] = useState<
    "starter" | "upload"
  >("starter");
  const [useExistingProfileImage, setUseExistingProfileImage] =
    useState(false);
  const [applyStarterNameOverlay, setApplyStarterNameOverlay] = useState(true);
  const [isGeneratingStarterImage, setIsGeneratingStarterImage] =
    useState(false);
  const [pendingStarterImageBlob, setPendingStarterImageBlob] =
    useState<Blob | null>(null);
  const [pendingStarterPreviewUrl, setPendingStarterPreviewUrl] = useState<
    string | null
  >(null);
  const [pendingProfileUploadBlob, setPendingProfileUploadBlob] =
    useState<Blob | null>(null);
  const [pendingProfileUploadPreviewUrl, setPendingProfileUploadPreviewUrl] =
    useState<string | null>(null);
  const [selectedCultivarName, setSelectedCultivarName] = useState<
    string | null
  >(null);
  const [selectedCultivarAhsId, setSelectedCultivarAhsId] = useState<
    string | null
  >(null);
  const [selectedListingImageId, setSelectedListingImageId] = useState<
    string | null
  >(null);
  const [selectedListingImageUrl, setSelectedListingImageUrl] = useState<
    string | null
  >(null);
  const [pendingListingUploadBlob, setPendingListingUploadBlob] =
    useState<Blob | null>(null);
  const [pendingListingUploadPreviewUrl, setPendingListingUploadPreviewUrl] =
    useState<string | null>(null);

  const [savedListingId, setSavedListingId] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingListing, setIsSavingListing] = useState(false);
  const [onboardingCultivarOptions, setOnboardingCultivarOptions] = useState<
    AhsSearchResult[]
  >([]);
  const [isLoadingOnboardingCultivarOptions, setIsLoadingOnboardingCultivars] =
    useState(true);

  const profileQuery = api.dashboardDb.userProfile.get.useQuery();
  const currentUserQuery = api.dashboardDb.user.getCurrentUser.useQuery();
  const imagesQuery = api.dashboardDb.image.list.useQuery(undefined, {
    enabled: Boolean(profileQuery.data?.id),
  });
  const listingQuery = api.dashboardDb.listing.list.useQuery();
  const earliestExistingListing = useMemo(
    () => getEarliestByCreatedAt(listingQuery.data ?? []),
    [listingQuery.data],
  );
  const existingListingCultivarReferenceId =
    earliestExistingListing?.cultivarReferenceId ?? null;
  const shouldAttemptDefaultCultivar =
    listingQuery.isFetched &&
    existingListingCultivarReferenceId === null &&
    listingDraft.cultivarReferenceId === null;
  const selectedCultivarDetailsQuery = api.dashboardDb.ahs.get.useQuery(
    { id: selectedCultivarAhsId ?? "" },
    { enabled: Boolean(selectedCultivarAhsId) },
  );

  const updateProfileMutation =
    api.dashboardDb.userProfile.update.useMutation();
  const getImagePresignedUrlMutation =
    api.dashboardDb.image.getPresignedUrl.useMutation();
  const createImageMutation = api.dashboardDb.image.create.useMutation();
  const updateImageMutation = api.dashboardDb.image.update.useMutation();
  const createListingMutation = api.dashboardDb.listing.create.useMutation();
  const updateListingMutation = api.dashboardDb.listing.update.useMutation();
  const linkAhsMutation = api.dashboardDb.listing.linkAhs.useMutation();

  const hasHydratedProfile = useRef(false);
  const hasHydratedListing = useRef(false);
  const hasHydratedListingImage = useRef(false);
  const hasAppliedDefaultCultivar = useRef(false);
  const hasLoadedOnboardingCultivarOptions = useRef(false);
  const hasInitializedListingDraft = useRef(false);
  const gardenNameInputRef = useRef<HTMLInputElement | null>(null);
  const gardenLocationInputRef = useRef<HTMLInputElement | null>(null);
  const gardenDescriptionInputRef = useRef<HTMLTextAreaElement | null>(null);
  const profileImageEditorRef = useRef<HTMLDivElement | null>(null);
  const listingCultivarRef = useRef<HTMLDivElement | null>(null);
  const listingTitleInputRef = useRef<HTMLInputElement | null>(null);
  const listingDescriptionInputRef = useRef<HTMLTextAreaElement | null>(null);
  const listingImageEditorRef = useRef<HTMLDivElement | null>(null);
  const starterImageGenerationTimeoutRef = useRef<number | null>(null);
  const starterImageGenerationRequestIdRef = useRef(0);
  const viewedOnboardingStepsRef = useRef<Set<OnboardingStepId>>(new Set());
  const hasHydratedSessionDraft = useRef(false);
  const profileImageWasEditedRef = useRef(false);

  const onboardingDraftStorageKey = useMemo(() => {
    const emailScope = currentUserQuery.data?.clerk?.email;
    if (emailScope) {
      return buildOnboardingDraftStorageKey(emailScope);
    }

    return buildOnboardingDraftStorageKey(
      currentUserQuery.data?.id ?? profileQuery.data?.userId,
    );
  }, [
    currentUserQuery.data?.clerk?.email,
    currentUserQuery.data?.id,
    profileQuery.data?.userId,
  ]);

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
  }, [onboardingDraftStorageKey]);

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
    if (!profileQuery.data || hasHydratedProfile.current) {
      return;
    }

    hasHydratedProfile.current = true;

    setProfileDraft((previous) => ({
      gardenName: previous.gardenName.trim()
        ? previous.gardenName
        : (profileQuery.data.title?.trim() ?? ""),
      location: previous.location.trim()
        ? previous.location
        : (profileQuery.data.location ?? ""),
      description: previous.description.trim()
        ? previous.description
        : (profileQuery.data.description ?? ""),
      profileImageUrl: previous.profileImageUrl ?? null,
    }));
  }, [profileQuery.data]);

  useEffect(() => {
    return () => {
      if (starterImageGenerationTimeoutRef.current !== null) {
        window.clearTimeout(starterImageGenerationTimeoutRef.current);
        starterImageGenerationTimeoutRef.current = null;
      }
      starterImageGenerationRequestIdRef.current += 1;

      if (pendingStarterPreviewUrl) {
        URL.revokeObjectURL(pendingStarterPreviewUrl);
      }
      if (pendingProfileUploadPreviewUrl) {
        URL.revokeObjectURL(pendingProfileUploadPreviewUrl);
      }
      if (pendingListingUploadPreviewUrl) {
        URL.revokeObjectURL(pendingListingUploadPreviewUrl);
      }
    };
  }, [
    pendingListingUploadPreviewUrl,
    pendingProfileUploadPreviewUrl,
    pendingStarterPreviewUrl,
  ]);

  useEffect(() => {
    if (!listingQuery.data || hasHydratedListing.current) {
      return;
    }

    hasHydratedListing.current = true;
    const existingListing = getEarliestByCreatedAt(listingQuery.data);

    if (!existingListing) {
      return;
    }

    setSavedListingId(existingListing.id);
    setListingDraft((previous) => ({
      cultivarReferenceId:
        previous.cultivarReferenceId ?? existingListing.cultivarReferenceId,
      title: previous.title.trim() ? previous.title : existingListing.title,
      price: previous.price ?? existingListing.price,
      description: previous.description.trim()
        ? previous.description
        : (existingListing.description ?? ""),
      status: ONBOARDING_LISTING_DEFAULTS.defaultStatus,
    }));

    hasAppliedDefaultCultivar.current = Boolean(
      existingListing.cultivarReferenceId,
    );
  }, [listingQuery.data]);

  useEffect(() => {
    hasHydratedListingImage.current = false;
  }, [savedListingId]);

  useEffect(() => {
    if (
      !savedListingId ||
      !imagesQuery.data ||
      hasHydratedListingImage.current
    ) {
      return;
    }

    hasHydratedListingImage.current = true;
    const earliestListingImage = getEarliestByCreatedAt(
      imagesQuery.data.filter((image) => image.listingId === savedListingId),
    );

    if (!earliestListingImage) {
      return;
    }

    setSelectedListingImageId(earliestListingImage.id);
    setSelectedListingImageUrl(earliestListingImage.url);
  }, [imagesQuery.data, savedListingId]);

  useEffect(() => {
    if (!profileQuery.data?.id || hasLoadedOnboardingCultivarOptions.current) {
      return;
    }

    hasLoadedOnboardingCultivarOptions.current = true;
    let isCancelled = false;
    setIsLoadingOnboardingCultivars(true);

    void Promise.all(
      ONBOARDING_LISTING_DEFAULTS.onboardingCultivarQueries.map(
        async (queryText) => {
          const results = await utils.dashboardDb.ahs.search.fetch({
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
  }, [profileQuery.data?.id, utils.dashboardDb.ahs.search]);

  const rawStepParam = searchParams.get("step");
  const stepIndex = useMemo(() => {
    if (!rawStepParam) {
      return 0;
    }

    const matchingStepIndex = ONBOARDING_STEPS.findIndex(
      (step) => step.id === rawStepParam,
    );

    return matchingStepIndex >= 0 ? matchingStepIndex : 0;
  }, [rawStepParam]);
  const currentStep = ONBOARDING_STEPS[stepIndex] ?? ONBOARDING_STEPS[0]!;
  const getOnboardingStepNumber = useCallback(
    (stepId: OnboardingStepId) =>
      ONBOARDING_STEPS.findIndex((step) => step.id === stepId) + 1,
    [],
  );
  const captureOnboardingStepEvent = useCallback(
    (
      event: "onboarding_step_viewed" | "onboarding_step_completed",
      stepId: OnboardingStepId,
    ) => {
      capturePosthogEvent(event, {
        step_id: stepId,
        step_number: getOnboardingStepNumber(stepId),
        total_steps: ONBOARDING_STEPS.length,
      });
    },
    [getOnboardingStepNumber],
  );
  const profileMissingField = getNextIncompleteProfileField(profileDraft);
  const listingMissingField = getNextIncompleteListingField(listingDraft);

  useEffect(() => {
    if (!rawStepParam) {
      return;
    }

    const isValidStep = ONBOARDING_STEPS.some(
      (step) => step.id === rawStepParam,
    );
    if (isValidStep) {
      return;
    }

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("step");
    const nextQuery = nextParams.toString();
    router.replace(
      nextQuery ? `${onboardingPath}?${nextQuery}` : onboardingPath,
      {
        scroll: false,
      },
    );
  }, [onboardingPath, rawStepParam, router, searchParams]);

  useEffect(() => {
    if (viewedOnboardingStepsRef.current.has(currentStep.id)) {
      return;
    }

    viewedOnboardingStepsRef.current.add(currentStep.id);
    captureOnboardingStepEvent("onboarding_step_viewed", currentStep.id);
    if (currentStep.id === "start-membership") {
      capturePosthogEvent("onboarding_membership_screen_viewed", {
        source: "onboarding-step",
      });
    }
  }, [captureOnboardingStepEvent, currentStep.id]);

  const progressValue = ((stepIndex + 1) / ONBOARDING_STEPS.length) * 100;
  const selectedCultivarImageUrl =
    selectedCultivarDetailsQuery.data?.ahsImageUrl ?? null;
  const persistedProfileTitle = profileQuery.data?.title?.trim() ?? "";
  const persistedProfileDescription =
    profileQuery.data?.description?.trim() ?? "";
  const persistedProfileLocation = profileQuery.data?.location?.trim() ?? "";
  const profileDraftImageUrl = normalizePersistedImageUrl(
    profileDraft.profileImageUrl,
  );
  const selectedStarterImagePreviewUrl = normalizePersistedImageUrl(
    selectedStarterImageUrl,
  );
  const profileNamePreview =
    profileDraft.gardenName.trim() ||
    persistedProfileTitle ||
    DEFAULT_GARDEN_NAME_PLACEHOLDER;
  const profileDescriptionPreview =
    profileDraft.description.trim() ||
    persistedProfileDescription ||
    DEFAULT_PROFILE_DESCRIPTION_PLACEHOLDER;
  const profileLocationPreview =
    profileDraft.location.trim() ||
    persistedProfileLocation ||
    DEFAULT_LOCATION_PLACEHOLDER;
  const profileImagePreviewUrl =
    pendingStarterPreviewUrl ??
    pendingProfileUploadPreviewUrl ??
    profileDraftImageUrl ??
    selectedStarterImagePreviewUrl ??
    PROFILE_PLACEHOLDER_IMAGE;
  const earliestPersistedProfileImage = useMemo(() => {
    if (!profileQuery.data?.id) {
      return null;
    }

    const earliestProfileImage = getEarliestByCreatedAt(
      (imagesQuery.data ?? []).filter(
        (image) => image.userProfileId === profileQuery.data?.id,
      ),
    );

    if (!earliestProfileImage) {
      return null;
    }

    return {
      id: earliestProfileImage.id,
      url: normalizePersistedImageUrl(earliestProfileImage.url),
    };
  }, [imagesQuery.data, profileQuery.data?.id]);
  const existingProfileImageUrl = useMemo(() => {
    const candidate = earliestPersistedProfileImage?.url;
    if (!candidate) {
      return null;
    }

    return isStarterProfileImageUrl(candidate) ? null : candidate;
  }, [earliestPersistedProfileImage]);
  useEffect(() => {
    if (
      !profileQuery.data?.id ||
      !imagesQuery.isFetched ||
      existingProfileImageUrl ||
      profileImageWasEditedRef.current
    ) {
      return;
    }

    const fallbackStarterImageUrl =
      selectedStarterImageUrl ?? DEFAULT_STARTER_IMAGE_URL;
    if (!fallbackStarterImageUrl) {
      return;
    }

    setSelectedStarterImageUrl(fallbackStarterImageUrl);
    setProfileDraft((previous) => ({
      ...previous,
      profileImageUrl: previous.profileImageUrl ?? fallbackStarterImageUrl,
    }));
  }, [
    existingProfileImageUrl,
    imagesQuery.isFetched,
    profileQuery.data?.id,
    selectedStarterImageUrl,
  ]);
  const listingTitleDraftValue = listingDraft.title.trim();
  const listingDescriptionDraftValue = listingDraft.description.trim();
  const persistedListingTitle = earliestExistingListing?.title?.trim() ?? "";
  const persistedListingDescription =
    earliestExistingListing?.description?.trim() ?? "";
  const persistedListingPrice = earliestExistingListing?.price ?? null;
  const listingIdForPreview =
    savedListingId ?? earliestExistingListing?.id ?? null;
  const persistedListingImageUrl = useMemo(() => {
    if (!listingIdForPreview) {
      return null;
    }

    const earliestListingImage = getEarliestByCreatedAt(
      (imagesQuery.data ?? []).filter(
        (image) => image.listingId === listingIdForPreview,
      ),
    );
    return earliestListingImage?.url ?? null;
  }, [imagesQuery.data, listingIdForPreview]);
  const listingImagePreviewUrl =
    pendingListingUploadPreviewUrl ??
    normalizePersistedImageUrl(selectedListingImageUrl) ??
    persistedListingImageUrl ??
    selectedCultivarImageUrl ??
    ONBOARDING_LISTING_DEFAULTS.fallbackImageUrl;
  const listingTitlePreview =
    listingTitleDraftValue ||
    persistedListingTitle ||
    DEFAULT_LISTING_TITLE_PLACEHOLDER;
  const listingDescriptionPreview =
    listingDescriptionDraftValue ||
    persistedListingDescription ||
    DEFAULT_LISTING_DESCRIPTION_PLACEHOLDER;
  const listingDescriptionForBuyerContactPreview =
    listingDescriptionDraftValue ||
    persistedListingDescription ||
    DEFAULT_LISTING_DESCRIPTION_PLACEHOLDER;
  const listingPriceForBuyerContactPreview =
    listingDraft.price ??
    persistedListingPrice ??
    ONBOARDING_LISTING_DEFAULTS.contactPreviewFallbackPrice;
  const isBuyerContactPreviewHydrating =
    profileQuery.isPending || listingQuery.isPending;
  const listingDescriptionCharacterCount = listingDescriptionDraftValue.length;
  const isListingDescriptionTooShort =
    listingDescriptionCharacterCount > 0 &&
    listingDescriptionCharacterCount <
      ONBOARDING_LISTING_DESCRIPTION_GUIDANCE.minLength;
  const isListingDescriptionTooLong =
    listingDescriptionCharacterCount >
    ONBOARDING_LISTING_DESCRIPTION_GUIDANCE.maxLength;
  const isListingDescriptionInRecommendedRange =
    listingDescriptionCharacterCount >=
      ONBOARDING_LISTING_DESCRIPTION_GUIDANCE.minLength &&
    listingDescriptionCharacterCount <=
      ONBOARDING_LISTING_DESCRIPTION_GUIDANCE.maxLength;
  const listingContinueChecklist = [
    {
      key: "cultivar",
      label: "Link to a registered cultivar",
      done: listingDraft.cultivarReferenceId !== null,
      required: true,
    },
    {
      key: "title",
      label: "Add a listing name",
      done: listingDraft.title.trim().length > 0,
      required: true,
    },
    {
      key: "price",
      label: "Add a price",
      done: listingDraft.price !== null,
      required: false,
    },
    {
      key: "description",
      label: "Add a description",
      done: listingDraft.description.trim().length > 0,
      required: false,
    },
    {
      key: "photo",
      label: "Add a photo",
      done: Boolean(selectedListingImageId),
      required: false,
    },
  ] as const;
  const profileContinueChecklist = [
    {
      key: "image",
      label: "Choose a profile image",
      done: profileDraft.profileImageUrl !== null,
      required: true,
    },
    {
      key: "seller-name",
      label: "Add your seller name",
      done: profileDraft.gardenName.trim().length > 0,
      required: true,
    },
    {
      key: "description",
      label: "Add a seller description",
      done: profileDraft.description.trim().length > 0,
      required: false,
    },
    {
      key: "location",
      label: "Add your location",
      done: profileDraft.location.trim().length > 0,
      required: false,
    },
  ] as const;
  const profileDescriptionCharacterCount =
    profileDraft.description.trim().length;
  const isProfileDescriptionTooShort =
    profileDescriptionCharacterCount > 0 &&
    profileDescriptionCharacterCount <
      ONBOARDING_PROFILE_DESCRIPTION_SEO_GUIDANCE.minLength;
  const isProfileDescriptionTooLong =
    profileDescriptionCharacterCount >
    ONBOARDING_PROFILE_DESCRIPTION_SEO_GUIDANCE.maxLength;
  const isProfileDescriptionInRecommendedRange =
    profileDescriptionCharacterCount >=
      ONBOARDING_PROFILE_DESCRIPTION_SEO_GUIDANCE.minLength &&
    profileDescriptionCharacterCount <=
      ONBOARDING_PROFILE_DESCRIPTION_SEO_GUIDANCE.maxLength;

  const clearPendingStarterImage = useCallback(() => {
    setPendingStarterPreviewUrl((previousPreviewUrl) => {
      if (previousPreviewUrl) {
        URL.revokeObjectURL(previousPreviewUrl);
      }

      return null;
    });
    setPendingStarterImageBlob(null);
  }, []);

  const clearPendingProfileUpload = useCallback(() => {
    setPendingProfileUploadPreviewUrl((previousPreviewUrl) => {
      if (previousPreviewUrl) {
        URL.revokeObjectURL(previousPreviewUrl);
      }
      return null;
    });
    setPendingProfileUploadBlob(null);
  }, []);

  const clearPendingListingUpload = useCallback(() => {
    setPendingListingUploadPreviewUrl((previousPreviewUrl) => {
      if (previousPreviewUrl) {
        URL.revokeObjectURL(previousPreviewUrl);
      }
      return null;
    });
    setPendingListingUploadBlob(null);
  }, []);

  const cancelStarterImageGeneration = useCallback(() => {
    if (starterImageGenerationTimeoutRef.current !== null) {
      window.clearTimeout(starterImageGenerationTimeoutRef.current);
      starterImageGenerationTimeoutRef.current = null;
    }

    starterImageGenerationRequestIdRef.current += 1;
    setIsGeneratingStarterImage(false);
  }, []);

  useEffect(() => {
    if (!existingProfileImageUrl || profileImageWasEditedRef.current) {
      return;
    }

    cancelStarterImageGeneration();
    clearPendingStarterImage();
    clearPendingProfileUpload();
    setUseExistingProfileImage(true);
    setProfileImageInputMode("upload");
    setSelectedStarterImageUrl(null);
    setProfileDraft((previous) => ({
      ...previous,
      profileImageUrl: existingProfileImageUrl,
    }));
  }, [
    cancelStarterImageGeneration,
    clearPendingProfileUpload,
    clearPendingStarterImage,
    existingProfileImageUrl,
  ]);

  const scheduleStarterImageGeneration = useCallback(
    ({
      baseImageUrl,
      gardenName,
      debounceMs,
    }: {
      baseImageUrl: string;
      gardenName: string;
      debounceMs: number;
    }) => {
      cancelStarterImageGeneration();
      const requestId = starterImageGenerationRequestIdRef.current;
      setIsGeneratingStarterImage(true);

      starterImageGenerationTimeoutRef.current = window.setTimeout(() => {
        void (async () => {
          try {
            const generatedImage = await generateStarterImageWithGardenName({
              baseImageUrl,
              gardenName,
            });

            if (starterImageGenerationRequestIdRef.current !== requestId) {
              URL.revokeObjectURL(generatedImage.previewUrl);
              return;
            }

            setPendingStarterImageBlob(generatedImage.blob);
            setPendingStarterPreviewUrl((previousPreviewUrl) => {
              if (previousPreviewUrl) {
                URL.revokeObjectURL(previousPreviewUrl);
              }

              return generatedImage.previewUrl;
            });
            setProfileDraft((previous) => ({
              ...previous,
              profileImageUrl: generatedImage.previewUrl,
            }));
          } catch (error) {
            if (starterImageGenerationRequestIdRef.current !== requestId) {
              return;
            }

            toast.error("Could not generate starter image", {
              description: getErrorMessage(error),
            });
          } finally {
            if (starterImageGenerationRequestIdRef.current === requestId) {
              setIsGeneratingStarterImage(false);
              starterImageGenerationTimeoutRef.current = null;
            }
          }
        })();
      }, debounceMs);
    },
    [cancelStarterImageGeneration],
  );

  useEffect(() => {
    if (!applyStarterNameOverlay || profileImageInputMode !== "starter") {
      return;
    }

    if (!selectedStarterImageUrl) {
      return;
    }

    if (
      profileDraft.profileImageUrl &&
      profileDraft.profileImageUrl !== selectedStarterImageUrl
    ) {
      return;
    }

    scheduleStarterImageGeneration({
      baseImageUrl: selectedStarterImageUrl,
      gardenName:
        profileDraft.gardenName.trim() || DEFAULT_GARDEN_NAME_PLACEHOLDER,
      debounceMs: 0,
    });
  }, [
    applyStarterNameOverlay,
    profileDraft.gardenName,
    profileDraft.profileImageUrl,
    profileImageInputMode,
    scheduleStarterImageGeneration,
    selectedStarterImageUrl,
  ]);

  const focusProfileField = (field: ProfileOnboardingField) => {
    setFocusedProfileField(field);

    if (field === "gardenName") {
      gardenNameInputRef.current?.focus();
      return;
    }

    if (field === "location") {
      gardenLocationInputRef.current?.focus();
      return;
    }

    if (field === "description") {
      gardenDescriptionInputRef.current?.focus();
      return;
    }

    profileImageEditorRef.current?.focus();
    profileImageEditorRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  };

  const focusListingField = (field: ListingOnboardingField) => {
    setActiveListingField(field);

    if (field === "title") {
      listingTitleInputRef.current?.focus();
      return;
    }

    if (field === "price") {
      const priceInput = document.getElementById("listing-price");
      if (priceInput instanceof HTMLInputElement) {
        priceInput.focus();
      }
      return;
    }

    if (field === "description") {
      listingDescriptionInputRef.current?.focus();
      return;
    }

    if (field === "cultivar") {
      listingCultivarRef.current?.focus();
      listingCultivarRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      return;
    }

    listingImageEditorRef.current?.focus();
    listingImageEditorRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  };

  const handleProfileImagePick = (
    url: string,
    starterImageUrl: string | null = null,
    _imageId: string | null = null,
  ) => {
    cancelStarterImageGeneration();
    clearPendingStarterImage();

    const nextDraft = {
      ...profileDraft,
      profileImageUrl: url,
    };

    setProfileDraft(nextDraft);
    setSelectedStarterImageUrl(starterImageUrl);
  };

  const handleDeferredProfileImageReady = (file: Blob) => {
    profileImageWasEditedRef.current = true;
    setUseExistingProfileImage(false);
    clearPendingProfileUpload();
    const previewUrl = URL.createObjectURL(file);
    setPendingProfileUploadBlob(file);
    setPendingProfileUploadPreviewUrl(previewUrl);
    setProfileImageInputMode("upload");
    handleProfileImagePick(previewUrl, null, null);
  };

  const handleDeferredListingImageReady = (file: Blob) => {
    clearPendingListingUpload();
    const previewUrl = URL.createObjectURL(file);
    setPendingListingUploadBlob(file);
    setPendingListingUploadPreviewUrl(previewUrl);
    setSelectedListingImageId(null);
    setSelectedListingImageUrl(previewUrl);
    setActiveListingField("image");
  };

  const handleDeferredListingImageCleared = () => {
    clearPendingListingUpload();
    setSelectedListingImageId(null);
    setSelectedListingImageUrl(null);
    setActiveListingField("image");
  };

  const handleStarterImageSelect = (baseImageUrl: string) => {
    profileImageWasEditedRef.current = true;
    setUseExistingProfileImage(false);
    setProfileImageInputMode("starter");
    clearPendingProfileUpload();
    setSelectedStarterImageUrl(baseImageUrl);

    if (!applyStarterNameOverlay) {
      cancelStarterImageGeneration();
      clearPendingStarterImage();
      setProfileDraft((previous) => ({
        ...previous,
        profileImageUrl: baseImageUrl,
      }));
      return;
    }

    scheduleStarterImageGeneration({
      baseImageUrl,
      gardenName:
        profileDraft.gardenName.trim() || DEFAULT_GARDEN_NAME_PLACEHOLDER,
      debounceMs: 0,
    });
  };

  const handleDeferredProfileImageCleared = () => {
    profileImageWasEditedRef.current = true;
    setUseExistingProfileImage(false);
    clearPendingProfileUpload();

    const starterImageUrl = selectedStarterImageUrl ?? DEFAULT_STARTER_IMAGE_URL;
    if (starterImageUrl) {
      setSelectedStarterImageUrl((previous) => previous ?? starterImageUrl);
      setProfileDraft((previous) => ({
        ...previous,
        profileImageUrl: pendingStarterPreviewUrl ?? starterImageUrl,
      }));
      return;
    }

    setProfileDraft((previous) => ({
      ...previous,
      profileImageUrl: null,
    }));
  };

  const handleStarterOverlayChange = (enabled: boolean) => {
    profileImageWasEditedRef.current = true;
    setUseExistingProfileImage(false);
    setApplyStarterNameOverlay(enabled);

    if (!selectedStarterImageUrl) {
      return;
    }

    if (!enabled) {
      cancelStarterImageGeneration();
      clearPendingStarterImage();
      setProfileDraft((previous) => ({
        ...previous,
        profileImageUrl: selectedStarterImageUrl,
      }));
      return;
    }

    scheduleStarterImageGeneration({
      baseImageUrl: selectedStarterImageUrl,
      gardenName:
        profileDraft.gardenName.trim() || DEFAULT_GARDEN_NAME_PLACEHOLDER,
      debounceMs: 0,
    });
  };

  const handleUseExistingProfileImageChange = (enabled: boolean) => {
    if (!existingProfileImageUrl) {
      return;
    }

    if (enabled) {
      profileImageWasEditedRef.current = false;
      setUseExistingProfileImage(true);
      setProfileImageInputMode("upload");
      cancelStarterImageGeneration();
      clearPendingStarterImage();
      clearPendingProfileUpload();
      setSelectedStarterImageUrl(null);
      setProfileDraft((previous) => ({
        ...previous,
        profileImageUrl: existingProfileImageUrl,
      }));
      return;
    }

    profileImageWasEditedRef.current = true;
    setUseExistingProfileImage(false);
    const starterImageUrl = selectedStarterImageUrl ?? DEFAULT_STARTER_IMAGE_URL;
    if (starterImageUrl) {
      handleStarterImageSelect(starterImageUrl);
      return;
    }

    setProfileDraft((previous) => ({
      ...previous,
      profileImageUrl: null,
    }));
  };

  const createOnboardingProfileImage = async ({
    profileId,
    selectedImageUrl,
    selectedImageKey,
  }: {
    profileId: string;
    selectedImageUrl: string;
    selectedImageKey: string;
  }) => {
    await createImageMutation.mutateAsync({
      type: "profile",
      referenceId: profileId,
      url: selectedImageUrl,
      key: selectedImageKey,
    });
  };

  const createOnboardingListingImage = async ({
    listingId,
    selectedImageUrl,
    selectedImageKey,
  }: {
    listingId: string;
    selectedImageUrl: string;
    selectedImageKey: string;
  }) => {
    const createdImage = await createImageMutation.mutateAsync({
      type: "listing",
      referenceId: listingId,
      url: selectedImageUrl,
      key: selectedImageKey,
    });
    setSelectedListingImageId(createdImage.id);
  };

  const applyAhsSelection = useCallback((result: AhsSearchResult) => {
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
  }, []);

  const handleAhsSelect = (result: AhsSearchResult) => {
    if (!result.cultivarReferenceId) {
      toast.error("This cultivar cannot be linked yet.");
      return;
    }

    applyAhsSelection(result);
  };

  const ensureListingDraftRecord = useCallback(async () => {
    if (savedListingId) {
      return savedListingId;
    }

    const createdListing = await createListingMutation.mutateAsync({
      title:
        listingDraft.title.trim() || ONBOARDING_LISTING_DEFAULTS.draftTitle,
      cultivarReferenceId: listingDraft.cultivarReferenceId,
    });

    await updateListingMutation.mutateAsync({
      id: createdListing.id,
      data: {
        status: ONBOARDING_LISTING_DEFAULTS.defaultStatus,
      },
    });

    setSavedListingId(createdListing.id);
    await Promise.all([
      utils.dashboardDb.listing.list.invalidate(),
      utils.dashboardDb.image.list.invalidate(),
    ]);

    return createdListing.id;
  }, [
    createListingMutation,
    listingDraft.cultivarReferenceId,
    listingDraft.title,
    savedListingId,
    updateListingMutation,
    utils.dashboardDb.image.list,
    utils.dashboardDb.listing.list,
  ]);

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
  ]);

  useEffect(() => {
    if (currentStep.id !== "build-listing-card") {
      return;
    }

    if (savedListingId || hasInitializedListingDraft.current) {
      return;
    }

    if (!listingQuery.isFetched || (listingQuery.data?.length ?? 0) > 0) {
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
    currentStep.id,
    ensureListingDraftRecord,
    listingQuery.data,
    listingQuery.isFetched,
    savedListingId,
  ]);

  const saveProfileDraft = async () => {
    if (!profileQuery.data?.id) {
      toast.error("Unable to load your profile.");
      return false;
    }

    if (!isProfileOnboardingDraftComplete(profileDraft)) {
      focusProfileField(profileMissingField ?? "gardenName");
      toast.error("Complete image and seller name first.");
      return false;
    }

    setIsSavingProfile(true);

    try {
      let uploadedProfileImage: { url: string; key: string } | null = null;

      if (pendingProfileUploadBlob) {
        const { url, key } = await uploadOnboardingImageBlob({
          blob: pendingProfileUploadBlob,
          type: "profile",
          referenceId: profileQuery.data.id,
          getPresignedUrl: getImagePresignedUrlMutation.mutateAsync,
        });

        uploadedProfileImage = { url, key };
        clearPendingProfileUpload();
        setProfileDraft((previous) => ({
          ...previous,
          profileImageUrl: url,
        }));
      } else if (pendingStarterImageBlob && profileDraft.profileImageUrl) {
        try {
          const { url, key } = await uploadOnboardingImageBlob({
            blob: pendingStarterImageBlob,
            type: "profile",
            referenceId: profileQuery.data.id,
            getPresignedUrl: getImagePresignedUrlMutation.mutateAsync,
          });

          uploadedProfileImage = { url, key };
          clearPendingStarterImage();

          setProfileDraft((previous) => ({
            ...previous,
            profileImageUrl: url,
          }));
        } catch (error) {
          const fallbackStarterImageUrl =
            selectedStarterImageUrl ?? DEFAULT_STARTER_IMAGE_URL;
          clearPendingStarterImage();
          setProfileDraft((previous) => ({
            ...previous,
            profileImageUrl: fallbackStarterImageUrl,
          }));
          console.error(
            "Failed to upload starter overlay image during onboarding; using starter image fallback.",
            error,
          );
        }
      }

      await updateProfileMutation.mutateAsync({
        data: {
          title: profileDraft.gardenName.trim(),
          location: profileDraft.location.trim(),
          description: profileDraft.description.trim(),
        },
      });

      if (uploadedProfileImage) {
        try {
          if (earliestPersistedProfileImage?.id) {
            await updateImageMutation.mutateAsync({
              type: "profile",
              referenceId: profileQuery.data.id,
              imageId: earliestPersistedProfileImage.id,
              url: uploadedProfileImage.url,
            });
          } else {
            await createOnboardingProfileImage({
              profileId: profileQuery.data.id,
              selectedImageUrl: uploadedProfileImage.url,
              selectedImageKey: uploadedProfileImage.key,
            });
          }
        } catch (error) {
          console.error(
            "Failed to save onboarding profile image record.",
            error,
          );
        }
      }

      await Promise.all([
        utils.dashboardDb.userProfile.get.invalidate(),
        utils.dashboardDb.image.list.invalidate(),
      ]);

      capturePosthogEvent("onboarding_profile_saved", {
        has_location: profileDraft.location.trim().length > 0,
        used_starter_image: profileImageInputMode === "starter",
        used_name_overlay: applyStarterNameOverlay,
      });

      return true;
    } catch (error) {
      toast.error("Failed to save profile", {
        description: getErrorMessage(error),
      });
      return false;
    } finally {
      setIsSavingProfile(false);
    }
  };

  const saveListingDraft = async () => {
    if (!isListingOnboardingDraftComplete(listingDraft)) {
      focusListingField(listingMissingField ?? "cultivar");
      toast.error("Complete cultivar and listing name first.");
      return false;
    }

    setIsSavingListing(true);

    try {
      const listingId = await ensureListingDraftRecord();

      if (listingDraft.cultivarReferenceId) {
        await linkAhsMutation.mutateAsync({
          id: listingId,
          cultivarReferenceId: listingDraft.cultivarReferenceId,
          syncName: false,
        });
      }

      await updateListingMutation.mutateAsync({
        id: listingId,
        data: {
          title: listingDraft.title.trim(),
          price: listingDraft.price,
          description: listingDraft.description.trim(),
          status: ONBOARDING_LISTING_DEFAULTS.defaultStatus,
        },
      });

      let listingImageToSave: string | null =
        selectedListingImageUrl ?? selectedCultivarImageUrl ?? null;
      let listingImageKeyToSave: string | null = null;
      let shouldCreateListingImageRecord = false;
      if (pendingListingUploadBlob) {
        const { url, key } = await uploadOnboardingImageBlob({
          blob: pendingListingUploadBlob,
          type: "listing",
          referenceId: listingId,
          getPresignedUrl: getImagePresignedUrlMutation.mutateAsync,
        });
        listingImageToSave = url;
        listingImageKeyToSave = key;
        shouldCreateListingImageRecord = true;
        clearPendingListingUpload();
        setSelectedListingImageUrl(url);
      }

      if (
        listingImageToSave &&
        shouldCreateListingImageRecord &&
        listingImageKeyToSave
      ) {
        await createOnboardingListingImage({
          listingId,
          selectedImageUrl: listingImageToSave,
          selectedImageKey: listingImageKeyToSave,
        });
      }

      await Promise.all([
        utils.dashboardDb.listing.list.invalidate(),
        utils.dashboardDb.image.list.invalidate(),
      ]);

      capturePosthogEvent("onboarding_listing_saved", {
        has_price: listingDraft.price !== null,
        has_custom_image: selectedListingImageUrl !== null,
        has_cultivar_image:
          selectedListingImageUrl === null && selectedCultivarImageUrl !== null,
        cultivar_linked: listingDraft.cultivarReferenceId !== null,
      });

      return true;
    } catch (error) {
      toast.error("Failed to save listing", {
        description: getErrorMessage(error),
      });
      return false;
    } finally {
      setIsSavingListing(false);
    }
  };

  const scrollToTop = useCallback(() => {
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }, []);

  const getStepHref = useCallback(
    (stepId: OnboardingStepId) => {
      const nextParams = new URLSearchParams(searchParams.toString());
      const firstStepId = ONBOARDING_STEPS[0]?.id;

      if (stepId === firstStepId) {
        nextParams.delete("step");
      } else {
        nextParams.set("step", stepId);
      }

      const nextQuery = nextParams.toString();
      return nextQuery ? `${onboardingPath}?${nextQuery}` : onboardingPath;
    },
    [onboardingPath, searchParams],
  );

  const goToStep = useCallback(
    (stepId: OnboardingStepId) => {
      const targetStepIndex = ONBOARDING_STEPS.findIndex(
        (step) => step.id === stepId,
      );

      if (targetStepIndex < 0) {
        return;
      }

      router.push(getStepHref(stepId), { scroll: false });
      scrollToTop();
    },
    [getStepHref, router, scrollToTop],
  );

  const goToNextStep = () => {
    const nextStep =
      ONBOARDING_STEPS[Math.min(stepIndex + 1, ONBOARDING_STEPS.length - 1)];
    if (!nextStep) {
      return;
    }

    goToStep(nextStep.id);
  };

  const goToPreviousStep = () => {
    const previousStep = ONBOARDING_STEPS[Math.max(stepIndex - 1, 0)];
    if (!previousStep) {
      return;
    }

    goToStep(previousStep.id);
  };

  const handlePrimaryAction = async () => {
    switch (currentStep.id) {
      case "build-profile-card": {
        const didSave = await saveProfileDraft();
        if (didSave) {
          captureOnboardingStepEvent(
            "onboarding_step_completed",
            "build-profile-card",
          );
          goToNextStep();
        }
        return;
      }
      case "build-listing-card": {
        const didSave = await saveListingDraft();
        if (didSave) {
          captureOnboardingStepEvent(
            "onboarding_step_completed",
            "build-listing-card",
          );
          goToNextStep();
        }
        return;
      }
      case "preview-buyer-contact": {
        captureOnboardingStepEvent(
          "onboarding_step_completed",
          "preview-buyer-contact",
        );
        capturePosthogEvent("onboarding_aha_reached", {
          milestone: "profile_saved_listing_saved_buyer_flow_seen",
          step_variant: "combined_preview_contact",
        });
        goToNextStep();
        return;
      }
      case "start-membership": {
        clearOnboardingDraftSnapshot();
        captureOnboardingStepEvent(
          "onboarding_step_completed",
          "start-membership",
        );
        router.push("/dashboard");
        return;
      }
      default: {
        goToNextStep();
      }
    }
  };

  const primaryButtonLabel = (() => {
    switch (currentStep.id) {
      case "build-profile-card":
        return isSavingProfile
          ? "Saving profile..."
          : "Save profile and continue";
      case "build-listing-card":
        return isSavingListing
          ? "Saving listing..."
          : "Save listing and continue";
      case "preview-buyer-contact":
        return "Review plans";
      case "start-membership":
        return "Keep unlisted";
      default:
        return "Continue";
    }
  })();

  const primaryButtonDisabled =
    (currentStep.id === "build-profile-card" &&
      (!isProfileOnboardingDraftComplete(profileDraft) ||
        isSavingProfile ||
        isGeneratingStarterImage)) ||
    (currentStep.id === "build-listing-card" &&
      (!isListingOnboardingDraftComplete(listingDraft) || isSavingListing));

  const handleMembershipContinueForNow = useCallback(() => {
    clearOnboardingDraftSnapshot();
    captureOnboardingStepEvent("onboarding_step_completed", "start-membership");
    capturePosthogEvent("onboarding_membership_continue_for_now_clicked", {
      source: "onboarding-step",
    });
  }, [captureOnboardingStepEvent, clearOnboardingDraftSnapshot]);

  const handleSkipOnboarding = () => {
    clearOnboardingDraftSnapshot();
    capturePosthogEvent("onboarding_skipped", {
      step_id: currentStep.id,
      step_index: stepIndex + 1,
    });
    router.push("/dashboard");
  };

  return (
    <div
      className="bg-muted/20 min-h-svh"
      data-testid="start-onboarding-page"
      data-profile-ready={profileQuery.data?.id ? "true" : "false"}
    >
      <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-6 lg:px-8 lg:py-10">
        <header className="space-y-4">
          <div className="space-y-3">
            <Badge variant="secondary" className="w-fit">
              Guided onboarding
            </Badge>
            <h1 className="text-3xl font-bold tracking-tight lg:text-5xl">
              Build your catalog in minutes.
            </h1>
            <p className="text-muted-foreground max-w-3xl text-base lg:text-lg">
              We&apos;ll walk through profile setup and your first listing so
              buyers can discover you before you get started in the dashboard.
              This takes about 2 minutes, and you can edit everything later.
            </p>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 lg:items-center">
              <p className="text-lg leading-tight font-semibold lg:text-xl">
                {currentStep.title}
              </p>
              <Badge
                variant="outline"
                className="mt-0.5 text-xs whitespace-nowrap lg:mt-0"
              >
                Step {stepIndex + 1} of {ONBOARDING_STEPS.length}
              </Badge>
            </div>
          </div>

          <Progress value={progressValue} className="h-2" />

          <div className="pb-1">
            <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {ONBOARDING_STEPS.map((step, index) => {
                const isCurrent = index === stepIndex;
                const isComplete = index < stepIndex;

                return (
                  <Link
                    key={step.id}
                    href={getStepHref(step.id)}
                    scroll={false}
                    onClick={(event) => {
                      if (isCurrent) {
                        event.preventDefault();
                      }
                      scrollToTop();
                    }}
                    aria-current={isCurrent ? "step" : undefined}
                    className={cn(
                      "focus-visible:ring-ring shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:ring-1 focus-visible:outline-none",
                      isCurrent && "border-primary bg-primary/10 text-primary",
                      isComplete &&
                        "border-emerald-500/40 bg-emerald-500/10 text-emerald-700",
                      !isCurrent && !isComplete && "text-muted-foreground",
                    )}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {isComplete ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : null}
                      <span className="lg:hidden">{index + 1}</span>
                      <span className="hidden lg:inline">{step.chipLabel}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </header>

        {currentStep.id === "build-profile-card" ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight">
                Edit your profile
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                This is how customers will see your catalog card on the Catalogs
                page. Edit these fields and watch the preview update live.
              </p>
            </div>

            <OnboardingStepGrid className="lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
              <div className="order-2 space-y-4 lg:order-1">
                <div
                  className={cn(
                    "space-y-2 rounded-lg border p-4 transition-colors",
                    focusedProfileField === "gardenName" &&
                      "border-primary bg-primary/5",
                  )}
                >
                  <Label htmlFor="garden-name">
                    Seller name (shown to buyers)
                  </Label>
                  <Input
                    ref={gardenNameInputRef}
                    id="garden-name"
                    placeholder={DEFAULT_GARDEN_NAME_PLACEHOLDER}
                    value={profileDraft.gardenName}
                    onFocus={() => setFocusedProfileField("gardenName")}
                    onChange={(event) => {
                      const nextGardenName = event.target.value;
                      setProfileDraft((previous) => ({
                        ...previous,
                        gardenName: nextGardenName,
                      }));

                      if (selectedStarterImageUrl && applyStarterNameOverlay) {
                        scheduleStarterImageGeneration({
                          baseImageUrl: selectedStarterImageUrl,
                          gardenName:
                            nextGardenName.trim() ||
                            DEFAULT_GARDEN_NAME_PLACEHOLDER,
                          debounceMs: 150,
                        });
                      }
                    }}
                  />
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    This is your storefront title. Buyers use it to recognize
                    and return to your catalog.
                  </p>
                </div>

                <div
                  ref={profileImageEditorRef}
                  tabIndex={-1}
                  className={cn(
                    "space-y-4 rounded-lg border p-4 transition-colors outline-none",
                    focusedProfileField === "image" &&
                      "border-primary bg-primary/5",
                  )}
                  onFocusCapture={() => setFocusedProfileField("image")}
                  onClick={() => setFocusedProfileField("image")}
                >
                  <div className="space-y-1">
                    <Label>Profile image</Label>
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      Your photo is what customers notice first when scanning
                      catalogs.
                    </p>
                  </div>

                  {existingProfileImageUrl ? (
                    <div className="flex items-start gap-3 rounded-lg border border-dashed p-3">
                      <Checkbox
                        id="use-existing-profile-image"
                        checked={useExistingProfileImage}
                        onCheckedChange={(value) =>
                          handleUseExistingProfileImageChange(value === true)
                        }
                      />
                      <div className="space-y-1 text-sm">
                        <Label
                          htmlFor="use-existing-profile-image"
                          className="cursor-pointer"
                        >
                          Use existing profile image
                        </Label>
                        <p className="text-muted-foreground text-xs leading-relaxed">
                          Keep your current uploaded profile image unless you
                          uncheck this and choose a different one.
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {!useExistingProfileImage ? (
                    <div className="grid gap-2 lg:grid-cols-2">
                      <Button
                        type="button"
                        variant={
                          profileImageInputMode === "starter"
                            ? "default"
                            : "outline"
                        }
                        onClick={() => {
                          setFocusedProfileField("image");
                          profileImageWasEditedRef.current = true;
                          setUseExistingProfileImage(false);
                          setProfileImageInputMode("starter");
                          clearPendingProfileUpload();
                        }}
                      >
                        Use a starter image
                      </Button>
                      <Button
                        type="button"
                        variant={
                          profileImageInputMode === "upload"
                            ? "default"
                            : "outline"
                        }
                        onClick={() => {
                          setFocusedProfileField("image");
                          profileImageWasEditedRef.current = true;
                          setUseExistingProfileImage(false);
                          setProfileImageInputMode("upload");
                        }}
                      >
                        Upload your own image
                      </Button>
                    </div>
                  ) : null}

                  {!useExistingProfileImage && profileImageInputMode === "starter" ? (
                    <div className="space-y-2">
                      <div className="flex items-start gap-3 rounded-lg border border-dashed p-3">
                        <Checkbox
                          id="starter-overlay"
                          checked={applyStarterNameOverlay}
                          onCheckedChange={(value) =>
                            handleStarterOverlayChange(value === true)
                          }
                        />
                        <div className="space-y-1 text-sm">
                          <Label
                            htmlFor="starter-overlay"
                            className="cursor-pointer"
                          >
                            Stamp seller name onto starter image
                          </Label>
                          <p className="text-muted-foreground text-xs leading-relaxed">
                            Good for a quick starter logo. You can replace it
                            with an uploaded image at any time.
                          </p>
                        </div>
                      </div>
                      <div
                        data-testid="onboarding-starter-image-picker"
                        className="overflow-x-auto pb-2"
                      >
                        <div className="grid w-full auto-cols-[calc((100%-2rem)/4.5)] grid-flow-col gap-2">
                          {STARTER_PROFILE_IMAGES.map((image) => (
                            <button
                              key={image.id}
                              type="button"
                              className="w-full text-left disabled:opacity-60"
                              onClick={() => {
                                handleStarterImageSelect(image.url);
                              }}
                              disabled={isGeneratingStarterImage}
                            >
                              <div
                                className={cn(
                                  "relative aspect-square overflow-hidden rounded-md ring-1 transition",
                                  profileDraft.profileImageUrl === image.url ||
                                    selectedStarterImageUrl === image.url
                                    ? "ring-primary ring-2"
                                    : "ring-border/40",
                                )}
                              >
                                <Image
                                  src={image.url}
                                  alt={image.label}
                                  fill
                                  className="object-cover"
                                  sizes={`(max-width: 640px) 33vw, ${IMAGE_CONFIG.SIZES.THUMBNAIL}px`}
                                />
                              </div>
                              <p className="mt-2 text-xs font-medium">
                                {image.label}
                              </p>
                            </button>
                          ))}
                        </div>
                      </div>
                      {isGeneratingStarterImage ? (
                        <p className="text-muted-foreground text-xs">
                          Generating starter image with your garden name...
                        </p>
                      ) : null}
                    </div>
                  ) : !useExistingProfileImage ? (
                    <div className="space-y-2">
                      <p className="text-muted-foreground text-xs leading-relaxed">
                        Drag and drop an image, then crop and adjust it before
                        saving.
                      </p>
                      {profileQuery.data?.id ? (
                        <div className="bg-background rounded-lg border p-3">
                          <OnboardingDeferredImageUpload
                            stagedPreviewUrl={pendingProfileUploadPreviewUrl}
                            onDeferredUploadReady={
                              handleDeferredProfileImageReady
                            }
                            onDeferredUploadCleared={
                              handleDeferredProfileImageCleared
                            }
                          />
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-sm">
                          Loading profile uploader...
                        </p>
                      )}
                    </div>
                  ) : null}

                  {useExistingProfileImage ? (
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      Using your current uploaded profile image.
                    </p>
                  ) : null}
                </div>

                <div
                  className={cn(
                    "space-y-2 rounded-lg border p-4 transition-colors",
                    focusedProfileField === "location" &&
                      "border-primary bg-primary/5",
                  )}
                >
                  <Label htmlFor="garden-location">
                    Location (recommended)
                  </Label>
                  <Input
                    ref={gardenLocationInputRef}
                    id="garden-location"
                    placeholder={DEFAULT_LOCATION_PLACEHOLDER}
                    value={profileDraft.location}
                    onFocus={() => setFocusedProfileField("location")}
                    onChange={(event) =>
                      setProfileDraft((previous) => ({
                        ...previous,
                        location: event.target.value,
                      }))
                    }
                  />
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Buyers often filter by region. Add your city and state to
                    improve qualified inquiries.
                  </p>
                </div>

                <div
                  className={cn(
                    "space-y-2 rounded-lg border p-4 transition-colors",
                    focusedProfileField === "description" &&
                      "border-primary bg-primary/5",
                  )}
                >
                  <Label htmlFor="garden-description">Seller description</Label>
                  <Textarea
                    ref={gardenDescriptionInputRef}
                    id="garden-description"
                    rows={5}
                    placeholder={DEFAULT_PROFILE_DESCRIPTION_PLACEHOLDER}
                    value={profileDraft.description}
                    onFocus={() => setFocusedProfileField("description")}
                    onChange={(event) =>
                      setProfileDraft((previous) => ({
                        ...previous,
                        description: event.target.value,
                      }))
                    }
                  />
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    {ONBOARDING_PROFILE_DESCRIPTION_SEO_GUIDANCE.conciseTip}
                  </p>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <p
                      className={cn(
                        "leading-relaxed",
                        isProfileDescriptionTooShort ||
                          isProfileDescriptionTooLong
                          ? "text-yellow-700"
                          : isProfileDescriptionInRecommendedRange
                            ? "text-emerald-700"
                            : "text-muted-foreground",
                      )}
                    >
                      {profileDescriptionCharacterCount === 0
                        ? getDescriptionLengthAimText({
                            minLength:
                              ONBOARDING_PROFILE_DESCRIPTION_SEO_GUIDANCE.minLength,
                            maxLength:
                              ONBOARDING_PROFILE_DESCRIPTION_SEO_GUIDANCE.maxLength,
                          })
                        : isProfileDescriptionTooShort
                          ? `Add at least ${ONBOARDING_PROFILE_DESCRIPTION_SEO_GUIDANCE.minLength - profileDescriptionCharacterCount} more characters so buyers quickly understand your catalog.`
                          : isProfileDescriptionTooLong
                            ? `Trim about ${profileDescriptionCharacterCount - ONBOARDING_PROFILE_DESCRIPTION_SEO_GUIDANCE.maxLength} characters for cleaner Google snippets.`
                            : "Great length for search and buyer scanning."}
                    </p>
                    <p
                      className={cn(
                        "font-medium",
                        isProfileDescriptionTooShort ||
                          isProfileDescriptionTooLong
                          ? "text-yellow-700"
                          : isProfileDescriptionInRecommendedRange
                            ? "text-emerald-700"
                            : "text-muted-foreground",
                      )}
                    >
                      {profileDescriptionCharacterCount} chars
                    </p>
                  </div>
                </div>

                {!profileMissingField ? (
                  isProfileDescriptionTooShort ? (
                    <p className="text-sm font-medium text-yellow-700">
                      Profile card is ready. Add{" "}
                      {ONBOARDING_PROFILE_DESCRIPTION_SEO_GUIDANCE.minLength -
                        profileDescriptionCharacterCount}{" "}
                      more characters to strengthen search visibility.
                    </p>
                  ) : isProfileDescriptionTooLong ? (
                    <p className="text-sm font-medium text-yellow-700">
                      Profile card is ready. Consider trimming{" "}
                      {profileDescriptionCharacterCount -
                        ONBOARDING_PROFILE_DESCRIPTION_SEO_GUIDANCE.maxLength}{" "}
                      characters so Google snippets stay readable.
                    </p>
                  ) : (
                    <p className="text-sm font-medium text-emerald-700">
                      Profile card is ready to save.
                    </p>
                  )
                ) : null}
              </div>

              <div className="order-1 space-y-6 lg:order-2">
                <div className="space-y-1">
                  <h3 className="text-xl font-semibold tracking-tight">
                    Catalog preview
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    This is how your profile card appears to browsing buyers.
                  </p>
                </div>

                <div className="bg-card relative w-full max-w-sm overflow-hidden rounded-2xl border">
                  <div className="bg-muted relative aspect-square overflow-hidden border-b">
                    <Image
                      src={profileImagePreviewUrl}
                      alt="Profile preview"
                      fill
                      className="object-cover"
                      sizes="(max-width: 1279px) 100vw, 460px"
                      unoptimized
                    />
                    <HotspotButton
                      className="top-3 left-3"
                      label="Edit profile image"
                      active={focusedProfileField === "image"}
                      onClick={() => focusProfileField("image")}
                    />
                  </div>

                  <div className="space-y-4 p-4">
                    <div className="relative pl-10">
                      <HotspotButton
                        className="top-1 left-0"
                        label="Edit garden name"
                        active={focusedProfileField === "gardenName"}
                        onClick={() => focusProfileField("gardenName")}
                      />
                      <p className="text-4xl leading-tight font-bold tracking-tight">
                        {profileNamePreview}
                      </p>
                    </div>

                    <div className="relative pl-10">
                      <HotspotButton
                        className="top-0 left-0"
                        label="Edit location"
                        active={focusedProfileField === "location"}
                        onClick={() => focusProfileField("location")}
                      />
                      <Badge
                        variant="secondary"
                        className="inline-flex items-center gap-1 pr-2 text-base"
                      >
                        <MapPin className="h-4 w-4" />
                        {profileLocationPreview}
                      </Badge>
                    </div>

                    <div className="relative pl-10">
                      <HotspotButton
                        className="top-1 left-0"
                        label="Edit description"
                        active={focusedProfileField === "description"}
                        onClick={() => focusProfileField("description")}
                      />
                      <p className="text-muted-foreground text-lg leading-relaxed">
                        {profileDescriptionPreview}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xl font-semibold tracking-tight">
                    What this unlocks
                  </h3>
                  <div className="space-y-3 text-sm">
                    <PreviewBullet text="Collectors can identify your catalog quickly by image + name." />
                    <PreviewBullet text="Your description helps the right buyers click through." />
                    <PreviewBullet text="This same profile info is reused across public pages." />
                  </div>
                </div>
              </div>
            </OnboardingStepGrid>

            <div className="space-y-2">
              <p className="text-sm font-semibold">
                To continue, complete this checklist
              </p>
              <ul className="space-y-1.5 text-sm">
                {profileContinueChecklist.map((item) => (
                  <li key={item.key} className="flex items-start gap-2">
                    {item.done ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-700" />
                    ) : (
                      <Circle className="text-muted-foreground mt-0.5 h-4 w-4" />
                    )}
                    <span
                      className={cn(
                        item.done ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {item.label}
                      {!item.required ? (
                        <span className="text-muted-foreground">
                          {" "}
                          (optional)
                        </span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}

        {currentStep.id === "build-listing-card" ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight">
                Edit your first listing
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                This is how buyers will see one of your listing cards. Edit
                these fields and watch the card preview update live.
              </p>
            </div>

            <OnboardingStepGrid className="lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
              <div className="order-2 space-y-4 lg:order-1">
                <div
                  ref={listingCultivarRef}
                  tabIndex={-1}
                  className={cn(
                    "space-y-3 rounded-lg border p-4 transition-colors outline-none",
                    activeListingField === "cultivar" &&
                      "border-primary bg-primary/5",
                  )}
                  onFocusCapture={() => setActiveListingField("cultivar")}
                  onClick={() => setActiveListingField("cultivar")}
                >
                  <Label>Link a daylily variety (guided starter)</Label>
                  <OnboardingAhsListingSelect
                    onSelect={handleAhsSelect}
                    selectedLabel={selectedCultivarName}
                    predefinedOptions={onboardingCultivarOptions}
                    isPredefinedOptionsLoading={
                      isLoadingOnboardingCultivarOptions
                    }
                    limitedSearchMessage={
                      ONBOARDING_LISTING_DEFAULTS.limitedSearchMessage
                    }
                  />
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    We start you with a linked starter variety by default so
                    your preview looks realistic. You can click to change it
                    now, and create unlinked listings later from your dashboard.
                  </p>
                  {selectedCultivarName ? (
                    <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3">
                      <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide text-emerald-800 uppercase">
                        <CheckCircle2 className="h-4 w-4" />
                        Selected cultivar
                      </p>
                      <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
                        You&apos;re viewing the Daylily Database reference card
                        for this variety. The database includes details and
                        images for 100,000+ listings.
                      </p>
                      {selectedCultivarDetailsQuery.data ? (
                        <div className="bg-background mt-3 rounded-lg border p-3">
                          <AhsListingDisplay
                            ahsListing={selectedCultivarDetailsQuery.data}
                            className="mt-1"
                          />
                        </div>
                      ) : (
                        <p className="text-muted-foreground mt-3 text-xs">
                          Loading variety reference details...
                        </p>
                      )}
                    </div>
                  ) : null}
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Linking a variety gives buyers trusted cultivar details and
                    imagery.
                  </p>
                </div>

                <div
                  className={cn(
                    "space-y-2 rounded-lg border p-4 transition-colors",
                    activeListingField === "title" &&
                      "border-primary bg-primary/5",
                  )}
                >
                  <Label htmlFor="listing-title">Listing title</Label>
                  <Input
                    ref={listingTitleInputRef}
                    id="listing-title"
                    value={listingDraft.title}
                    onFocus={() => setActiveListingField("title")}
                    onChange={(event) =>
                      setListingDraft((previous) => ({
                        ...previous,
                        title: event.target.value,
                      }))
                    }
                    placeholder={DEFAULT_LISTING_TITLE_PLACEHOLDER}
                  />
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Buyers scan titles first. Keep it clear and specific to what
                    you are offering.
                  </p>
                </div>

                <div
                  className={cn(
                    "space-y-2 rounded-lg border p-4 transition-colors",
                    activeListingField === "price" &&
                      "border-primary bg-primary/5",
                  )}
                >
                  <Label htmlFor="listing-price">Price</Label>
                  <CurrencyInput
                    id="listing-price"
                    value={listingDraft.price}
                    onFocus={() => setActiveListingField("price")}
                    onChange={(value) =>
                      setListingDraft((previous) => ({
                        ...previous,
                        price: value,
                      }))
                    }
                    placeholder="25"
                  />
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Optional in onboarding. Add a price now if you want to
                    preview add-to-cart behavior.
                  </p>
                </div>

                <div
                  className={cn(
                    "space-y-2 rounded-lg border p-4 transition-colors",
                    activeListingField === "description" &&
                      "border-primary bg-primary/5",
                  )}
                >
                  <Label htmlFor="listing-description">Description</Label>
                  <Textarea
                    ref={listingDescriptionInputRef}
                    id="listing-description"
                    rows={5}
                    value={listingDraft.description}
                    onFocus={() => setActiveListingField("description")}
                    onChange={(event) =>
                      setListingDraft((previous) => ({
                        ...previous,
                        description: event.target.value,
                      }))
                    }
                    placeholder={DEFAULT_LISTING_DESCRIPTION_PLACEHOLDER}
                  />
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    {ONBOARDING_LISTING_DESCRIPTION_GUIDANCE.conciseTip}
                  </p>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <p
                      className={cn(
                        "leading-relaxed",
                        isListingDescriptionTooShort ||
                          isListingDescriptionTooLong
                          ? "text-yellow-700"
                          : isListingDescriptionInRecommendedRange
                            ? "text-emerald-700"
                            : "text-muted-foreground",
                      )}
                    >
                      {listingDescriptionCharacterCount === 0
                        ? getDescriptionLengthAimText({
                            minLength:
                              ONBOARDING_LISTING_DESCRIPTION_GUIDANCE.minLength,
                            maxLength:
                              ONBOARDING_LISTING_DESCRIPTION_GUIDANCE.maxLength,
                          })
                        : isListingDescriptionTooShort
                          ? `Add at least ${ONBOARDING_LISTING_DESCRIPTION_GUIDANCE.minLength - listingDescriptionCharacterCount} more characters so buyers can evaluate this listing quickly.`
                          : isListingDescriptionTooLong
                            ? `Trim about ${listingDescriptionCharacterCount - ONBOARDING_LISTING_DESCRIPTION_GUIDANCE.maxLength} characters so buyers can scan faster.`
                            : "Great length for buyer comparison."}
                    </p>
                    <p
                      className={cn(
                        "font-medium",
                        isListingDescriptionTooShort ||
                          isListingDescriptionTooLong
                          ? "text-yellow-700"
                          : isListingDescriptionInRecommendedRange
                            ? "text-emerald-700"
                            : "text-muted-foreground",
                      )}
                    >
                      {listingDescriptionCharacterCount} chars
                    </p>
                  </div>
                </div>

                <div
                  ref={listingImageEditorRef}
                  tabIndex={-1}
                  className={cn(
                    "space-y-3 rounded-lg border p-4 transition-colors outline-none",
                    activeListingField === "image" &&
                      "border-primary bg-primary/5",
                  )}
                  onFocusCapture={() => setActiveListingField("image")}
                  onClick={() => setActiveListingField("image")}
                >
                  <Label>Listing image (optional)</Label>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Upload your own photo if you want. If you skip this, we will
                    use the linked cultivar image when available.
                  </p>
                  {savedListingId ? (
                    <div className="bg-background rounded-lg border p-3">
                      <OnboardingDeferredImageUpload
                        stagedPreviewUrl={pendingListingUploadPreviewUrl}
                        onDeferredUploadReady={handleDeferredListingImageReady}
                        onDeferredUploadCleared={
                          handleDeferredListingImageCleared
                        }
                      />
                    </div>
                  ) : (
                    <div className="bg-background space-y-3 rounded-lg border p-3">
                      <div className="space-y-2">
                        <div className="bg-muted h-4 w-40 animate-pulse rounded" />
                        <div className="bg-muted h-28 w-full animate-pulse rounded-md" />
                      </div>
                      <p className="text-muted-foreground text-xs leading-relaxed">
                        Setting up uploader. You can continue without uploading
                        - the linked cultivar image will be used.
                      </p>
                    </div>
                  )}
                </div>

                {!listingMissingField &&
                !isListingDescriptionTooShort &&
                !isListingDescriptionTooLong ? (
                  <p className="text-sm font-medium text-emerald-700">
                    Listing card is ready to save.
                  </p>
                ) : null}
              </div>

              <div className="order-1 space-y-6 lg:order-2">
                <div className="space-y-1">
                  <h3 className="text-xl font-semibold tracking-tight">
                    Listing preview
                  </h3>
                </div>

                <div className="bg-card relative w-full max-w-sm overflow-hidden rounded-xl border">
                  <div className="bg-muted relative aspect-square overflow-hidden border-b">
                    <Image
                      src={listingImagePreviewUrl}
                      alt="Listing preview"
                      fill
                      className="object-cover"
                      sizes="(max-width: 1279px) 100vw, 460px"
                      unoptimized
                    />
                    <HotspotButton
                      className="top-3 left-3"
                      label="Edit listing image"
                      active={activeListingField === "image"}
                      onClick={() => focusListingField("image")}
                    />
                    <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
                      <HotspotButton
                        className="static"
                        label="Edit price"
                        active={activeListingField === "price"}
                        onClick={() => focusListingField("price")}
                      />
                      <Badge
                        variant={
                          listingDraft.price !== null ? "secondary" : "outline"
                        }
                        className="bg-background/90 backdrop-blur-sm"
                      >
                        {listingDraft.price !== null
                          ? formatPrice(listingDraft.price)
                          : "Add price"}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-3 p-4">
                    <div className="relative pl-10">
                      <HotspotButton
                        className="top-1 left-0"
                        label="Edit listing title"
                        active={activeListingField === "title"}
                        onClick={() => focusListingField("title")}
                      />
                      <p className="text-xl font-semibold tracking-tight">
                        {listingTitlePreview}
                      </p>
                    </div>

                    <div className="relative pl-10">
                      <HotspotButton
                        className="top-0.5 left-0"
                        label="Edit cultivar link"
                        active={activeListingField === "cultivar"}
                        onClick={() => focusListingField("cultivar")}
                      />
                      {selectedCultivarName ? (
                        <div className="text-muted-foreground bg-secondary inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs">
                          <Link2 className="h-3.5 w-3.5" />
                          Linked: {selectedCultivarName}
                        </div>
                      ) : (
                        <div className="text-muted-foreground bg-secondary inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs">
                          <Link2 className="h-3.5 w-3.5" />
                          Link a cultivar reference
                        </div>
                      )}
                    </div>

                    {selectedCultivarDetailsQuery.data ? (
                      <Badge
                        variant="secondary"
                        className="ml-10 w-fit text-xs"
                      >
                        {[
                          selectedCultivarDetailsQuery.data.hybridizer,
                          selectedCultivarDetailsQuery.data.year,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </Badge>
                    ) : null}

                    <div className="relative pl-10">
                      <HotspotButton
                        className="top-1 left-0"
                        label="Edit listing description"
                        active={activeListingField === "description"}
                        onClick={() => focusListingField("description")}
                      />
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        {listingDescriptionPreview}
                      </p>
                    </div>

                    {listingDraft.price !== null ? (
                      <div className="ml-10 flex justify-end">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="h-7 px-2 text-xs"
                        >
                          <ShoppingCart className="mr-1 h-3.5 w-3.5" />
                          Add to cart
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xl font-semibold tracking-tight">
                    What buyers scan first
                  </h3>
                  <div className="space-y-3 text-sm">
                    <PreviewBullet text="Clear title and price for quick comparisons." />
                    <PreviewBullet text="Cultivar link for confidence and research context." />
                    <PreviewBullet text="Description that explains condition and value." />
                  </div>
                </div>
              </div>
            </OnboardingStepGrid>

            <div className="space-y-2">
              <p className="text-sm font-semibold">
                To continue, complete this checklist
              </p>
              <ul className="space-y-1.5 text-sm">
                {listingContinueChecklist.map((item) => (
                  <li key={item.key} className="flex items-start gap-2">
                    {item.done ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-700" />
                    ) : (
                      <Circle className="text-muted-foreground mt-0.5 h-4 w-4" />
                    )}
                    <span
                      className={cn(
                        item.done ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {item.label}
                      {!item.required ? (
                        <span className="text-muted-foreground">
                          {" "}
                          (optional)
                        </span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}

        {currentStep.id === "preview-buyer-contact" ? (
          <div className="space-y-6">
            {isBuyerContactPreviewHydrating ? (
              <div className="bg-background text-muted-foreground rounded-lg border p-4 text-sm">
                Loading your saved catalog and listing preview...
              </div>
            ) : (
              <div className="space-y-8">
                <div className="grid gap-6 lg:grid-cols-[repeat(2,minmax(0,24rem))] lg:justify-start">
                  <div className="space-y-3">
                    <p className="text-sm font-semibold">
                      Catalog card preview
                    </p>
                    <div className="relative max-w-sm">
                      <ProfilePreviewCard
                        title={profileNamePreview}
                        description={profileDescriptionPreview}
                        imageUrl={profileImagePreviewUrl}
                        location={profileLocationPreview}
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
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => goToStep("build-profile-card")}
                      >
                        Go back and edit catalog card
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm font-semibold">
                      Listing card preview
                    </p>
                    <div className="relative max-w-sm">
                      <ListingPreviewCard
                        title={listingTitlePreview}
                        description={listingDescriptionForBuyerContactPreview}
                        price={listingPriceForBuyerContactPreview}
                        linkedLabel={selectedCultivarName}
                        hybridizerYear={
                          selectedCultivarDetailsQuery.data
                            ? [
                                selectedCultivarDetailsQuery.data.hybridizer,
                                selectedCultivarDetailsQuery.data.year,
                              ]
                                .filter(Boolean)
                                .join(", ")
                            : null
                        }
                        imageUrl={listingImagePreviewUrl}
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
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => goToStep("build-listing-card")}
                      >
                        Go back and edit listing card
                      </Button>
                    </div>
                  </div>
                </div>

                <OnboardingSectionCard title="How buyers contact you">
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Buyers can contact you directly from your catalog, or add
                    priced listings to cart and send one message with selected
                    items.
                  </p>
                  <div className="space-y-2 text-sm">
                    <PreviewBullet text="Path 1: Buyer opens your catalog and sends an email immediately." />
                    <PreviewBullet text="Path 2: Buyer adds priced listings to cart, then sends one message with item details." />
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Buyers do not pay on Daylily Catalog. You arrange payment
                    and shipping directly after inquiry.
                  </p>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Your catalog and listings will not be publicly discoverable
                    until you have an active trial or membership.
                  </p>
                </OnboardingSectionCard>

                <OnboardingSectionCard title="Explore real examples">
                  <div className="flex flex-col items-start gap-2 text-sm">
                    <a
                      href="https://daylilycatalog.com/rollingoaksdaylilies"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80 block underline underline-offset-2"
                    >
                      See a real business catalog example
                    </a>
                    <a
                      href="https://daylilycatalog.com/cultivar/starman"
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
        ) : null}

        {currentStep.id === "start-membership" ? (
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
                      {SUBSCRIPTION_CONFIG.FREE_TRIAL_DAYS}-day trial ends if
                      you haven&apos;t canceled.
                    </p>
                  ) : null}
                  {!membershipPriceDisplay ? (
                    <p className="text-muted-foreground text-xs">
                      You&apos;ll see the exact amount before any charge is
                      made.
                    </p>
                  ) : null}

                  <Link
                    href="/dashboard"
                    className="text-muted-foreground/70 hover:text-muted-foreground decoration-muted-foreground/40 inline-block text-xs underline underline-offset-2"
                    data-testid="start-membership-continue"
                    onClick={handleMembershipContinueForNow}
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
                    {membershipPriceDisplay.monthlyEquivalent}/mo billed
                    annually.
                  </p>
                ) : null}

                <ul className="mt-8 space-y-5 text-2xl leading-tight">
                  {PRO_FEATURES.map((feature) => {
                    const Icon = feature.icon;

                    return (
                      <li key={feature.id} className="flex items-start gap-3">
                        <Icon
                          className="mt-0.5 h-5 w-5 shrink-0"
                          aria-hidden="true"
                        />
                        <span>{feature.text}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>
        ) : null}

        {currentStep.id !== "start-membership" ? (
          <footer className="space-y-2 border-t pt-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-muted-foreground text-sm">
                {currentStep.description}
              </div>
              <div className="flex items-center gap-2">
                {stepIndex > 0 ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={goToPreviousStep}
                  >
                    Back
                  </Button>
                ) : null}

                <Button
                  type="button"
                  onClick={handlePrimaryAction}
                  disabled={primaryButtonDisabled}
                  className="inline-flex items-center gap-2"
                  data-testid="start-onboarding-primary-action"
                >
                  {primaryButtonLabel}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                type="button"
                variant="link"
                onClick={handleSkipOnboarding}
                className="text-muted-foreground hover:text-foreground h-auto p-0 text-xs"
              >
                Skip onboarding...
              </Button>
            </div>
          </footer>
        ) : null}
      </div>
    </div>
  );
}

function drawImageCoverSquare({
  context,
  image,
  size,
  filter,
  globalAlpha,
}: {
  context: CanvasRenderingContext2D;
  image: HTMLImageElement;
  size: number;
  filter?: string;
  globalAlpha?: number;
}) {
  const imageAspectRatio = image.width / image.height;
  const destinationAspectRatio = 1;

  let sourceWidth = image.width;
  let sourceHeight = image.height;
  let sourceX = 0;
  let sourceY = 0;

  if (imageAspectRatio > destinationAspectRatio) {
    sourceWidth = image.height;
    sourceX = (image.width - sourceWidth) / 2;
  } else if (imageAspectRatio < destinationAspectRatio) {
    sourceHeight = image.width;
    sourceY = (image.height - sourceHeight) / 2;
  }

  context.save();
  context.filter = filter ?? "none";
  context.globalAlpha = globalAlpha ?? 1;
  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    size,
    size,
  );
  context.restore();
}

const STARTER_IMAGE_CANVAS_SIZE = 1200;
const STARTER_IMAGE_BLUR_PX = 6;
const STARTER_IMAGE_BLUR_ALPHA = 0.35;
const STARTER_IMAGE_TEXT_FIT_RATIO = 0.75;
const STARTER_IMAGE_TEXT_MAX_LINES = 4;

interface GeneratedStarterImage {
  blob: Blob;
  previewUrl: string;
}

async function generateStarterImageWithGardenName({
  baseImageUrl,
  gardenName,
}: {
  baseImageUrl: string;
  gardenName: string;
}): Promise<GeneratedStarterImage> {
  const image = await loadImageElement(baseImageUrl);
  const canvas = document.createElement("canvas");
  canvas.width = STARTER_IMAGE_CANVAS_SIZE;
  canvas.height = STARTER_IMAGE_CANVAS_SIZE;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas not available");
  }

  drawImageCoverSquare({
    context,
    image,
    size: STARTER_IMAGE_CANVAS_SIZE,
  });

  drawImageCoverSquare({
    context,
    image,
    size: STARTER_IMAGE_CANVAS_SIZE,
    filter: `blur(${STARTER_IMAGE_BLUR_PX}px)`,
    globalAlpha: STARTER_IMAGE_BLUR_ALPHA,
  });

  drawHeroStyleImageOverlay({
    context,
    size: STARTER_IMAGE_CANVAS_SIZE,
  });

  drawGardenNameOverlay({
    context,
    gardenName,
    size: STARTER_IMAGE_CANVAS_SIZE,
  });

  const blob = await canvasToBlob(canvas, "image/jpeg", 0.92);
  const previewUrl = URL.createObjectURL(blob);

  return { blob, previewUrl };
}

async function uploadOnboardingImageBlob({
  blob,
  type,
  referenceId,
  getPresignedUrl,
}: {
  blob: Blob;
  type: "profile" | "listing";
  referenceId: string;
  getPresignedUrl: (input: {
    type: "profile" | "listing";
    fileName: string;
    contentType: string;
    size: number;
    referenceId: string;
  }) => Promise<{
    presignedUrl: string;
    key: string;
    url: string;
  }>;
}) {
  const fileNamePrefix = type === "profile" ? "profile" : "listing";
  const fileName = `onboarding-${fileNamePrefix}-${Date.now()}.jpg`;
  const contentType = blob.type || "image/jpeg";

  const { presignedUrl, key, url } = await getPresignedUrl({
    type,
    fileName,
    contentType,
    size: blob.size,
    referenceId,
  });

  await uploadFileWithProgress({
    presignedUrl,
    file: blob,
    onProgress: () => undefined,
  });

  return { url, key };
}

function drawGardenNameOverlay({
  context,
  gardenName,
  size,
}: {
  context: CanvasRenderingContext2D;
  gardenName: string;
  size: number;
}) {
  const fontFamily =
    window.getComputedStyle(document.body).fontFamily ||
    "ui-sans-serif, system-ui, sans-serif";
  const maxWidth = size * STARTER_IMAGE_TEXT_FIT_RATIO;
  const maxHeight = size * STARTER_IMAGE_TEXT_FIT_RATIO;

  const layout = getGardenNameLayout({
    context,
    text: gardenName.trim(),
    fontFamily,
    maxWidth,
    maxHeight,
  });

  const textBlockHeight = layout.lines.length * layout.lineHeight;
  const textStartY = (size - textBlockHeight) / 2 + layout.fontSize;
  const textStartX = (size - maxWidth) / 2;

  context.textAlign = "left";
  context.textBaseline = "alphabetic";
  context.font = `800 ${layout.fontSize}px ${fontFamily}`;
  context.fillStyle = "rgba(255, 255, 255, 1)";
  context.shadowColor = "rgba(0, 0, 0, 0.24)";
  context.shadowBlur = Math.max(4, layout.fontSize * 0.04);
  context.shadowOffsetX = 0;
  context.shadowOffsetY = Math.max(2, layout.fontSize * 0.02);

  layout.lines.forEach((line, index) => {
    const y = textStartY + index * layout.lineHeight;
    context.fillText(line, textStartX, y);
  });
}

function drawHeroStyleImageOverlay({
  context,
  size,
}: {
  context: CanvasRenderingContext2D;
  size: number;
}) {
  // Match homepage hero treatment: darkened image with high-contrast white text.
  context.fillStyle = "rgba(17, 24, 39, 0.6)";
  context.fillRect(0, 0, size, size);
}

function getGardenNameLayout({
  context,
  text,
  fontFamily,
  maxWidth,
  maxHeight,
}: {
  context: CanvasRenderingContext2D;
  text: string;
  fontFamily: string;
  maxWidth: number;
  maxHeight: number;
}) {
  const words = text.split(/\s+/).filter(Boolean);
  const maxFontSize = 220;
  const minFontSize = 42;
  const lineCandidates = buildGardenNameLineCandidates(
    words,
    STARTER_IMAGE_TEXT_MAX_LINES,
  );

  for (const lines of lineCandidates) {
    for (let fontSize = maxFontSize; fontSize >= minFontSize; fontSize -= 2) {
      context.font = `700 ${fontSize}px ${fontFamily}`;
      const lineHeight = fontSize * 1.08;
      const textHeight = lineHeight * lines.length;
      const widestLine = Math.max(
        ...lines.map((line) => context.measureText(line).width),
        0,
      );

      if (textHeight <= maxHeight && widestLine <= maxWidth) {
        return {
          lines,
          fontSize,
          lineHeight,
        };
      }
    }
  }

  const fallbackText =
    text.length > 28 ? `${text.slice(0, 28).trimEnd()}...` : text;
  return {
    lines: [fallbackText],
    fontSize: minFontSize,
    lineHeight: minFontSize * 1.08,
  };
}

function buildGardenNameLineCandidates(words: string[], maxLines: number) {
  if (words.length === 0) {
    return [["Garden Name"]];
  }

  const candidates: string[][] = [];
  const seen = new Set<string>();

  const addCandidate = (lines: string[]) => {
    const normalized = lines.join("|");
    if (seen.has(normalized)) {
      return;
    }

    seen.add(normalized);
    candidates.push(lines);
  };

  if (words.length <= maxLines) {
    // Prefer one word per line so names stack like "Free / User / Daylily".
    addCandidate(words);
  }

  for (
    let lineCount = Math.min(maxLines, words.length);
    lineCount >= 1;
    lineCount -= 1
  ) {
    const distributedLines = distributeWordsIntoLines(words, lineCount);
    if (distributedLines.length > 0) {
      addCandidate(distributedLines);
    }
  }

  return candidates.length > 0 ? candidates : [words];
}

function distributeWordsIntoLines(words: string[], lineCount: number) {
  if (lineCount <= 0 || words.length === 0) {
    return [];
  }

  if (lineCount >= words.length) {
    return [...words];
  }

  const lines: string[] = [];
  let startIndex = 0;

  for (let lineIndex = 0; lineIndex < lineCount; lineIndex += 1) {
    const remainingWords = words.length - startIndex;
    const remainingLines = lineCount - lineIndex;
    const wordsForLine = Math.ceil(remainingWords / remainingLines);
    const line = words
      .slice(startIndex, startIndex + wordsForLine)
      .join(" ")
      .trim();

    if (!line) {
      continue;
    }

    lines.push(line);
    startIndex += wordsForLine;
  }

  if (startIndex < words.length && lines.length > 0) {
    const remainingWords = words.slice(startIndex).join(" ").trim();
    const lastLineIndex = lines.length - 1;
    if (remainingWords) {
      lines[lastLineIndex] = `${lines[lastLineIndex]} ${remainingWords}`.trim();
    }
  }

  return lines;
}

function loadImageElement(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load starter image"));
    image.src = url;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Failed to create image blob"));
          return;
        }

        resolve(blob);
      },
      type,
      quality,
    );
  });
}

function OnboardingStepGrid({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn("grid gap-6", className)}>{children}</div>;
}

function OnboardingSectionCard({
  className,
  title,
  titleClassName = "text-2xl",
  contentClassName = "space-y-6",
  children,
}: {
  className?: string;
  title: string;
  titleClassName?: string;
  contentClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={cn("relative", className)}>
      <CardHeader>
        <CardTitle className={titleClassName}>{title}</CardTitle>
      </CardHeader>
      <CardContent className={contentClassName}>{children}</CardContent>
    </Card>
  );
}

function HotspotButton({
  active,
  className,
  label,
  onClick,
}: {
  active: boolean;
  className?: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "border-primary/50 bg-background/95 text-primary absolute z-20 inline-flex h-6 min-w-6 items-center justify-center rounded-md border px-1.5 shadow-sm transition hover:scale-[1.03]",
        active && "bg-primary/10 ring-primary/20 ring-2",
        className,
      )}
    >
      <Pencil className="h-3.5 w-3.5" />
      <span className="sr-only">{label}</span>
    </button>
  );
}

function PreviewBullet({ text }: { text: string }) {
  return (
    <p className="flex items-start gap-2">
      <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
      <span>{text}</span>
    </p>
  );
}

function usePreviewImageSrc({
  imageUrl,
  fallbackUrl,
}: {
  imageUrl: string;
  fallbackUrl: string;
}) {
  const [previewImageSrc, setPreviewImageSrc] = useState(fallbackUrl);
  const nextImageSrc = imageUrl.trim() || fallbackUrl;

  useEffect(() => {
    let isCancelled = false;
    const loader = new window.Image();
    loader.onload = () => {
      if (isCancelled) {
        return;
      }
      setPreviewImageSrc(nextImageSrc);
    };
    loader.onerror = () => {
      if (isCancelled) {
        return;
      }
      setPreviewImageSrc(fallbackUrl);
    };
    loader.src = nextImageSrc;

    return () => {
      isCancelled = true;
      loader.onload = null;
      loader.onerror = null;
    };
  }, [fallbackUrl, nextImageSrc]);

  return previewImageSrc;
}

function ProfilePreviewCard({
  title,
  description,
  imageUrl,
  location,
  variant = "default",
  ownershipBadge,
  footerAction,
}: {
  title: string;
  description: string;
  imageUrl: string;
  location?: string;
  variant?: "default" | "owned";
  ownershipBadge?: string;
  footerAction?: React.ReactNode;
}) {
  const previewImageSrc = usePreviewImageSrc({
    imageUrl,
    fallbackUrl: PROFILE_PLACEHOLDER_IMAGE,
  });

  return (
    <div
      className={cn(
        "bg-card w-full max-w-sm overflow-hidden rounded-2xl border",
        variant === "owned" &&
          "border-primary shadow-[0_0_0_2px_rgba(24,24,27,0.08)]",
      )}
    >
      <div className="relative aspect-square border-b">
        <Image
          src={previewImageSrc}
          alt={title}
          fill
          className="object-cover"
          unoptimized
        />
        {ownershipBadge ? (
          <Badge className="absolute top-3 left-3" variant="secondary">
            {ownershipBadge}
          </Badge>
        ) : null}
      </div>
      <div className="space-y-3 p-4">
        <p className="text-3xl leading-tight font-bold tracking-tight">
          {title}
        </p>

        {location ? (
          <Badge
            variant="secondary"
            className="inline-flex items-center gap-1 text-sm"
          >
            <MapPin className="h-3.5 w-3.5" />
            {location}
          </Badge>
        ) : null}

        <p className="text-muted-foreground text-sm leading-relaxed">
          {description}
        </p>

        {footerAction ? <div>{footerAction}</div> : null}
      </div>
    </div>
  );
}

function ListingPreviewCard({
  title,
  description,
  price,
  linkedLabel,
  hybridizerYear,
  imageUrl,
  variant = "default",
  ownershipBadge,
}: {
  title: string;
  description: string;
  price: number | null;
  linkedLabel: string | null;
  hybridizerYear: string | null;
  imageUrl: string;
  variant?: "default" | "owned";
  ownershipBadge?: string;
}) {
  const hasDescription = description.trim().length > 0;
  const showAddToCartButton = variant === "owned" && price !== null;
  const showMetadataRow = Boolean(linkedLabel) || showAddToCartButton;
  const previewImageSrc = usePreviewImageSrc({
    imageUrl,
    fallbackUrl: ONBOARDING_LISTING_DEFAULTS.fallbackImageUrl,
  });

  return (
    <div
      className={cn(
        "bg-card w-full max-w-sm overflow-hidden rounded-xl border",
        variant === "owned" &&
          "border-primary shadow-[0_0_0_2px_rgba(24,24,27,0.08)]",
      )}
    >
      <div className="bg-muted relative aspect-square border-b">
        <Image
          src={previewImageSrc}
          alt={title}
          fill
          className="object-cover"
          sizes="(max-width: 1024px) 50vw, 280px"
          unoptimized
        />
        {price !== null ? (
          <Badge
            className="bg-background/90 absolute top-3 right-3 backdrop-blur-sm"
            variant="secondary"
          >
            {formatPrice(price)}
          </Badge>
        ) : null}
        <Badge
          className="bg-background/90 absolute right-3 bottom-3 backdrop-blur-sm"
          variant="secondary"
        >
          <Link2 className="h-3 w-3" />
        </Badge>
        {ownershipBadge ? (
          <Badge className="absolute top-3 left-3" variant="secondary">
            {ownershipBadge}
          </Badge>
        ) : null}
      </div>
      <div className="space-y-2 p-4">
        <p className="font-semibold tracking-tight">{title}</p>
        {hybridizerYear ? (
          <Badge variant="secondary" className="text-xs">
            {hybridizerYear}
          </Badge>
        ) : null}
        {hasDescription ? (
          <p className="text-muted-foreground text-sm leading-relaxed">
            {description}
          </p>
        ) : null}
        {showMetadataRow ? (
          <div className="flex items-center justify-between gap-2">
            {linkedLabel ? (
              <div className="text-muted-foreground inline-flex items-center gap-1 text-xs">
                <Link2 className="h-3.5 w-3.5" />
                {`Linked: ${linkedLabel}`}
              </div>
            ) : (
              <span />
            )}
            {showAddToCartButton ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="h-7 px-2 text-xs"
              >
                <ShoppingCart className="mr-1 h-3.5 w-3.5" />
                Add to cart
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
