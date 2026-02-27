"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Circle,
  CheckCircle2,
  ExternalLink,
  HandHeart,
  ImageIcon,
  Link2,
  ListChecks,
  MapPin,
  MessageCircle,
  Package,
  ShoppingCart,
} from "lucide-react";
import { toast } from "sonner";
import {
  AhsListingSelect,
  type AhsSearchResult,
} from "@/components/ahs-listing-select";
import { AhsListingDisplay } from "@/components/ahs-listing-display";
import { CheckoutButton } from "@/components/checkout-button";
import { CurrencyInput } from "@/components/currency-input";
import { ImageUpload } from "@/components/image-upload";
import { IMAGE_CONFIG } from "@/components/optimized-image";
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
import type { ImageUploadResponse } from "@/types/image";
import {
  ONBOARDING_BUYER_FLOW_BULLETS,
  ONBOARDING_LISTING_DEFAULTS,
  ONBOARDING_LISTING_DESCRIPTION_GUIDANCE,
  ONBOARDING_LISTING_DISCOVERY_EXAMPLES,
  ONBOARDING_PROFILE_DESCRIPTION_SEO_GUIDANCE,
  ONBOARDING_PROFILE_DISCOVERY_EXAMPLES,
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

const PROFILE_PLACEHOLDER_IMAGE = "/assets/catalog-blooms.webp";
const DEFAULT_STARTER_IMAGE_URL = STARTER_PROFILE_IMAGES[0]?.url ?? null;
const DEFAULT_GARDEN_NAME_PLACEHOLDER = "Your Garden Name";
const DEFAULT_LOCATION_PLACEHOLDER = "Your City, ST";
const DEFAULT_PROFILE_DESCRIPTION_PLACEHOLDER =
  "Daylily collector in Your City, ST offering healthy dormant fans, clearly labeled plants, and prompt replies with spring and fall shipping.";
const DEFAULT_LISTING_TITLE_PLACEHOLDER =
  "Coffee Frenzy spring fan (1 healthy dormant fan)";
const DEFAULT_LISTING_DESCRIPTION_PLACEHOLDER =
  "Healthy dormant fan with strong roots, clearly labeled, and ready for spring shipping or local pickup.";

const PRO_UNLOCKS = [
  {
    id: "custom-url",
    icon: ExternalLink,
    text: "Custom garden URL - easy to remember and share.",
  },
  {
    id: "unlimited",
    icon: Package,
    text: "Unlimited inventory - listings, lists, and photos.",
  },
  {
    id: "catalog-page",
    icon: ListChecks,
    text: "Seller browsing placement - get discovered by active buyers.",
  },
  {
    id: "cultivar-page",
    icon: ImageIcon,
    text: "Cultivar page visibility - show up on variety research pages.",
  },
  {
    id: "support",
    icon: HandHeart,
    text: "Priority support - faster help during peak season.",
  },
] as const;

interface MembershipPriceDisplay {
  amount: string;
  interval: string;
  monthlyEquivalent: string | null;
}

interface StartOnboardingPageClientProps {
  membershipPriceDisplay: MembershipPriceDisplay | null;
}

function normalizeCultivarSearchValue(value: string | null | undefined) {
  return (value ?? "").toLowerCase().replace(/\s+/g, " ").trim();
}

const DEFAULT_PROFILE_DRAFT: ProfileOnboardingDraft = {
  gardenName: "",
  location: "",
  description: "",
  profileImageUrl: DEFAULT_STARTER_IMAGE_URL,
};

const DEFAULT_LISTING_DRAFT: ListingOnboardingDraft = {
  cultivarReferenceId: null,
  title: "",
  price: null,
  description: "",
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

  const [selectedProfileImageId, setSelectedProfileImageId] = useState<
    string | null
  >(null);
  const [selectedStarterImageUrl, setSelectedStarterImageUrl] = useState<
    string | null
  >(DEFAULT_STARTER_IMAGE_URL);
  const [profileImageInputMode, setProfileImageInputMode] = useState<
    "starter" | "upload"
  >("starter");
  const [applyStarterNameOverlay, setApplyStarterNameOverlay] = useState(true);
  const [isGeneratingStarterImage, setIsGeneratingStarterImage] =
    useState(false);
  const [pendingStarterImageBlob, setPendingStarterImageBlob] =
    useState<Blob | null>(null);
  const [pendingStarterPreviewUrl, setPendingStarterPreviewUrl] = useState<
    string | null
  >(null);
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

  const [savedListingId, setSavedListingId] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingListing, setIsSavingListing] = useState(false);
  const [onboardingCultivarOptions, setOnboardingCultivarOptions] = useState<
    AhsSearchResult[]
  >([]);
  const [isLoadingOnboardingCultivarOptions, setIsLoadingOnboardingCultivars] =
    useState(true);

  const profileQuery = api.dashboardDb.userProfile.get.useQuery();
  const imagesQuery = api.dashboardDb.image.list.useQuery(undefined, {
    enabled: Boolean(profileQuery.data?.id),
  });
  const listingQuery = api.dashboardDb.listing.list.useQuery();
  const existingListingCultivarReferenceId =
    listingQuery.data?.[0]?.cultivarReferenceId ?? null;
  const shouldAttemptDefaultCultivar =
    listingQuery.isFetched &&
    existingListingCultivarReferenceId === null &&
    listingDraft.cultivarReferenceId === null &&
    selectedCultivarName === null;
  const selectedCultivarDetailsQuery = api.dashboardDb.ahs.get.useQuery(
    { id: selectedCultivarAhsId ?? "" },
    { enabled: Boolean(selectedCultivarAhsId) },
  );

  const updateProfileMutation =
    api.dashboardDb.userProfile.update.useMutation();
  const getImagePresignedUrlMutation =
    api.dashboardDb.image.getPresignedUrl.useMutation();
  const createImageMutation = api.dashboardDb.image.create.useMutation();
  const deleteImageMutation = api.dashboardDb.image.delete.useMutation();
  const createListingMutation = api.dashboardDb.listing.create.useMutation();
  const updateListingMutation = api.dashboardDb.listing.update.useMutation();
  const linkAhsMutation = api.dashboardDb.listing.linkAhs.useMutation();

  const hasHydratedProfile = useRef(false);
  const hasHydratedProfileImage = useRef(false);
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

  useEffect(() => {
    if (!profileQuery.data || hasHydratedProfile.current) {
      return;
    }

    hasHydratedProfile.current = true;

    const nextImage = profileQuery.data.logoUrl ?? DEFAULT_STARTER_IMAGE_URL;

    setProfileDraft({
      gardenName: profileQuery.data.title?.trim() ?? "",
      location: profileQuery.data.location ?? "",
      description: profileQuery.data.description ?? "",
      profileImageUrl: nextImage,
    });

    const matchingStarterImage = STARTER_PROFILE_IMAGES.find(
      (starterImage) => starterImage.url === nextImage,
    );
    setSelectedProfileImageId(null);
    setSelectedStarterImageUrl(matchingStarterImage?.url ?? null);
  }, [profileQuery.data]);

  useEffect(() => {
    if (
      !profileQuery.data?.id ||
      !imagesQuery.data ||
      hasHydratedProfileImage.current
    ) {
      return;
    }

    hasHydratedProfileImage.current = true;

    const profileImageUrl =
      imagesQuery.data.find(
        (image) => image.userProfileId === profileQuery.data?.id,
      )?.url ?? null;

    if (!profileImageUrl) {
      return;
    }

    setProfileDraft((previous) => ({
      ...previous,
      profileImageUrl,
    }));
    const matchingProfileImage = imagesQuery.data.find(
      (image) => image.url === profileImageUrl,
    );
    setSelectedProfileImageId(matchingProfileImage?.id ?? null);
    const matchingStarterImage = STARTER_PROFILE_IMAGES.find(
      (starterImage) => starterImage.url === profileImageUrl,
    );
    setSelectedStarterImageUrl(matchingStarterImage?.url ?? null);
  }, [imagesQuery.data, profileQuery.data?.id]);

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
    };
  }, [pendingStarterPreviewUrl]);

  useEffect(() => {
    if (!listingQuery.data || hasHydratedListing.current) {
      return;
    }

    hasHydratedListing.current = true;
    const existingListing = listingQuery.data[0];

    if (!existingListing) {
      return;
    }

    setSavedListingId(existingListing.id);
    setListingDraft({
      cultivarReferenceId: existingListing.cultivarReferenceId,
      title: existingListing.title,
      price: existingListing.price,
      description: existingListing.description ?? "",
    });

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
    const listingImage = imagesQuery.data.find(
      (image) => image.listingId === savedListingId,
    );

    if (!listingImage) {
      return;
    }

    setSelectedListingImageId(listingImage.id);
    setSelectedListingImageUrl(listingImage.url);
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

    const isValidStep = ONBOARDING_STEPS.some((step) => step.id === rawStepParam);
    if (isValidStep) {
      return;
    }

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("step");
    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${onboardingPath}?${nextQuery}` : onboardingPath, {
      scroll: false,
    });
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

  const profileImages = useMemo(() => {
    if (!profileQuery.data?.id) {
      return [];
    }

    return (imagesQuery.data ?? []).filter(
      (image) => image.userProfileId === profileQuery.data.id,
    );
  }, [imagesQuery.data, profileQuery.data?.id]);

  const listingImages = useMemo(() => {
    if (!savedListingId) {
      return [];
    }

    return (imagesQuery.data ?? []).filter(
      (image) => image.listingId === savedListingId,
    );
  }, [imagesQuery.data, savedListingId]);

  const progressValue = ((stepIndex + 1) / ONBOARDING_STEPS.length) * 100;
  const selectedCultivarImageUrl =
    selectedCultivarDetailsQuery.data?.ahsImageUrl ?? null;
  const profileImagePreviewUrl =
    profileDraft.profileImageUrl ?? PROFILE_PLACEHOLDER_IMAGE;
  const listingImagePreviewUrl =
    selectedListingImageUrl ??
    selectedCultivarImageUrl ??
    ONBOARDING_LISTING_DEFAULTS.fallbackImageUrl;

  const listingTitleDraftValue = listingDraft.title.trim();
  const listingDescriptionDraftValue = listingDraft.description.trim();
  const listingTitlePreview =
    listingTitleDraftValue || DEFAULT_LISTING_TITLE_PLACEHOLDER;
  const listingDescriptionPreview =
    listingDescriptionDraftValue || DEFAULT_LISTING_DESCRIPTION_PLACEHOLDER;
  const listingDescriptionForListingPreview = listingDescriptionDraftValue;
  const listingDescriptionForBuyerContactPreview =
    listingDescriptionDraftValue || DEFAULT_LISTING_DESCRIPTION_PLACEHOLDER;
  const listingPriceForBuyerContactPreview =
    listingDraft.price ?? ONBOARDING_LISTING_DEFAULTS.contactPreviewFallbackPrice;
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
  const profileDescriptionCharacterCount = profileDraft.description.trim().length;
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

  const cancelStarterImageGeneration = useCallback(() => {
    if (starterImageGenerationTimeoutRef.current !== null) {
      window.clearTimeout(starterImageGenerationTimeoutRef.current);
      starterImageGenerationTimeoutRef.current = null;
    }

    starterImageGenerationRequestIdRef.current += 1;
    setIsGeneratingStarterImage(false);
  }, []);

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
            setSelectedProfileImageId(null);
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
    imageId: string | null = null,
  ) => {
    cancelStarterImageGeneration();
    clearPendingStarterImage();

    const nextDraft = {
      ...profileDraft,
      profileImageUrl: url,
    };

    setProfileDraft(nextDraft);
    setSelectedProfileImageId(imageId);
    setSelectedStarterImageUrl(starterImageUrl);
  };

  const handleProfileImageUploadComplete = (result: ImageUploadResponse) => {
    setProfileImageInputMode("upload");
    handleProfileImagePick(result.url, null, result.image.id);
  };

  const handleListingImageUploadComplete = (result: ImageUploadResponse) => {
    setSelectedListingImageId(result.image.id);
    setSelectedListingImageUrl(result.url);
    setActiveListingField("image");
  };

  const handleStarterImageSelect = (baseImageUrl: string) => {
    setProfileImageInputMode("starter");
    setSelectedProfileImageId(null);
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

  const handleStarterOverlayChange = (enabled: boolean) => {
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
      setSelectedProfileImageId(null);
      return;
    }

    scheduleStarterImageGeneration({
      baseImageUrl: selectedStarterImageUrl,
      gardenName:
        profileDraft.gardenName.trim() || DEFAULT_GARDEN_NAME_PLACEHOLDER,
      debounceMs: 0,
    });
  };

  const syncOnboardingProfileImageSelection = async ({
    profileId,
    selectedImageUrl,
    selectedImageKey,
    selectedImageId,
  }: {
    profileId: string;
    selectedImageUrl: string;
    selectedImageKey: string;
    selectedImageId: string | null;
  }) => {
    let imageToKeepId =
      selectedImageId ??
      profileImages.find((image) => image.url === selectedImageUrl)?.id ??
      null;

    if (!imageToKeepId) {
      const createdImage = await createImageMutation.mutateAsync({
        type: "profile",
        referenceId: profileId,
        url: selectedImageUrl,
        key: selectedImageKey,
      });
      imageToKeepId = createdImage.id;
    }

    const imagesToDelete = profileImages.filter(
      (image) => image.id !== imageToKeepId,
    );
    await Promise.all(
      imagesToDelete.map((image) =>
        deleteImageMutation.mutateAsync({
          type: "profile",
          referenceId: profileId,
          imageId: image.id,
        }),
      ),
    );

    setSelectedProfileImageId(imageToKeepId);
  };

  const syncOnboardingListingImageSelection = async ({
    listingId,
    selectedImageUrl,
    selectedImageKey,
    selectedImageId,
  }: {
    listingId: string;
    selectedImageUrl: string;
    selectedImageKey: string;
    selectedImageId: string | null;
  }) => {
    let imageToKeepId =
      selectedImageId ??
      listingImages.find((image) => image.url === selectedImageUrl)?.id ??
      null;

    if (!imageToKeepId) {
      const createdImage = await createImageMutation.mutateAsync({
        type: "listing",
        referenceId: listingId,
        url: selectedImageUrl,
        key: selectedImageKey,
      });
      imageToKeepId = createdImage.id;
    }

    const imagesToDelete = listingImages.filter(
      (image) => image.id !== imageToKeepId,
    );
    await Promise.all(
      imagesToDelete.map((image) =>
        deleteImageMutation.mutateAsync({
          type: "listing",
          referenceId: listingId,
          imageId: image.id,
        }),
      ),
    );

    setSelectedListingImageId(imageToKeepId);
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

    if (ONBOARDING_LISTING_DEFAULTS.defaultStatus) {
      await updateListingMutation.mutateAsync({
        id: createdListing.id,
        data: {
          status: ONBOARDING_LISTING_DEFAULTS.defaultStatus,
        },
      });
    }

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
      toast.error("Complete image, garden name, and description first.");
      return false;
    }

    setIsSavingProfile(true);

    try {
      let profileImageUrlToSave = profileDraft.profileImageUrl;
      let profileImageKeyToSave = `onboarding:${Date.now()}`;

      if (pendingStarterImageBlob && profileImageUrlToSave) {
        const { url, key } = await uploadGeneratedStarterProfileImage({
          blob: pendingStarterImageBlob,
          referenceId: profileQuery.data.id,
          getPresignedUrl: getImagePresignedUrlMutation.mutateAsync,
        });

        profileImageUrlToSave = url;
        profileImageKeyToSave = key;
        clearPendingStarterImage();

        setProfileDraft((previous) => ({
          ...previous,
          profileImageUrl: url,
        }));
      }

      await updateProfileMutation.mutateAsync({
        data: {
          title: profileDraft.gardenName.trim(),
          location: profileDraft.location.trim(),
          description: profileDraft.description.trim(),
          logoUrl: profileImageUrlToSave,
        },
      });

      if (profileImageUrlToSave) {
        await syncOnboardingProfileImageSelection({
          profileId: profileQuery.data.id,
          selectedImageUrl: profileImageUrlToSave,
          selectedImageKey: profileImageKeyToSave,
          selectedImageId: selectedProfileImageId,
        });
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
        },
      });

      const listingImageToSave =
        selectedListingImageUrl ?? selectedCultivarImageUrl ?? null;

      if (listingImageToSave) {
        await syncOnboardingListingImageSelection({
          listingId,
          selectedImageUrl: listingImageToSave,
          selectedImageKey: `onboarding-listing:${Date.now()}`,
          selectedImageId: selectedListingImageId,
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
        });
        goToNextStep();
        return;
      }
      case "start-membership": {
        captureOnboardingStepEvent(
          "onboarding_step_completed",
          "start-membership",
        );
        router.push("/dashboard");
        return;
      }
      case "preview-profile-card": {
        captureOnboardingStepEvent(
          "onboarding_step_completed",
          "preview-profile-card",
        );
        goToNextStep();
        return;
      }
      case "preview-listing-card": {
        captureOnboardingStepEvent(
          "onboarding_step_completed",
          "preview-listing-card",
        );
        goToNextStep();
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
      case "preview-profile-card":
        return "Build my first listing";
      case "build-listing-card":
        return isSavingListing
          ? "Saving listing..."
          : "Save listing and continue";
      case "preview-listing-card":
        return "Show buyer inquiry flow";
      case "preview-buyer-contact":
        return "Review plans";
      case "start-membership":
        return "Continue for now";
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
    captureOnboardingStepEvent("onboarding_step_completed", "start-membership");
    capturePosthogEvent("onboarding_membership_continue_for_now_clicked", {
      source: "onboarding-step",
    });
  }, [captureOnboardingStepEvent]);

  const handleSkipOnboarding = () => {
    capturePosthogEvent("onboarding_skipped", {
      step_id: currentStep.id,
      step_index: stepIndex + 1,
    });
    router.push("/dashboard");
  };

  return (
    <div className="bg-muted/20 min-h-svh" data-testid="start-onboarding-page">
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
                      "shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-1",
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
                  <Label htmlFor="garden-name">Garden name</Label>
                  <Input
                    ref={gardenNameInputRef}
                    id="garden-name"
                    placeholder={DEFAULT_GARDEN_NAME_PLACEHOLDER}
                    value={profileDraft.gardenName}
                    onFocus={() => setFocusedProfileField("gardenName")}
                    onChange={(event) => {
                      const nextDraft = {
                        ...profileDraft,
                        gardenName: event.target.value,
                      };
                      setProfileDraft(nextDraft);

                      if (selectedStarterImageUrl && applyStarterNameOverlay) {
                        scheduleStarterImageGeneration({
                          baseImageUrl: selectedStarterImageUrl,
                          gardenName:
                            nextDraft.gardenName.trim() ||
                            DEFAULT_GARDEN_NAME_PLACEHOLDER,
                          debounceMs: 150,
                        });
                      }
                    }}
                  />
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Your garden name is your storefront title. Buyers will use
                    it to recognize and return to your catalog.
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
                        setProfileImageInputMode("starter");
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
                        setProfileImageInputMode("upload");
                      }}
                    >
                      Upload your own image
                    </Button>
                  </div>

                  {profileImageInputMode === "starter" ? (
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
                            Stamp garden name onto starter image
                          </Label>
                        </div>
                      </div>
                      <div className="overflow-x-auto pb-2">
                        <div className="grid w-full grid-flow-col auto-cols-[calc((100%-2rem)/4.5)] gap-2">
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
                  ) : (
                    <div className="space-y-2">
                      <p className="text-muted-foreground text-xs leading-relaxed">
                        Drag and drop an image, then crop and adjust it before
                        saving.
                      </p>
                      {profileQuery.data?.id ? (
                        <div className="bg-background rounded-lg border p-3">
                          <ImageUpload
                            type="profile"
                            referenceId={profileQuery.data.id}
                            uploadMode="direct"
                            onUploadComplete={handleProfileImageUploadComplete}
                            onMutationSuccess={() => {
                              void utils.dashboardDb.image.list.invalidate();
                            }}
                          />
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-sm">
                          Loading profile uploader...
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div
                  className={cn(
                    "space-y-2 rounded-lg border p-4 transition-colors",
                    focusedProfileField === "location" &&
                      "border-primary bg-primary/5",
                  )}
                >
                  <Label htmlFor="garden-location">Location (optional)</Label>
                  <Input
                    ref={gardenLocationInputRef}
                    id="garden-location"
                    placeholder={DEFAULT_LOCATION_PLACEHOLDER}
                    value={profileDraft.location}
                    onFocus={() => setFocusedProfileField("location")}
                    onChange={(event) =>
                      setProfileDraft({
                        ...profileDraft,
                        location: event.target.value,
                      })
                    }
                  />
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Add your city and state so buyers know where you grow and
                    whether you are likely a regional fit.
                  </p>
                </div>

                <div
                  className={cn(
                    "space-y-2 rounded-lg border p-4 transition-colors",
                    focusedProfileField === "description" &&
                      "border-primary bg-primary/5",
                  )}
                >
                  <Label htmlFor="garden-description">Garden description</Label>
                  <Textarea
                    ref={gardenDescriptionInputRef}
                    id="garden-description"
                    rows={5}
                    placeholder={DEFAULT_PROFILE_DESCRIPTION_PLACEHOLDER}
                    value={profileDraft.description}
                    onFocus={() => setFocusedProfileField("description")}
                    onChange={(event) =>
                      setProfileDraft({
                        ...profileDraft,
                        description: event.target.value,
                      })
                    }
                  />
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    {ONBOARDING_PROFILE_DESCRIPTION_SEO_GUIDANCE.conciseTip}
                  </p>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <p
                      className={cn(
                        "leading-relaxed",
                        isProfileDescriptionTooShort || isProfileDescriptionTooLong
                          ? "text-amber-700"
                          : isProfileDescriptionInRecommendedRange
                            ? "text-emerald-700"
                            : "text-muted-foreground",
                      )}
                    >
                      {profileDescriptionCharacterCount === 0
                        ? `Aim for ${ONBOARDING_PROFILE_DESCRIPTION_SEO_GUIDANCE.minLength}-${ONBOARDING_PROFILE_DESCRIPTION_SEO_GUIDANCE.maxLength} characters.`
                        : isProfileDescriptionTooShort
                          ? `Add at least ${ONBOARDING_PROFILE_DESCRIPTION_SEO_GUIDANCE.minLength - profileDescriptionCharacterCount} more characters for stronger SEO context.`
                          : isProfileDescriptionTooLong
                            ? `Trim about ${profileDescriptionCharacterCount - ONBOARDING_PROFILE_DESCRIPTION_SEO_GUIDANCE.maxLength} characters for cleaner Google snippets.`
                            : "Great length for search and buyer scanning."}
                    </p>
                    <p
                      className={cn(
                        "font-medium",
                        isProfileDescriptionTooShort || isProfileDescriptionTooLong
                          ? "text-amber-700"
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
                  <p className="text-sm font-medium text-amber-700">
                    Profile card is ready. Add{" "}
                    {ONBOARDING_PROFILE_DESCRIPTION_SEO_GUIDANCE.minLength -
                      profileDescriptionCharacterCount}{" "}
                    more characters to strengthen search visibility.
                  </p>
                  ) : isProfileDescriptionTooLong ? (
                  <p className="text-sm font-medium text-amber-700">
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
                        {profileDraft.gardenName.trim() ||
                          DEFAULT_GARDEN_NAME_PLACEHOLDER}
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
                        {profileDraft.location.trim() ||
                          DEFAULT_LOCATION_PLACEHOLDER}
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
                        {profileDraft.description.trim() ||
                          DEFAULT_PROFILE_DESCRIPTION_PLACEHOLDER}
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
          </div>
        ) : null}

        {currentStep.id === "preview-profile-card" ? (
          <div className="space-y-6">
            <OnboardingSectionCard
              title="Catalog discovery preview"
              contentClassName="space-y-4"
            >
              <p className="text-muted-foreground">
                This is an example gallery view, not the live catalogs page. It
                mirrors how customers discover gardens first when browsing
                catalogs.
              </p>
              <p className="text-sm font-medium text-emerald-700">
                Look for the{" "}
                <span className="rounded bg-emerald-100 px-1">Yours</span> badge
                to spot your card.
              </p>

              <div className="grid gap-4 lg:grid-cols-[repeat(2,minmax(0,24rem))] lg:justify-start">
                <ProfilePreviewCard
                  title={
                    profileDraft.gardenName || DEFAULT_GARDEN_NAME_PLACEHOLDER
                  }
                  description={
                    profileDraft.description ||
                    DEFAULT_PROFILE_DESCRIPTION_PLACEHOLDER
                  }
                  imageUrl={profileImagePreviewUrl}
                  location={profileDraft.location || DEFAULT_LOCATION_PLACEHOLDER}
                  variant="owned"
                  ownershipBadge="Yours"
                />
                {ONBOARDING_PROFILE_DISCOVERY_EXAMPLES.map((exampleCard) => (
                  <ProfilePreviewCard
                    key={exampleCard.id}
                    title={exampleCard.title}
                    description={exampleCard.description}
                    imageUrl={exampleCard.imageUrl}
                    location={exampleCard.location}
                  />
                ))}
              </div>
            </OnboardingSectionCard>

            <div className="space-y-2">
              <p className="text-sm font-semibold">
                Are you happy with your catalog card?
              </p>
              <p className="text-muted-foreground text-sm">
                If not, go back and update your catalog card before continuing.
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
              <p className="text-muted-foreground text-xs leading-relaxed">
                <span className="font-semibold">★ Note:</span> This is an
                example listing. It will be hidden from your catalog and can be
                deleted later.
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
                <Label>Link a daylily variety (required)</Label>
                <AhsListingSelect
                  onSelect={handleAhsSelect}
                  selectedLabel={selectedCultivarName}
                  predefinedOptions={onboardingCultivarOptions}
                  limitToPredefinedOptions={true}
                  isPredefinedOptionsLoading={
                    isLoadingOnboardingCultivarOptions
                  }
                  limitedSearchMessage={
                    ONBOARDING_LISTING_DEFAULTS.limitedSearchMessage
                  }
                  triggerPlaceholder="Select a starter variety..."
                  searchPlaceholder="Search onboarding varieties..."
                  dialogTitle="Select Daylily Variety"
                />
                <p className="text-muted-foreground text-xs leading-relaxed">
                  We start you with a popular variety so you can keep moving.
                  You can change this selection now or any time from your
                  dashboard.
                </p>
                {selectedCultivarName ? (
                  <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3">
                    <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide text-emerald-800 uppercase">
                      <CheckCircle2 className="h-4 w-4" />
                      Selected cultivar
                    </p>
                    <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
                      You&apos;re viewing the Daylily Database reference card
                      for this variety. The database includes details and images
                      for 100,000+ listings.
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
                  imagery, so they can confidently reach out to buy from you.
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
                    setListingDraft({
                      ...listingDraft,
                      title: event.target.value,
                    })
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
                    setListingDraft({
                      ...listingDraft,
                      price: value,
                    })
                  }
                  placeholder="25"
                />
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Optional in onboarding. Add a price now if you want to preview
                  add-to-cart behavior.
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
                    setListingDraft({
                      ...listingDraft,
                      description: event.target.value,
                    })
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
                      isListingDescriptionTooShort || isListingDescriptionTooLong
                        ? "text-amber-700"
                        : isListingDescriptionInRecommendedRange
                          ? "text-emerald-700"
                          : "text-muted-foreground",
                    )}
                  >
                    {listingDescriptionCharacterCount === 0
                      ? `Aim for ${ONBOARDING_LISTING_DESCRIPTION_GUIDANCE.minLength}-${ONBOARDING_LISTING_DESCRIPTION_GUIDANCE.maxLength} characters.`
                      : isListingDescriptionTooShort
                        ? `Add at least ${ONBOARDING_LISTING_DESCRIPTION_GUIDANCE.minLength - listingDescriptionCharacterCount} more characters for clearer buyer context.`
                        : isListingDescriptionTooLong
                          ? `Trim about ${listingDescriptionCharacterCount - ONBOARDING_LISTING_DESCRIPTION_GUIDANCE.maxLength} characters so it stays easy to scan.`
                          : "Great length for buyers comparing listings."}
                  </p>
                  <p
                    className={cn(
                      "font-medium",
                      isListingDescriptionTooShort || isListingDescriptionTooLong
                        ? "text-amber-700"
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
                    <ImageUpload
                      type="listing"
                      referenceId={savedListingId}
                      uploadMode="direct"
                      onUploadComplete={handleListingImageUploadComplete}
                      onMutationSuccess={() => {
                        void utils.dashboardDb.image.list.invalidate();
                      }}
                    />
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Preparing listing image uploader...
                  </p>
                )}
              </div>

                {!listingMissingField && isListingDescriptionTooShort ? (
                  <p className="text-sm font-medium text-amber-700">
                    Listing card is ready. Add{" "}
                    {ONBOARDING_LISTING_DESCRIPTION_GUIDANCE.minLength -
                      listingDescriptionCharacterCount}{" "}
                    more characters to help buyers evaluate quickly.
                  </p>
                ) : !listingMissingField && isListingDescriptionTooLong ? (
                  <p className="text-sm font-medium text-amber-700">
                    Listing card is ready. Consider trimming{" "}
                    {listingDescriptionCharacterCount -
                      ONBOARDING_LISTING_DESCRIPTION_GUIDANCE.maxLength}{" "}
                    characters for faster scanning.
                  </p>
                ) : !listingMissingField ? (
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
                  <p className="text-muted-foreground text-sm">
                    This is how your listing card appears when buyers compare
                    options.
                  </p>
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
                    <Badge variant="secondary" className="ml-10 w-fit text-xs">
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
                        <span className="text-muted-foreground"> (optional)</span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}

        {currentStep.id === "preview-listing-card" ? (
          <div className="space-y-6">
            <OnboardingSectionCard
              title="Finished listing card preview"
              contentClassName="space-y-4"
            >
              <p className="text-muted-foreground">
                This is an example buyer-facing card preview, using your new
                listing data.
              </p>
              <p className="text-sm font-medium text-emerald-700">
                Look for the{" "}
                <span className="rounded bg-emerald-100 px-1">Yours</span> badge
                to spot your listing.
              </p>

              <div className="grid gap-4 lg:grid-cols-[repeat(2,minmax(0,24rem))] lg:justify-start">
                <ListingPreviewCard
                  title={listingTitlePreview}
                  description={listingDescriptionForListingPreview}
                  price={listingDraft.price}
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
                  ownershipBadge="Yours"
                />
                {ONBOARDING_LISTING_DISCOVERY_EXAMPLES.map((exampleListing) => (
                  <ListingPreviewCard
                    key={exampleListing.id}
                    title={exampleListing.title}
                    description={exampleListing.description}
                    price={exampleListing.price}
                    linkedLabel={exampleListing.linkedLabel}
                    hybridizerYear={exampleListing.hybridizerYear}
                    imageUrl={exampleListing.imageUrl}
                  />
                ))}
              </div>
            </OnboardingSectionCard>

            <div className="space-y-2">
              <p className="text-sm font-semibold">
                Are you happy with your listing?
              </p>
              <p className="text-muted-foreground text-sm">
                If not, go back and update your listing card before continuing.
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
        ) : null}

        {currentStep.id === "preview-buyer-contact" ? (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold tracking-tight">
              How buyers contact you
            </h2>
            <p className="text-muted-foreground max-w-3xl">
              This example shows the two common paths to contact you: visiting
              your catalog profile or adding priced listings to cart before
              messaging by email.
            </p>

            <div className="space-y-4">
              <div className="grid gap-6 lg:grid-cols-[repeat(2,minmax(0,24rem))] lg:justify-start">
                <div className="space-y-3">
                  <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                    Path 1: Direct message
                  </p>
                  <p className="text-sm font-medium">
                    Buyer opens your catalog profile and can send an email
                    message immediately.
                  </p>
                  <div className="max-w-sm">
                    <ProfilePreviewCard
                      title={
                        profileDraft.gardenName.trim() ||
                        DEFAULT_GARDEN_NAME_PLACEHOLDER
                      }
                      description={
                        profileDraft.description.trim() ||
                        DEFAULT_PROFILE_DESCRIPTION_PLACEHOLDER
                      }
                      imageUrl={profileImagePreviewUrl}
                      location={
                        profileDraft.location.trim() ||
                        DEFAULT_LOCATION_PLACEHOLDER
                      }
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
                </div>

                <div className="space-y-3">
                  <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                    Path 2: Message with cart
                  </p>
                  <p className="text-sm font-medium">
                    Buyer opens your listing. If it has a price, they can add it
                    to cart and send one email with item details.
                  </p>
                  <div className="max-w-sm">
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
                  <Button type="button" className="w-full lg:w-auto">
                    <MessageCircle className="h-4 w-4" />
                    Contact Seller (1 item)
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold">What this enables</p>
                <div className="grid gap-3 lg:grid-cols-3">
                  {ONBOARDING_BUYER_FLOW_BULLETS.map((bullet, index) => (
                    <div
                      key={bullet}
                      className="bg-background rounded-lg border p-3"
                    >
                      <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                        Point {index + 1}
                      </p>
                      <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                        {bullet}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <p className="text-muted-foreground text-sm">
              Next you can review optional Pro plans, or continue for now and go
              straight to your dashboard.
            </p>
          </div>
        ) : null}

        {currentStep.id === "start-membership" ? (
          <div className="space-y-6" data-testid="start-membership-page">
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
                    Publish a clean catalog under your garden name and appear in
                    seller browsing, search, and cultivar pages where collectors
                    research varieties.
                  </p>
                </div>

                <div className="space-y-4">
                  <CheckoutButton
                    size="lg"
                    variant="default"
                    className="h-12 w-full text-base font-semibold lg:w-auto lg:px-8"
                    data-testid="start-membership-checkout"
                    checkoutSource="onboarding-membership-step"
                  >
                    Start {SUBSCRIPTION_CONFIG.FREE_TRIAL_DAYS}-day free trial
                  </CheckoutButton>

                  <p className="text-muted-foreground text-sm">
                    Then{" "}
                    {membershipPriceDisplay
                      ? `${membershipPriceDisplay.amount}${membershipPriceDisplay.interval}${
                          membershipPriceDisplay.monthlyEquivalent
                            ? ` (${membershipPriceDisplay.monthlyEquivalent}/mo)`
                            : ""
                        }`
                      : "the full plan price shown in Stripe checkout before you confirm"}
                    . Cancel anytime.
                  </p>
                  {SUBSCRIPTION_CONFIG.FREE_TRIAL_DAYS > 0 ? (
                    <p className="text-muted-foreground text-xs">
                      No charge now. Your {SUBSCRIPTION_CONFIG.FREE_TRIAL_DAYS}
                      -day trial starts after you confirm in Stripe.
                    </p>
                  ) : null}
                  {!membershipPriceDisplay ? (
                    <p className="text-muted-foreground text-xs">
                      You&apos;ll see the exact amount before any charge is made.
                    </p>
                  ) : null}

                  <Link
                    href="/dashboard"
                    className="text-muted-foreground/70 hover:text-muted-foreground inline-block text-xs underline decoration-muted-foreground/40 underline-offset-2"
                    data-testid="start-membership-continue"
                    onClick={handleMembershipContinueForNow}
                  >
                    Continue for now
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
                    Pricing shown at checkout
                  </p>
                )}

                <p className="text-muted-foreground mt-3 text-lg">
                  Secure payments powered by Stripe.
                </p>

                {membershipPriceDisplay?.monthlyEquivalent ? (
                  <p className="text-muted-foreground mt-1 text-base">
                    {membershipPriceDisplay.monthlyEquivalent}/mo billed annually.
                  </p>
                ) : null}

                <ul className="mt-8 space-y-5 text-2xl leading-tight">
                  {PRO_UNLOCKS.map((feature) => {
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

async function uploadGeneratedStarterProfileImage({
  blob,
  referenceId,
  getPresignedUrl,
}: {
  blob: Blob;
  referenceId: string;
  getPresignedUrl: (input: {
    type: "profile";
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
  const fileName = `starter-logo-${Date.now()}.jpg`;
  const contentType = blob.type || "image/jpeg";

  const { presignedUrl, key, url } = await getPresignedUrl({
    type: "profile",
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
    <Card className={className}>
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
        "border-primary/60 bg-background/95 text-primary absolute z-20 inline-flex h-7 w-7 items-center justify-center rounded-full border shadow-md transition-transform hover:scale-105",
        active && "ring-primary/25 ring-4",
        className,
      )}
    >
      {active ? (
        <span className="bg-primary relative inline-flex h-2.5 w-2.5 rounded-full">
          <span className="bg-primary/50 absolute inline-flex h-full w-full animate-ping rounded-full" />
        </span>
      ) : (
        <span className="bg-primary/80 inline-flex h-2.5 w-2.5 rounded-full" />
      )}
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
          src={imageUrl}
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
          src={imageUrl}
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
        <div className="flex items-center justify-between gap-2">
          <div className="text-muted-foreground inline-flex items-center gap-1 text-xs">
            <Link2 className="h-3.5 w-3.5" />
            {linkedLabel ? `Linked: ${linkedLabel}` : "Inquiry only"}
          </div>
          {variant === "owned" && price !== null ? (
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
      </div>
    </div>
  );
}
