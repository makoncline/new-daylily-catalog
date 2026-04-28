"use client";

import Image from "next/image";
import type { Dispatch, RefObject, SetStateAction } from "react";
import {
  CheckCircle2,
  Circle,
  Link2,
  MapPin,
  ShoppingCart,
} from "lucide-react";
import type { RouterOutputs } from "@/trpc/react";
import { AhsListingDisplay } from "@/components/ahs-listing-display";
import { CurrencyInput } from "@/components/currency-input";
import { IMAGE_CONFIG } from "@/components/optimized-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatPrice } from "@/lib/utils";
import { OnboardingAhsListingSelect } from "./onboarding-ahs-listing-select";
import type { AhsSearchResult } from "./onboarding-ahs-listing-select";
import { OnboardingDeferredImageUpload } from "./onboarding-deferred-image-upload";
import {
  HotspotButton,
  OnboardingStepGrid,
  PreviewBullet,
  PreviewPlaceholderNote,
} from "./onboarding-preview-cards";
import {
  DEFAULT_GARDEN_NAME_PLACEHOLDER,
  DEFAULT_LISTING_DESCRIPTION_PLACEHOLDER,
  DEFAULT_LISTING_TITLE_PLACEHOLDER,
  DEFAULT_LOCATION_PLACEHOLDER,
  DEFAULT_PROFILE_DESCRIPTION_PLACEHOLDER,
  getDescriptionLengthAimText,
  ONBOARDING_LISTING_DEFAULTS,
  ONBOARDING_LISTING_DESCRIPTION_GUIDANCE,
  ONBOARDING_PROFILE_DESCRIPTION_SEO_GUIDANCE,
  STARTER_PROFILE_IMAGES,
  type ListingOnboardingDraft,
  type ListingOnboardingField,
  type ProfileOnboardingDraft,
  type ProfileOnboardingField,
} from "../onboarding-utils";

type SelectedCultivarDetails = RouterOutputs["dashboardDb"]["ahs"]["get"];

interface ChecklistItem {
  done: boolean;
  key: string;
  label: string;
  required: boolean;
}

interface OnboardingProfileEditStepProps {
  applyStarterNameOverlay: boolean;
  existingProfileImageUrl: string | null;
  focusedProfileField: ProfileOnboardingField;
  gardenDescriptionInputRef: RefObject<HTMLTextAreaElement | null>;
  gardenLocationInputRef: RefObject<HTMLInputElement | null>;
  gardenNameInputRef: RefObject<HTMLInputElement | null>;
  handleDeferredProfileImageCleared: () => void;
  handleDeferredProfileImageReady: (file: Blob) => void;
  handleGardenNameChange: (nextGardenName: string) => void;
  handleProfileImageModeChange: (mode: "starter" | "upload") => void;
  handleStarterImageSelect: (imageUrl: string) => void;
  handleStarterOverlayChange: (nextValue: boolean) => void;
  handleUseExistingProfileImageChange: (nextValue: boolean) => void;
  isGeneratingStarterImage: boolean;
  isProfileDescriptionInRecommendedRange: boolean;
  isProfileDescriptionPlaceholder: boolean;
  isProfileDescriptionTooLong: boolean;
  isProfileDescriptionTooShort: boolean;
  isProfileNamePlaceholder: boolean;
  isProfileLocationPlaceholder: boolean;
  pendingProfileUploadPreviewUrl: string | null;
  profileContinueChecklist: readonly ChecklistItem[];
  profileDescriptionCharacterCount: number;
  profileDescriptionPreview: string;
  profileDraft: ProfileOnboardingDraft;
  profileImageEditorRef: RefObject<HTMLDivElement | null>;
  profileImageInputMode: "starter" | "upload";
  profileImagePreviewUrl: string;
  profileMissingField: ProfileOnboardingField | null;
  profileNamePreview: string;
  profileLocationPreview: string;
  profileReady: boolean;
  selectedStarterImageUrl: string | null;
  setFocusedProfileField: Dispatch<SetStateAction<ProfileOnboardingField>>;
  setProfileDraft: Dispatch<SetStateAction<ProfileOnboardingDraft>>;
  useExistingProfileImage: boolean;
  focusProfileField: (field: ProfileOnboardingField) => void;
}

export function OnboardingProfileEditStep({
  applyStarterNameOverlay,
  existingProfileImageUrl,
  focusedProfileField,
  gardenDescriptionInputRef,
  gardenLocationInputRef,
  gardenNameInputRef,
  handleDeferredProfileImageCleared,
  handleDeferredProfileImageReady,
  handleGardenNameChange,
  handleProfileImageModeChange,
  handleStarterImageSelect,
  handleStarterOverlayChange,
  handleUseExistingProfileImageChange,
  isGeneratingStarterImage,
  isProfileDescriptionInRecommendedRange,
  isProfileDescriptionPlaceholder,
  isProfileDescriptionTooLong,
  isProfileDescriptionTooShort,
  isProfileLocationPlaceholder,
  isProfileNamePlaceholder,
  pendingProfileUploadPreviewUrl,
  profileContinueChecklist,
  profileDescriptionCharacterCount,
  profileDescriptionPreview,
  profileDraft,
  profileImageEditorRef,
  profileImageInputMode,
  profileImagePreviewUrl,
  profileLocationPreview,
  profileMissingField,
  profileNamePreview,
  profileReady,
  selectedStarterImageUrl,
  setFocusedProfileField,
  setProfileDraft,
  useExistingProfileImage,
  focusProfileField,
}: OnboardingProfileEditStepProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">
          Edit your profile
        </h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          This is how customers will see your catalog card on the Catalogs page.
          Edit these fields and watch the preview update live.
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
            <Label htmlFor="garden-name">Seller name (shown to buyers)</Label>
            <Input
              ref={gardenNameInputRef}
              id="garden-name"
              placeholder={DEFAULT_GARDEN_NAME_PLACEHOLDER}
              value={profileDraft.gardenName}
              onFocus={() => setFocusedProfileField("gardenName")}
              onChange={(event) => handleGardenNameChange(event.target.value)}
            />
            <p className="text-muted-foreground text-xs leading-relaxed">
              This is your storefront title. Buyers use it to recognize and
              return to your catalog.
            </p>
          </div>

          <div
            ref={profileImageEditorRef}
            tabIndex={-1}
            className={cn(
              "space-y-4 rounded-lg border p-4 transition-colors outline-none",
              focusedProfileField === "image" && "border-primary bg-primary/5",
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
                    Keep your current uploaded profile image unless you uncheck
                    this and choose a different one.
                  </p>
                </div>
              </div>
            ) : null}

            {!useExistingProfileImage ? (
              <div className="grid gap-2 lg:grid-cols-2">
                <Button
                  type="button"
                  variant={
                    profileImageInputMode === "starter" ? "default" : "outline"
                  }
                  onClick={() => {
                    setFocusedProfileField("image");
                    handleProfileImageModeChange("starter");
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
                    handleProfileImageModeChange("upload");
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
                    <Label htmlFor="starter-overlay" className="cursor-pointer">
                      Stamp seller name onto starter image
                    </Label>
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      Good for a quick starter logo. You can replace it with an
                      uploaded image at any time.
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
                        <p className="mt-2 text-xs font-medium">{image.label}</p>
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
                  Drag and drop an image, then crop and adjust it before saving.
                </p>
                {profileReady ? (
                  <div className="bg-background rounded-lg border p-3">
                    <OnboardingDeferredImageUpload
                      stagedPreviewUrl={pendingProfileUploadPreviewUrl}
                      onDeferredUploadReady={handleDeferredProfileImageReady}
                      onDeferredUploadCleared={handleDeferredProfileImageCleared}
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
              focusedProfileField === "location" && "border-primary bg-primary/5",
            )}
          >
            <Label htmlFor="garden-location">Location (recommended)</Label>
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
              Buyers often filter by region. Add your city and state to improve
              qualified inquiries.
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
                  isProfileDescriptionTooShort || isProfileDescriptionTooLong
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
                  isProfileDescriptionTooShort || isProfileDescriptionTooLong
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
                <p
                  className={cn(
                    "text-4xl leading-tight font-bold tracking-tight",
                    isProfileNamePlaceholder && "text-yellow-700",
                  )}
                >
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
                  className={cn(
                    "inline-flex items-center gap-1 pr-2 text-base",
                    isProfileLocationPlaceholder && "text-yellow-700",
                  )}
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
                <p
                  className={cn(
                    "text-lg leading-relaxed",
                    isProfileDescriptionPlaceholder
                      ? "text-yellow-700"
                      : "text-muted-foreground",
                  )}
                >
                  {profileDescriptionPreview}
                </p>
              </div>
            </div>
          </div>
          <PreviewPlaceholderNote />

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
                  <span className="text-muted-foreground"> (optional)</span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

interface OnboardingListingEditStepProps {
  activeListingField: ListingOnboardingField;
  focusListingField: (field: ListingOnboardingField) => void;
  handleAhsSelect: (result: AhsSearchResult) => void;
  handleDeferredListingImageCleared: () => void;
  handleDeferredListingImageReady: (file: Blob) => void;
  isListingCultivarPlaceholder: boolean;
  isListingDescriptionInRecommendedRange: boolean;
  isListingDescriptionPlaceholder: boolean;
  isListingDescriptionTooLong: boolean;
  isListingDescriptionTooShort: boolean;
  isListingPricePlaceholder: boolean;
  isListingTitlePlaceholder: boolean;
  isLoadingOnboardingCultivarOptions: boolean;
  listingContinueChecklist: readonly ChecklistItem[];
  listingCultivarRef: RefObject<HTMLDivElement | null>;
  listingDescriptionCharacterCount: number;
  listingDescriptionInputRef: RefObject<HTMLTextAreaElement | null>;
  listingDescriptionPreview: string;
  listingDraft: ListingOnboardingDraft;
  listingImageEditorRef: RefObject<HTMLDivElement | null>;
  listingImagePreviewUrl: string;
  listingMissingField: ListingOnboardingField | null;
  listingTitleInputRef: RefObject<HTMLInputElement | null>;
  listingTitlePreview: string;
  onboardingCultivarOptions: AhsSearchResult[];
  pendingListingUploadPreviewUrl: string | null;
  savedListingId: string | null;
  selectedCultivarDetails: SelectedCultivarDetails | undefined;
  selectedCultivarName: string | null;
  setActiveListingField: Dispatch<SetStateAction<ListingOnboardingField>>;
  setListingDraft: Dispatch<SetStateAction<ListingOnboardingDraft>>;
}

export function OnboardingListingEditStep({
  activeListingField,
  focusListingField,
  handleAhsSelect,
  handleDeferredListingImageCleared,
  handleDeferredListingImageReady,
  isListingCultivarPlaceholder,
  isListingDescriptionInRecommendedRange,
  isListingDescriptionPlaceholder,
  isListingDescriptionTooLong,
  isListingDescriptionTooShort,
  isListingPricePlaceholder,
  isListingTitlePlaceholder,
  isLoadingOnboardingCultivarOptions,
  listingContinueChecklist,
  listingCultivarRef,
  listingDescriptionCharacterCount,
  listingDescriptionInputRef,
  listingDescriptionPreview,
  listingDraft,
  listingImageEditorRef,
  listingImagePreviewUrl,
  listingMissingField,
  listingTitleInputRef,
  listingTitlePreview,
  onboardingCultivarOptions,
  pendingListingUploadPreviewUrl,
  savedListingId,
  selectedCultivarDetails,
  selectedCultivarName,
  setActiveListingField,
  setListingDraft,
}: OnboardingListingEditStepProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">
          Edit your first listing
        </h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          This is how buyers will see one of your listing cards. Edit these
          fields and watch the preview update live.
        </p>
      </div>

      <OnboardingStepGrid className="lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
        <div className="order-2 space-y-4 lg:order-1">
          <div
            ref={listingCultivarRef}
            tabIndex={-1}
            className={cn(
              "space-y-3 rounded-lg border p-4 transition-colors outline-none",
              activeListingField === "cultivar" && "border-primary bg-primary/5",
            )}
            onFocusCapture={() => setActiveListingField("cultivar")}
            onClick={() => setActiveListingField("cultivar")}
          >
            <Label>Link a daylily variety (guided starter)</Label>
            <OnboardingAhsListingSelect
              onSelect={handleAhsSelect}
              selectedLabel={selectedCultivarName}
              predefinedOptions={onboardingCultivarOptions}
              isPredefinedOptionsLoading={isLoadingOnboardingCultivarOptions}
              limitedSearchMessage={
                ONBOARDING_LISTING_DEFAULTS.limitedSearchMessage
              }
            />
            <p className="text-muted-foreground text-xs leading-relaxed">
              We start you with a linked starter variety by default so your
              preview looks realistic. You can click to change it now, and
              create unlinked listings later from your dashboard.
            </p>
            {selectedCultivarName ? (
              <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3">
                <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide text-emerald-800 uppercase">
                  <CheckCircle2 className="h-4 w-4" />
                  Selected cultivar
                </p>
                <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
                  You&apos;re viewing the Daylily Database reference card for
                  this variety. The database includes details and images for
                  100,000+ listings.
                </p>
                {selectedCultivarDetails ? (
                  <div className="bg-background mt-3 rounded-lg border p-3">
                    <AhsListingDisplay
                      ahsListing={selectedCultivarDetails}
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
              activeListingField === "title" && "border-primary bg-primary/5",
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
              Buyers scan titles first. Keep it clear and specific to what you
              are offering.
            </p>
          </div>

          <div
            className={cn(
              "space-y-2 rounded-lg border p-4 transition-colors",
              activeListingField === "price" && "border-primary bg-primary/5",
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
              Add a price now to preview add-to-cart behavior.
              <br />
              Required in onboarding so you can preview the add to cart flow.
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
                  isListingDescriptionTooShort || isListingDescriptionTooLong
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
                  isListingDescriptionTooShort || isListingDescriptionTooLong
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
              activeListingField === "image" && "border-primary bg-primary/5",
            )}
            onFocusCapture={() => setActiveListingField("image")}
            onClick={() => setActiveListingField("image")}
          >
            <Label>Listing image (optional)</Label>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Upload your own photo if you want. If you skip this, we will use
              the linked cultivar image when available.
            </p>
            {savedListingId ? (
              <div className="bg-background rounded-lg border p-3">
                <OnboardingDeferredImageUpload
                  stagedPreviewUrl={pendingListingUploadPreviewUrl}
                  onDeferredUploadReady={handleDeferredListingImageReady}
                  onDeferredUploadCleared={handleDeferredListingImageCleared}
                />
              </div>
            ) : (
              <div className="bg-background space-y-3 rounded-lg border p-3">
                <div className="space-y-2">
                  <div className="bg-muted h-4 w-40 animate-pulse rounded" />
                  <div className="bg-muted h-28 w-full animate-pulse rounded-md" />
                </div>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Setting up uploader. You can continue without uploading - the
                  linked cultivar image will be used.
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
                  variant={listingDraft.price !== null ? "secondary" : "outline"}
                  className={cn(
                    "bg-background/90 backdrop-blur-sm",
                    isListingPricePlaceholder && "text-yellow-700",
                  )}
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
                <p
                  className={cn(
                    "text-xl font-semibold tracking-tight",
                    isListingTitlePlaceholder && "text-yellow-700",
                  )}
                >
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
                  <div
                    className={cn(
                      "bg-secondary inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs",
                      isListingCultivarPlaceholder
                        ? "text-yellow-700"
                        : "text-muted-foreground",
                    )}
                  >
                    <Link2 className="h-3.5 w-3.5" />
                    Link a cultivar reference
                  </div>
                )}
              </div>

              {selectedCultivarDetails ? (
                <Badge variant="secondary" className="ml-10 w-fit text-xs">
                  {[selectedCultivarDetails.hybridizer, selectedCultivarDetails.year]
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
                <p
                  className={cn(
                    "text-sm leading-relaxed",
                    isListingDescriptionPlaceholder
                      ? "text-yellow-700"
                      : "text-muted-foreground",
                  )}
                >
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
          <PreviewPlaceholderNote />

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
  );
}
