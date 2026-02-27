"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  Eye,
  Filter,
  Link2,
  MapPin,
  Search,
  ShoppingCart,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  AhsListingSelect,
  type AhsSearchResult,
} from "@/components/ahs-listing-select";
import { CurrencyInput } from "@/components/currency-input";
import { ImageUpload } from "@/components/image-upload";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { SUBSCRIPTION_CONFIG } from "@/config/subscription-config";
import { getErrorMessage } from "@/lib/error-utils";
import { cn, formatPrice, uploadFileWithProgress } from "@/lib/utils";
import { api } from "@/trpc/react";
import type { ImageUploadResponse } from "@/types/image";
import {
  filterOnboardingSearchDemoListings,
  getNextIncompleteListingField,
  getNextIncompleteProfileField,
  isListingOnboardingDraftComplete,
  isProfileOnboardingDraftComplete,
  ONBOARDING_SEARCH_DEMO_LISTINGS,
  ONBOARDING_STEPS,
  STARTER_PROFILE_IMAGES,
  type ListingOnboardingDraft,
  type ListingOnboardingField,
  type ProfileOnboardingDraft,
  type ProfileOnboardingField,
} from "./onboarding-utils";

const PROFILE_PLACEHOLDER_IMAGE = "/assets/catalog-blooms.webp";
const LISTING_PLACEHOLDER_IMAGE = "/assets/cultivar-grid.webp";

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
};
const OWNED_ONBOARDING_LISTING_ID = "your-first-listing";

export function StartOnboardingPageClient() {
  const router = useRouter();
  const utils = api.useUtils();

  const [stepIndex, setStepIndex] = useState(0);
  const [focusedProfileField, setFocusedProfileField] =
    useState<ProfileOnboardingField>("gardenName");
  const [activeListingField, setActiveListingField] =
    useState<ListingOnboardingField>("cultivar");

  const [profileDraft, setProfileDraft] =
    useState<ProfileOnboardingDraft>(DEFAULT_PROFILE_DRAFT);
  const [listingDraft, setListingDraft] =
    useState<ListingOnboardingDraft>(DEFAULT_LISTING_DRAFT);

  const [selectedProfileImageId, setSelectedProfileImageId] = useState<string | null>(
    null,
  );
  const [selectedStarterImageUrl, setSelectedStarterImageUrl] = useState<string | null>(
    null,
  );
  const [profileImageInputMode, setProfileImageInputMode] = useState<
    "starter" | "upload"
  >("starter");
  const [applyStarterNameOverlay, setApplyStarterNameOverlay] = useState(true);
  const [isGeneratingStarterImage, setIsGeneratingStarterImage] = useState(false);
  const [pendingStarterImageBlob, setPendingStarterImageBlob] =
    useState<Blob | null>(null);
  const [pendingStarterPreviewUrl, setPendingStarterPreviewUrl] = useState<
    string | null
  >(null);
  const [selectedCultivarName, setSelectedCultivarName] = useState<string | null>(
    null,
  );

  const [savedListingId, setSavedListingId] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingListing, setIsSavingListing] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [forSaleOnly, setForSaleOnly] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(true);
  const [maxPriceFilter, setMaxPriceFilter] = useState<number | null>(null);
  const [linkedOnlyFilter, setLinkedOnlyFilter] = useState(false);

  const profileQuery = api.dashboardDb.userProfile.get.useQuery();
  const imagesQuery = api.dashboardDb.image.list.useQuery(undefined, {
    enabled: Boolean(profileQuery.data?.id),
  });
  const listingQuery = api.dashboardDb.listing.list.useQuery();

  const updateProfileMutation = api.dashboardDb.userProfile.update.useMutation();
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
  const gardenNameInputRef = useRef<HTMLInputElement | null>(null);
  const gardenLocationInputRef = useRef<HTMLInputElement | null>(null);
  const gardenDescriptionInputRef = useRef<HTMLTextAreaElement | null>(null);
  const profileImageEditorRef = useRef<HTMLDivElement | null>(null);
  const starterImageGenerationTimeoutRef = useRef<number | null>(null);
  const starterImageGenerationRequestIdRef = useRef(0);

  useEffect(() => {
    if (!profileQuery.data || hasHydratedProfile.current) {
      return;
    }

    hasHydratedProfile.current = true;

    const nextImage = profileQuery.data.logoUrl ?? null;

    setProfileDraft({
      gardenName: profileQuery.data.title ?? "",
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
    if (!profileQuery.data?.id || !imagesQuery.data || hasHydratedProfileImage.current) {
      return;
    }

    hasHydratedProfileImage.current = true;

    const profileImageUrl =
      imagesQuery.data.find((image) => image.userProfileId === profileQuery.data?.id)
        ?.url ?? null;

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
  }, [listingQuery.data]);

  const currentStep = ONBOARDING_STEPS[stepIndex] ?? ONBOARDING_STEPS[0]!;
  const profileMissingField = getNextIncompleteProfileField(profileDraft);
  const listingMissingField = getNextIncompleteListingField(listingDraft);
  const profileImages = useMemo(() => {
    if (!profileQuery.data?.id) {
      return [];
    }

    return (imagesQuery.data ?? []).filter(
      (image) => image.userProfileId === profileQuery.data.id,
    );
  }, [imagesQuery.data, profileQuery.data?.id]);

  const progressValue = ((stepIndex + 1) / ONBOARDING_STEPS.length) * 100;

  const searchListings = useMemo(() => {
    if (!isListingOnboardingDraftComplete(listingDraft)) {
      return [...ONBOARDING_SEARCH_DEMO_LISTINGS];
    }

    return [
      {
        id: OWNED_ONBOARDING_LISTING_ID,
        title: listingDraft.title.trim(),
        description: listingDraft.description.trim(),
        price: listingDraft.price,
        hasCultivarLink: true,
      },
      ...ONBOARDING_SEARCH_DEMO_LISTINGS,
    ];
  }, [listingDraft]);

  const filteredSearchListings = useMemo(
    () =>
      filterOnboardingSearchDemoListings(searchListings, {
        query: searchQuery,
        forSaleOnly,
        maxPrice: maxPriceFilter,
        linkedOnly: linkedOnlyFilter,
      }),
    [forSaleOnly, linkedOnlyFilter, maxPriceFilter, searchListings, searchQuery],
  );
  const isOwnedListingVisible = filteredSearchListings.some(
    (listing) => listing.id === OWNED_ONBOARDING_LISTING_ID,
  );

  const profileImagePreviewUrl = profileDraft.profileImageUrl ?? PROFILE_PLACEHOLDER_IMAGE;

  const listingTitlePreview = listingDraft.title.trim() || "Your first listing title";
  const listingDescriptionPreview =
    listingDraft.description.trim() ||
    "Write a short description so buyers know what makes this plant special.";

  const clearPendingStarterImage = () => {
    setPendingStarterPreviewUrl((previousPreviewUrl) => {
      if (previousPreviewUrl) {
        URL.revokeObjectURL(previousPreviewUrl);
      }

      return null;
    });
    setPendingStarterImageBlob(null);
  };

  const cancelStarterImageGeneration = () => {
    if (starterImageGenerationTimeoutRef.current !== null) {
      window.clearTimeout(starterImageGenerationTimeoutRef.current);
      starterImageGenerationTimeoutRef.current = null;
    }

    starterImageGenerationRequestIdRef.current += 1;
    setIsGeneratingStarterImage(false);
  };

  const scheduleStarterImageGeneration = ({
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
  };

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

  const handleStarterImageSelect = (baseImageUrl: string) => {
    setProfileImageInputMode("starter");
    setSelectedProfileImageId(null);
    setSelectedStarterImageUrl(baseImageUrl);
    setProfileDraft((previous) => ({
      ...previous,
      profileImageUrl: baseImageUrl,
    }));

    if (!applyStarterNameOverlay) {
      cancelStarterImageGeneration();
      clearPendingStarterImage();
      return;
    }

    const gardenName = profileDraft.gardenName.trim();
    if (!gardenName) {
      cancelStarterImageGeneration();
      clearPendingStarterImage();
      toast.error("Add your garden name first to stamp it on starter images.");
      focusProfileField("gardenName");
      return;
    }

    scheduleStarterImageGeneration({
      baseImageUrl,
      gardenName,
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

    const gardenName = profileDraft.gardenName.trim();
    if (!gardenName) {
      return;
    }

    scheduleStarterImageGeneration({
      baseImageUrl: selectedStarterImageUrl,
      gardenName,
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

    const imagesToDelete = profileImages.filter((image) => image.id !== imageToKeepId);
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

  const handleAhsSelect = (result: AhsSearchResult) => {
    if (!result.cultivarReferenceId) {
      toast.error("This cultivar cannot be linked yet.");
      return;
    }

    const nextDraft = {
      ...listingDraft,
      cultivarReferenceId: result.cultivarReferenceId,
      title:
        listingDraft.title.trim().length > 0
          ? listingDraft.title
          : (result.name ?? listingDraft.title),
    };

    setListingDraft(nextDraft);
    setSelectedCultivarName(result.name ?? null);

    const nextIncomplete = getNextIncompleteListingField(nextDraft);
    setActiveListingField(nextIncomplete ?? "title");
  };

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
      setActiveListingField(listingMissingField ?? "cultivar");
      toast.error("Complete cultivar, title, price, and description first.");
      return false;
    }

    setIsSavingListing(true);

    try {
      let listingId = savedListingId;

      if (!listingId) {
        const createdListing = await createListingMutation.mutateAsync({
          title: listingDraft.title.trim(),
          cultivarReferenceId: listingDraft.cultivarReferenceId,
        });

        listingId = createdListing.id;
        setSavedListingId(createdListing.id);
      }

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

      await utils.dashboardDb.listing.list.invalidate();

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

  const goToNextStep = () => {
    setStepIndex((previous) =>
      Math.min(previous + 1, ONBOARDING_STEPS.length - 1),
    );
  };

  const goToPreviousStep = () => {
    setStepIndex((previous) => Math.max(previous - 1, 0));
  };

  const applyFocusOnOwnedListingFilters = () => {
    if (!isListingOnboardingDraftComplete(listingDraft)) {
      return;
    }

    setSearchQuery(listingDraft.title.trim());
    setForSaleOnly(true);
    setShowAdvancedFilters(true);
    setLinkedOnlyFilter(true);
    setMaxPriceFilter(listingDraft.price);
  };

  const resetSearchDemoFilters = () => {
    setSearchQuery("");
    setForSaleOnly(false);
    setShowAdvancedFilters(true);
    setLinkedOnlyFilter(false);
    setMaxPriceFilter(null);
  };

  const handlePrimaryAction = async () => {
    switch (currentStep.id) {
      case "build-profile-card": {
        const didSave = await saveProfileDraft();
        if (didSave) {
          goToNextStep();
        }
        return;
      }
      case "build-listing-card": {
        const didSave = await saveListingDraft();
        if (didSave) {
          goToNextStep();
        }
        return;
      }
      case "search-and-filter-demo": {
        router.push(SUBSCRIPTION_CONFIG.NEW_USER_MEMBERSHIP_PATH);
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
        return isSavingProfile ? "Saving profile..." : "Save profile and continue";
      case "preview-profile-card":
        return "Build my first listing";
      case "build-listing-card":
        return isSavingListing ? "Saving listing..." : "Save listing and continue";
      case "preview-listing-card":
        return "Show cultivar page example";
      case "preview-cultivar-page":
        return "Show search and filter example";
      case "search-and-filter-demo":
        return "Continue to membership";
      default:
        return "Continue";
    }
  })();

  const primaryButtonDisabled =
    (currentStep.id === "build-profile-card" &&
      (!isProfileOnboardingDraftComplete(profileDraft) || isSavingProfile)) ||
    (currentStep.id === "build-listing-card" &&
      (!isListingOnboardingDraftComplete(listingDraft) || isSavingListing));

  return (
    <div className="bg-muted/20 min-h-svh" data-testid="start-onboarding-page">
      <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-6 md:px-8 md:py-10">
        <header className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <Badge variant="secondary" className="w-fit">
                Guided onboarding
              </Badge>
              <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
                Build your catalog in minutes.
              </h1>
              <p className="text-muted-foreground max-w-3xl text-base md:text-lg">
                We&apos;ll walk through profile setup, your first listing, buyer discovery,
                and search tools before you choose your membership path.
              </p>
            </div>
            <div className="text-right">
              <p className="text-muted-foreground text-sm">
                Step {stepIndex + 1} of {ONBOARDING_STEPS.length}
              </p>
              <p className="text-xl font-semibold">{currentStep.title}</p>
            </div>
          </div>

          <Progress value={progressValue} className="h-2" />

          <div className="pb-1">
            <div className="flex flex-wrap gap-2">
              {ONBOARDING_STEPS.map((step, index) => {
                const isCurrent = index === stepIndex;
                const isComplete = index < stepIndex;

                return (
                  <div
                    key={step.id}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      isCurrent && "border-primary bg-primary/10 text-primary",
                      isComplete &&
                        "border-emerald-500/40 bg-emerald-500/10 text-emerald-700",
                      !isCurrent && !isComplete && "text-muted-foreground",
                    )}
                  >
                    <span className="inline-flex items-center gap-1">
                      {isComplete ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
                      {`Step ${index + 1}`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </header>

        {currentStep.id === "build-profile-card" ? (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,480px)]">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Edit your catalog card</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-muted-foreground text-sm leading-relaxed">
                  This is how customers will see your catalog card on the Catalogs page.
                  Edit these fields and watch the preview update live.
                </p>

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
                    placeholder="Sunrise Daylily Farm"
                    value={profileDraft.gardenName}
                    onFocus={() => setFocusedProfileField("gardenName")}
                    onChange={(event) => {
                      const nextDraft = {
                        ...profileDraft,
                        gardenName: event.target.value,
                      };
                      setProfileDraft(nextDraft);

                      if (selectedStarterImageUrl && applyStarterNameOverlay) {
                        const trimmedGardenName = nextDraft.gardenName.trim();

                        if (!trimmedGardenName) {
                          cancelStarterImageGeneration();
                          clearPendingStarterImage();
                          setProfileDraft((previous) => ({
                            ...previous,
                            profileImageUrl: selectedStarterImageUrl,
                          }));
                        } else {
                          scheduleStarterImageGeneration({
                            baseImageUrl: selectedStarterImageUrl,
                            gardenName: trimmedGardenName,
                            debounceMs: 150,
                          });
                        }
                      }
                    }}
                  />
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Your garden name is your storefront title. Buyers will use it to
                    recognize and return to your catalog.
                  </p>
                </div>

                <div
                  className={cn(
                    "space-y-2 rounded-lg border p-4 transition-colors",
                    focusedProfileField === "location" && "border-primary bg-primary/5",
                  )}
                >
                  <Label htmlFor="garden-location">Location</Label>
                  <Input
                    ref={gardenLocationInputRef}
                    id="garden-location"
                    placeholder="Snohomish, WA"
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
                    Add your city and state so buyers know where you grow and whether you
                    are likely a regional fit.
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
                      Your photo is what customers notice first when scanning catalogs.
                    </p>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button
                      type="button"
                      variant={
                        profileImageInputMode === "starter" ? "default" : "outline"
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
                        profileImageInputMode === "upload" ? "default" : "outline"
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
                          <Label htmlFor="starter-overlay" className="cursor-pointer">
                            Stamp garden name onto starter image
                          </Label>
                          <p className="text-muted-foreground text-xs">
                            Enabled by default. This applies only to starter images and
                            never to uploaded photos.
                          </p>
                        </div>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-3">
                        {STARTER_PROFILE_IMAGES.map((image) => (
                          <button
                            key={image.id}
                            type="button"
                            className={cn(
                              "rounded-lg border p-2 text-left transition",
                              profileDraft.profileImageUrl === image.url ||
                                selectedStarterImageUrl === image.url
                                ? "border-primary bg-primary/5"
                                : "hover:border-primary/50",
                            )}
                            onClick={() => {
                              handleStarterImageSelect(image.url);
                            }}
                            disabled={isGeneratingStarterImage}
                          >
                            <div className="relative aspect-square overflow-hidden rounded-md">
                              <Image
                                src={image.url}
                                alt={image.label}
                                fill
                                className="object-cover"
                                sizes="(max-width: 640px) 33vw, 120px"
                              />
                            </div>
                            <p className="mt-2 text-xs font-medium">{image.label}</p>
                          </button>
                        ))}
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
                        Drag and drop an image, then crop and adjust it before saving.
                      </p>
                      {profileQuery.data?.id ? (
                        <div className="rounded-lg border bg-background p-3">
                          <ImageUpload
                            type="profile"
                            referenceId={profileQuery.data.id}
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
                    focusedProfileField === "description" &&
                      "border-primary bg-primary/5",
                  )}
                >
                  <Label htmlFor="garden-description">Garden description</Label>
                  <Textarea
                    ref={gardenDescriptionInputRef}
                    id="garden-description"
                    rows={5}
                    placeholder="Share what you grow, what collectors can expect, and your shipping style."
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
                    Tell buyers what you grow and what kind of buying experience they can
                    expect from you.
                  </p>
                </div>

                {profileMissingField ? (
                  <p className="text-muted-foreground text-sm">
                    Next up: <span className="font-medium">{profileMissingField}</span>
                  </p>
                ) : (
                  <p className="text-sm font-medium text-emerald-700">
                    Profile card is ready to save.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardContent className="space-y-4 p-4 md:p-6">
                <div className="relative overflow-hidden rounded-2xl border bg-card">
                  <div className="relative aspect-square overflow-hidden border-b bg-muted">
                    <Image
                      src={profileImagePreviewUrl}
                      alt="Profile preview"
                      fill
                      className="object-cover"
                      sizes="(max-width: 1279px) 100vw, 460px"
                      unoptimized
                    />
                    <HotspotButton
                      className="left-3 top-3"
                      label="Edit profile image"
                      active={focusedProfileField === "image"}
                      onClick={() => focusProfileField("image")}
                    />
                  </div>

                  <div className="space-y-4 p-4">
                    <div className="relative">
                      <HotspotButton
                        className="right-2 top-1"
                        label="Edit garden name"
                        active={focusedProfileField === "gardenName"}
                        onClick={() => focusProfileField("gardenName")}
                      />
                      <p className="pr-10 text-4xl leading-tight font-bold tracking-tight">
                        {profileDraft.gardenName.trim() || "Your garden name"}
                      </p>
                    </div>

                    <div className="relative">
                      <HotspotButton
                        className="right-2 top-0"
                        label="Edit location"
                        active={focusedProfileField === "location"}
                        onClick={() => focusProfileField("location")}
                      />
                      <Badge
                        variant="secondary"
                        className="inline-flex items-center gap-1 pr-10 text-base"
                      >
                        <MapPin className="h-4 w-4" />
                        {profileDraft.location.trim() || "Add your city, ST"}
                      </Badge>
                    </div>

                    <div className="relative">
                      <HotspotButton
                        className="right-2 top-2"
                        label="Edit description"
                        active={focusedProfileField === "description"}
                        onClick={() => focusProfileField("description")}
                      />
                      <p className="text-muted-foreground pr-10 text-lg leading-relaxed">
                        {profileDraft.description.trim() ||
                          "Add a short intro so collectors know what you specialize in."}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {currentStep.id === "preview-profile-card" ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(340px,420px)]">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Catalog discovery preview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  This is an example gallery view, not the live catalogs page. It mirrors
                  how customers discover gardens first when browsing catalogs.
                </p>
                <p className="text-sm font-medium text-emerald-700">
                  Look for the <span className="rounded bg-emerald-100 px-1">Yours</span>{" "}
                  badge to spot your card.
                </p>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <ProfilePreviewCard
                    title={profileDraft.gardenName || "Your garden name"}
                    description={
                      profileDraft.description ||
                      "Your description appears here for browsing collectors."
                    }
                    imageUrl={profileImagePreviewUrl}
                    location={profileDraft.location || "Add your city, ST"}
                    highlighted={true}
                    ownershipBadge="Yours"
                  />
                  <ProfilePreviewCard
                    title="Prairie Bloom Gardens"
                    description="Seasonal favorites and regional shipping updates weekly."
                    imageUrl="/assets/aerial-garden.webp"
                    location="Eugene, OR"
                  />
                  <ProfilePreviewCard
                    title="Willow Daylilies"
                    description="Collector-focused stock with curated cultivar groupings."
                    imageUrl="/assets/hero-garden.webp"
                    location="Boise, ID"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-xl">What this unlocks</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <PreviewBullet text="Collectors can identify your catalog quickly by image + name." />
                <PreviewBullet text="Your description helps the right buyers click through." />
                <PreviewBullet text="This same profile info is reused across public pages." />
              </CardContent>
            </Card>
          </div>
        ) : null}

        {currentStep.id === "build-listing-card" ? (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,500px)]">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Build your first listing card</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <GuideChecklistItem
                    label="Cultivar reference"
                    complete={listingDraft.cultivarReferenceId !== null}
                    active={activeListingField === "cultivar"}
                    onClick={() => setActiveListingField("cultivar")}
                  />
                  <GuideChecklistItem
                    label="Listing title"
                    complete={listingDraft.title.trim().length > 0}
                    active={activeListingField === "title"}
                    onClick={() => setActiveListingField("title")}
                  />
                  <GuideChecklistItem
                    label="Price"
                    complete={listingDraft.price !== null}
                    active={activeListingField === "price"}
                    onClick={() => setActiveListingField("price")}
                  />
                  <GuideChecklistItem
                    label="Description"
                    complete={listingDraft.description.trim().length > 0}
                    active={activeListingField === "description"}
                    onClick={() => setActiveListingField("description")}
                  />
                </div>

                <Separator />

                {activeListingField === "cultivar" ? (
                  <div className="space-y-3">
                    <Label>Link to a daylily database cultivar</Label>
                    <AhsListingSelect
                      onSelect={handleAhsSelect}
                      selectedLabel={selectedCultivarName}
                    />
                    {selectedCultivarName ? (
                      <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3">
                        <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide text-emerald-800 uppercase">
                          <CheckCircle2 className="h-4 w-4" />
                          Selected cultivar
                        </p>
                        <p className="mt-1 text-sm font-medium">{selectedCultivarName}</p>
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm">
                        Search and select the cultivar buyers already recognize.
                      </p>
                    )}
                  </div>
                ) : null}

                {activeListingField === "title" ? (
                  <div className="space-y-2">
                    <Label htmlFor="listing-title">Listing title</Label>
                    <Input
                      id="listing-title"
                      value={listingDraft.title}
                      onChange={(event) =>
                        setListingDraft({
                          ...listingDraft,
                          title: event.target.value,
                        })
                      }
                      placeholder="Moonlit Petals division"
                    />
                  </div>
                ) : null}

                {activeListingField === "price" ? (
                  <div className="space-y-2">
                    <Label htmlFor="listing-price">Price</Label>
                    <CurrencyInput
                      id="listing-price"
                      value={listingDraft.price}
                      onChange={(value) =>
                        setListingDraft({
                          ...listingDraft,
                          price: value,
                        })
                      }
                      placeholder="25"
                    />
                  </div>
                ) : null}

                {activeListingField === "description" ? (
                  <div className="space-y-2">
                    <Label htmlFor="listing-description">Description</Label>
                    <Textarea
                      id="listing-description"
                      rows={5}
                      value={listingDraft.description}
                      onChange={(event) =>
                        setListingDraft({
                          ...listingDraft,
                          description: event.target.value,
                        })
                      }
                      placeholder="What makes this fan worth adding to a collector garden?"
                    />
                  </div>
                ) : null}

                {listingMissingField ? (
                  <p className="text-muted-foreground text-sm">
                    Next up: <span className="font-medium">{listingMissingField}</span>
                  </p>
                ) : (
                  <p className="text-sm font-medium text-emerald-700">
                    Listing card is ready to save.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-4 p-4 md:p-6">
                <div className="relative overflow-hidden rounded-xl border bg-card p-3">
                  <div className="relative aspect-square overflow-hidden rounded-lg border bg-muted">
                    <Image
                      src={LISTING_PLACEHOLDER_IMAGE}
                      alt="Listing preview"
                      fill
                      className="object-cover"
                      sizes="(max-width: 1279px) 100vw, 460px"
                    />
                    <HotspotButton
                      className="left-3 top-3"
                      label="Edit cultivar link"
                      active={activeListingField === "cultivar"}
                      onClick={() => setActiveListingField("cultivar")}
                    />
                  </div>

                  <div className="relative mt-3 rounded-lg border bg-background p-4">
                    <HotspotButton
                      className="right-3 top-3"
                      label="Edit listing title"
                      active={activeListingField === "title"}
                      onClick={() => setActiveListingField("title")}
                    />
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-lg font-semibold tracking-tight">{listingTitlePreview}</p>
                      {listingDraft.price !== null ? (
                        <Badge variant="secondary">{formatPrice(listingDraft.price)}</Badge>
                      ) : (
                        <Badge variant="outline">Add price</Badge>
                      )}
                    </div>
                    <div
                      className={cn(
                        "mt-2 inline-flex items-center gap-2 rounded-md px-2 py-1 text-xs",
                        selectedCultivarName
                          ? "bg-emerald-500/10 text-emerald-800"
                          : "text-muted-foreground",
                      )}
                    >
                      {selectedCultivarName ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : (
                        <Link2 className="h-3.5 w-3.5" />
                      )}
                      <span>
                        {selectedCultivarName
                          ? `Linked to ${selectedCultivarName}`
                          : "Link a cultivar reference"}
                      </span>
                    </div>
                  </div>

                  <div className="relative mt-3 rounded-lg border bg-background p-4">
                    <HotspotButton
                      className="right-3 top-3"
                      label="Edit price"
                      active={activeListingField === "price"}
                      onClick={() => setActiveListingField("price")}
                    />
                    <HotspotButton
                      className="right-3 top-12"
                      label="Edit listing description"
                      active={activeListingField === "description"}
                      onClick={() => setActiveListingField("description")}
                    />
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {listingDescriptionPreview}
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border border-dashed p-3 text-sm">
                  <p className="inline-flex items-center gap-2 font-medium">
                    <Sparkles className="h-4 w-4" />
                    Tip
                  </p>
                  <p className="text-muted-foreground mt-1">
                    Listings with cultivar links and price are easier for buyers to trust.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {currentStep.id === "preview-listing-card" ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(340px,420px)]">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Finished listing card preview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  This is an example buyer-facing card preview, using your new listing data.
                </p>
                <p className="text-sm font-medium text-emerald-700">
                  Look for the <span className="rounded bg-emerald-100 px-1">Yours</span>{" "}
                  badge to spot your listing.
                </p>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  <ListingPreviewCard
                    title={listingTitlePreview}
                    description={listingDescriptionPreview}
                    price={listingDraft.price}
                    linkedLabel={selectedCultivarName}
                    highlighted={true}
                    ownershipBadge="Yours"
                  />
                  <ListingPreviewCard
                    title="Amber Twilight"
                    description="Dormant fan, healthy roots, spring shipping window."
                    price={27}
                    linkedLabel="Amber Twilight"
                  />
                  <ListingPreviewCard
                    title="Collector Mix"
                    description="Unlinked starter pack listing for local pickup events."
                    price={null}
                    linkedLabel={null}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-xl">What buyers scan first</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <PreviewBullet text="Clear title and price for quick comparisons." />
                <PreviewBullet text="Cultivar link for confidence and research context." />
                <PreviewBullet text="Description that explains condition and value." />
              </CardContent>
            </Card>
          </div>
        ) : null}

        {currentStep.id === "preview-cultivar-page" ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Cultivar page buyer experience</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-muted-foreground max-w-3xl">
                Here&apos;s an example cultivar page layout. Buyers can click your profile,
                open your listing, and add priced listings to their cart before sending an
                inquiry message.
              </p>

              <div className="grid gap-4 rounded-2xl border bg-background p-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)]">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Eye className="h-4 w-4" />
                    Cultivar: {selectedCultivarName ?? "Linked cultivar"}
                  </div>

                  <div className="rounded-xl border p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-muted-foreground text-xs">Seller profile</p>
                      <Badge variant="secondary">Yours</Badge>
                    </div>
                    <p className="mt-1 text-lg font-semibold">
                      {profileDraft.gardenName.trim() || "Your garden name"}
                    </p>
                    <p className="text-muted-foreground mt-2 text-sm">
                      {profileDraft.description.trim() ||
                        "Your profile description appears here so buyers know who they are messaging."}
                    </p>
                    <div className="mt-4">
                      <Button type="button" variant="outline" size="sm">
                        Visit profile
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-xl border p-4">
                    <div className="mb-2 flex justify-end">
                      <Badge variant="secondary">Your listing</Badge>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-lg font-semibold">{listingTitlePreview}</p>
                      {listingDraft.price !== null ? (
                        <Badge variant="secondary">{formatPrice(listingDraft.price)}</Badge>
                      ) : (
                        <Badge variant="outline">No price</Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
                      {listingDescriptionPreview}
                    </p>
                    <div className="mt-4">
                      <Button type="button" size="sm" className="inline-flex items-center gap-2">
                        <ShoppingCart className="h-4 w-4" />
                        Add to cart
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border bg-muted/30 p-4">
                  <p className="text-sm font-semibold">Inquiry flow</p>
                  <ol className="text-muted-foreground mt-3 space-y-2 text-sm">
                    <li>1. Buyer adds priced listings to cart.</li>
                    <li>2. They send a message with cart details.</li>
                    <li>3. You respond from your dashboard to coordinate sale.</li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {currentStep.id === "search-and-filter-demo" ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Search and filter demo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-muted-foreground max-w-3xl">
                This example keeps basic search visible while advanced filters expand in the
                same panel, so buyers can quickly narrow your inventory.
              </p>
              <p className="text-muted-foreground text-sm">
                Next, you&apos;ll choose membership. You can continue for now to reach your
                dashboard and upgrade later.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-muted-foreground text-sm">Try it:</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={applyFocusOnOwnedListingFilters}
                  disabled={!isListingOnboardingDraftComplete(listingDraft)}
                >
                  Focus on my listing
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={resetSearchDemoFilters}
                >
                  Reset filters
                </Button>
              </div>

              <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
                <div className="space-y-4 rounded-xl border bg-background p-4">
                  <div className="space-y-2">
                    <Label htmlFor="search-query" className="inline-flex items-center gap-2">
                      <Search className="h-4 w-4" />
                      Basic search
                    </Label>
                    <Input
                      id="search-query"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Search title or description"
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <Label htmlFor="for-sale-toggle" className="text-sm">
                      Only show priced listings
                    </Label>
                    <Switch
                      id="for-sale-toggle"
                      checked={forSaleOnly}
                      onCheckedChange={setForSaleOnly}
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <Label htmlFor="advanced-toggle" className="inline-flex items-center gap-2 text-sm">
                      <Filter className="h-4 w-4" />
                      Show advanced filters
                    </Label>
                    <Switch
                      id="advanced-toggle"
                      checked={showAdvancedFilters}
                      onCheckedChange={setShowAdvancedFilters}
                    />
                  </div>

                  {showAdvancedFilters ? (
                    <div className="space-y-3 rounded-lg border border-dashed p-3">
                      <Label htmlFor="max-price" className="text-sm">
                        Max price
                      </Label>
                      <CurrencyInput
                        id="max-price"
                        value={maxPriceFilter}
                        onChange={setMaxPriceFilter}
                        placeholder="40"
                      />

                      <div className="flex items-center justify-between pt-1">
                        <Label htmlFor="linked-only" className="text-sm">
                          Linked cultivar only
                        </Label>
                        <Switch
                          id="linked-only"
                          checked={linkedOnlyFilter}
                          onCheckedChange={setLinkedOnlyFilter}
                        />
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="space-y-3 rounded-xl border bg-background p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">
                      Showing {filteredSearchListings.length} of {searchListings.length}
                    </p>
                    <Badge variant="outline">Example results</Badge>
                  </div>
                  <p
                    className={cn(
                      "text-xs font-medium",
                      isOwnedListingVisible ? "text-emerald-700" : "text-muted-foreground",
                    )}
                  >
                    {isOwnedListingVisible
                      ? "Your listing is visible in results."
                      : "Your listing is filtered out by current settings."}
                  </p>

                  <div className="space-y-3">
                    {filteredSearchListings.length > 0 ? (
                      filteredSearchListings.map((listing) => (
                        <SearchDemoResultRow
                          key={listing.id}
                          listing={listing}
                          isOwnedListing={
                            listing.id === OWNED_ONBOARDING_LISTING_ID
                          }
                        />
                      ))
                    ) : (
                      <div className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
                        No matches. Buyers can adjust filters to broaden results.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t pt-2">
          <div className="text-muted-foreground text-sm">{currentStep.description}</div>
          <div className="flex items-center gap-2">
            {stepIndex > 0 ? (
              <Button type="button" variant="outline" onClick={goToPreviousStep}>
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
        </footer>
      </div>
    </div>
  );
}

function SearchDemoResultRow({
  listing,
  isOwnedListing,
}: {
  listing: (typeof ONBOARDING_SEARCH_DEMO_LISTINGS)[number] | {
    id: string;
    title: string;
    description: string;
    price: number | null;
    hasCultivarLink: boolean;
  };
  isOwnedListing: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-start sm:justify-between",
        isOwnedListing && "border-emerald-500/40 bg-emerald-500/5",
      )}
    >
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold">{listing.title}</p>
          {isOwnedListing ? <Badge variant="secondary">Yours</Badge> : null}
        </div>
        <p className="text-muted-foreground text-sm">
          {listing.description}
        </p>
        <div className="text-muted-foreground inline-flex items-center gap-1 text-xs">
          <Link2 className="h-3.5 w-3.5" />
          {listing.hasCultivarLink
            ? "Linked cultivar"
            : "No cultivar link"}
        </div>
      </div>
      <div className="text-sm font-semibold">
        {listing.price !== null
          ? formatPrice(listing.price)
          : "Inquiry only"}
      </div>
    </div>
  );
}

function drawImageCoverSquare({
  context,
  image,
  size,
}: {
  context: CanvasRenderingContext2D;
  image: HTMLImageElement;
  size: number;
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
}

const STARTER_IMAGE_CANVAS_SIZE = 1200;
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
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Failed to create image blob"));
        return;
      }

      resolve(blob);
    }, type, quality);
  });
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
        "absolute z-20 inline-flex h-8 w-8 items-center justify-center rounded-full border bg-background text-primary shadow-sm transition-transform hover:scale-105",
        active && "border-primary",
        className,
      )}
    >
      {active ? (
        <span className="relative inline-flex h-3 w-3 rounded-full bg-primary">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/40" />
        </span>
      ) : (
        <span className="inline-flex h-2.5 w-2.5 rounded-full bg-primary/70" />
      )}
      <span className="sr-only">{label}</span>
    </button>
  );
}

function GuideChecklistItem({
  label,
  complete,
  active,
  onClick,
}: {
  label: string;
  complete: boolean;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors",
        active && "border-primary bg-primary/5",
        !active && "hover:border-primary/40",
      )}
    >
      <span className="font-medium">{label}</span>
      {complete ? (
        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
      ) : active ? (
        <Sparkles className="h-4 w-4 text-primary" />
      ) : (
        <Circle className="text-muted-foreground h-4 w-4" />
      )}
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
  highlighted = false,
  ownershipBadge,
}: {
  title: string;
  description: string;
  imageUrl: string;
  location?: string;
  highlighted?: boolean;
  ownershipBadge?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border bg-card",
        highlighted && "border-primary shadow-[0_0_0_2px_rgba(24,24,27,0.08)]",
      )}
    >
      <div className="relative aspect-square border-b">
        <Image src={imageUrl} alt={title} fill className="object-cover" unoptimized />
        {ownershipBadge ? (
          <Badge className="absolute left-3 top-3" variant="secondary">
            {ownershipBadge}
          </Badge>
        ) : null}
      </div>
      <div className="space-y-3 p-4">
        <p className="text-3xl leading-tight font-bold tracking-tight">{title}</p>

        {location ? (
          <Badge variant="secondary" className="inline-flex items-center gap-1 text-sm">
            <MapPin className="h-3.5 w-3.5" />
            {location}
          </Badge>
        ) : null}

        <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function ListingPreviewCard({
  title,
  description,
  price,
  linkedLabel,
  highlighted = false,
  ownershipBadge,
}: {
  title: string;
  description: string;
  price: number | null;
  linkedLabel: string | null;
  highlighted?: boolean;
  ownershipBadge?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border bg-card",
        highlighted && "border-primary shadow-[0_0_0_2px_rgba(24,24,27,0.08)]",
      )}
    >
      <div className="relative aspect-square border-b bg-muted">
        <Image
          src={LISTING_PLACEHOLDER_IMAGE}
          alt={title}
          fill
          className="object-cover"
          sizes="(max-width: 1024px) 50vw, 280px"
        />
        {ownershipBadge ? (
          <Badge className="absolute left-3 top-3" variant="secondary">
            {ownershipBadge}
          </Badge>
        ) : null}
      </div>
      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold tracking-tight">{title}</p>
          <Badge variant="secondary">
            {price !== null ? formatPrice(price) : "Inquiry"}
          </Badge>
        </div>
        <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
        <div className="text-muted-foreground inline-flex items-center gap-1 text-xs">
          <Link2 className="h-3.5 w-3.5" />
          {linkedLabel ? `Linked: ${linkedLabel}` : "Not linked"}
        </div>
      </div>
    </div>
  );
}
