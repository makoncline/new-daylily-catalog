"use client";

import { SignInButton } from "@clerk/nextjs";
import Image from "next/image";
import { useCallback, useState } from "react";
import { type FileRejection, useDropzone } from "react-dropzone";
import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Mail,
  Pencil,
} from "lucide-react";
import { ImageCropper } from "@/components/image-cropper";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SUBSCRIPTION_CONFIG } from "@/config/subscription-config";
import { cn } from "@/lib/utils";
import {
  ListingPreviewCard,
  ProfilePreviewCard,
} from "./anonymous-onboarding-preview-cards";
import {
  DEFAULT_GARDEN_NAME_PLACEHOLDER,
  DEFAULT_LOCATION_PLACEHOLDER,
  DEFAULT_PROFILE_DESCRIPTION_PLACEHOLDER,
  STARTER_PROFILE_IMAGES,
} from "./anonymous-onboarding-config";
import type { ExampleCultivar } from "./anonymous-onboarding-config";
import type { AnonymousOnboardingController } from "./use-anonymous-onboarding-controller";
import type {
  AnonymousOnboardingListingPreviewDraft,
  AnonymousOnboardingProfileDraft,
} from "./anonymous-onboarding-draft";

type SetAnonymousOnboardingDraft = AnonymousOnboardingController["setDraft"];

function updateProfileDraft(
  setDraft: SetAnonymousOnboardingDraft,
  patch: Partial<AnonymousOnboardingProfileDraft>,
) {
  setDraft((currentDraft) => ({
    ...currentDraft,
    profile: {
      ...currentDraft.profile,
      ...patch,
    },
  }));
}

function updateListingPreviewDraft(
  setDraft: SetAnonymousOnboardingDraft,
  patch: Partial<AnonymousOnboardingListingPreviewDraft>,
) {
  setDraft((currentDraft) => ({
    ...currentDraft,
    listingPreview: {
      ...currentDraft.listingPreview,
      ...patch,
    },
  }));
}

function parseListingPriceInput(value: string) {
  const parsedValue = Number(value);
  return value.trim().length === 0 || !Number.isFinite(parsedValue)
    ? null
    : Math.max(0, parsedValue);
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Unable to read selected image."));
    };
    reader.onerror = () => reject(new Error("Unable to read selected image."));
    reader.readAsDataURL(file);
  });
}

type EmailStepProps = Pick<
  AnonymousOnboardingController,
  | "collectEmail"
  | "emailInput"
  | "emailIsValid"
  | "saveEmailAndContinue"
  | "setEmailInput"
>;

export function EmailStep({
  collectEmail,
  emailInput,
  emailIsValid,
  saveEmailAndContinue,
  setEmailInput,
}: EmailStepProps) {
  return (
    <form
      className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]"
      onSubmit={(event) => {
        event.preventDefault();
        void saveEmailAndContinue("initial");
      }}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">
            What email should we use for your account?
          </h2>
          <p className="text-muted-foreground max-w-xl text-sm leading-relaxed">
            We will use this email for checkout and send your login code to the
            same address.
          </p>
        </div>

        <div className="max-w-md space-y-2">
          <Label htmlFor="anonymous-onboarding-email">Email address</Label>
          <Input
            id="anonymous-onboarding-email"
            data-testid="anonymous-onboarding-email"
            type="email"
            required
            autoComplete="email"
            value={emailInput}
            onChange={(event) => setEmailInput(event.target.value)}
            placeholder="you@example.com"
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button
            type="submit"
            disabled={!emailIsValid || collectEmail.isPending}
            data-testid="anonymous-onboarding-email-submit"
          >
            Start setup
            <ArrowRight className="size-4" />
          </Button>

          <SignInButton mode="modal" forceRedirectUrl="/dashboard">
            <Button type="button" variant="outline">
              Already have an account? Log in
            </Button>
          </SignInButton>
        </div>
      </div>

      <div className="bg-card h-fit space-y-3 rounded-lg border p-5">
        <Mail className="text-primary size-6" />
        <p className="font-medium">Why ask first?</p>
        <p className="text-muted-foreground text-sm leading-relaxed">
          This saves your progress in this browser and keeps the same email
          through checkout and sign-in.
        </p>
      </div>
    </form>
  );
}

type ProfileStepProps = Pick<
  AnonymousOnboardingController,
  | "applyStarterNameOverlay"
  | "clearProfileImage"
  | "draft"
  | "imageError"
  | "isGeneratingStarterProfileImage"
  | "profileImageInputMode"
  | "profilePreview"
  | "selectStarterProfileImage"
  | "selectedStarterProfileImageUrl"
  | "setApplyStarterNameOverlay"
  | "setDraft"
  | "setImageError"
  | "setProfileImageInputMode"
  | "updateProfileGardenName"
  | "updateProfileImage"
>;

function ProfileImageInlinePreview({
  imageUrl,
  title,
}: {
  imageUrl: string | null;
  title: string;
}) {
  const trimmedImageUrl = imageUrl?.trim() ?? "";
  const previewImageSrc =
    trimmedImageUrl.length > 0 ? trimmedImageUrl : null;

  return (
    <div
      className="bg-muted relative aspect-square w-full overflow-hidden rounded-lg border"
      data-testid="anonymous-profile-image-inline-preview"
      aria-label={
        previewImageSrc ? "Selected profile image preview" : "No profile image"
      }
    >
      {previewImageSrc ? (
        <Image
          src={previewImageSrc}
          alt={title}
          fill
          sizes="(max-width: 640px) 100vw, 192px"
          className="object-cover"
          unoptimized
        />
      ) : null}
    </div>
  );
}

function ProfileImageUploadCropper({
  setImageError,
  updateProfileImage,
}: {
  setImageError: AnonymousOnboardingController["setImageError"];
  updateProfileImage: AnonymousOnboardingController["updateProfileImage"];
}) {
  const [cropImageUrl, setCropImageUrl] = useState<string | null>(null);

  const resetCropper = useCallback(() => {
    setCropImageUrl(null);
  }, []);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) {
        return;
      }

      setImageError(null);
      void readFileAsDataUrl(file)
        .then(setCropImageUrl)
        .catch((error: unknown) => {
          setImageError(error instanceof Error ? error.message : String(error));
        });
    },
    [setImageError],
  );

  const onDropRejected = useCallback(
    (rejections: FileRejection[]) => {
      const message =
        rejections[0]?.errors[0]?.message ?? "Choose an image file.";
      setImageError(message);
    },
    [setImageError],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "image/*": [],
    },
    multiple: false,
    onDrop,
    onDropRejected,
  });

  if (cropImageUrl) {
    return (
      <ImageCropper
        src={cropImageUrl}
        confirmButtonLabel="Use cropped image"
        onCancel={resetCropper}
        onCropComplete={(blob) => {
          void updateProfileImage(blob).then(resetCropper);
        }}
      />
    );
  }

  return (
    <div
      {...getRootProps()}
      className={cn(
        "cursor-pointer rounded-lg border-2 border-dashed p-5 text-center text-sm transition",
        isDragActive ? "border-primary" : "border-muted",
      )}
      data-testid="anonymous-profile-image-dropzone"
    >
      <input
        {...getInputProps({
          id: "anonymous-profile-image",
          "data-testid": "anonymous-profile-image",
          "aria-label": "Upload profile image",
        })}
      />
      <p className="font-medium">
        {isDragActive
          ? "Drop the image here"
          : "Drag and drop an image here, or click to select one"}
      </p>
    </div>
  );
}

export function ProfileStep({
  applyStarterNameOverlay,
  clearProfileImage,
  draft,
  imageError,
  isGeneratingStarterProfileImage,
  profileImageInputMode,
  profilePreview,
  selectStarterProfileImage,
  selectedStarterProfileImageUrl,
  setApplyStarterNameOverlay,
  setDraft,
  setImageError,
  setProfileImageInputMode,
  updateProfileGardenName,
  updateProfileImage,
}: ProfileStepProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,24rem)]">
      <div className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">
            Edit your profile
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            This is how customers will see your catalog card on the Catalogs
            page. Edit these fields and watch the preview update live.
          </p>
        </div>

        <div className="space-y-2 rounded-lg border p-4">
          <Label htmlFor="anonymous-profile-name">
            Seller name (shown to buyers)
          </Label>
          <Input
            id="anonymous-profile-name"
            data-testid="anonymous-profile-name"
            value={draft.profile.gardenName}
            placeholder={DEFAULT_GARDEN_NAME_PLACEHOLDER}
            onChange={(event) => updateProfileGardenName(event.target.value)}
          />
        </div>

        <div
          className="space-y-4 rounded-lg border p-4"
          data-testid="anonymous-profile-image-section"
        >
          <div className="space-y-1">
            <Label>Profile image</Label>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Your photo is what customers notice first when scanning catalogs.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-[12rem_minmax(0,1fr)]">
            <ProfileImageInlinePreview
              imageUrl={draft.profile.profileImageDataUrl}
              title={profilePreview.title}
            />

            <div className="space-y-4">
              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  variant={
                    profileImageInputMode === "starter" ? "default" : "outline"
                  }
                  onClick={() => setProfileImageInputMode("starter")}
                  data-testid="anonymous-profile-image-mode-starter"
                >
                  Use a starter image
                </Button>
                <Button
                  type="button"
                  variant={
                    profileImageInputMode === "upload" ? "default" : "outline"
                  }
                  onClick={() => setProfileImageInputMode("upload")}
                  data-testid="anonymous-profile-image-mode-upload"
                >
                  Upload your own image
                </Button>
              </div>

              {profileImageInputMode === "starter" ? (
                <div className="space-y-3">
                  <div className="flex items-start gap-3 rounded-lg border border-dashed p-3">
                    <Checkbox
                      id="anonymous-starter-overlay"
                      checked={applyStarterNameOverlay}
                      onCheckedChange={(value) =>
                        setApplyStarterNameOverlay(value === true)
                      }
                    />
                    <div className="space-y-1 text-sm">
                      <Label
                        htmlFor="anonymous-starter-overlay"
                        className="cursor-pointer"
                      >
                        Stamp seller name onto starter image
                      </Label>
                      <p className="text-muted-foreground text-xs leading-relaxed">
                        Good for a quick starter logo. You can replace it with
                        an uploaded image at any time.
                      </p>
                    </div>
                  </div>

                  <div
                    data-testid="onboarding-starter-image-picker"
                    className="overflow-x-auto pb-2"
                  >
                    <div className="grid w-full auto-cols-[calc((100%-1rem)/2.5)] grid-flow-col gap-2 sm:auto-cols-[calc((100%-1.5rem)/3.5)] lg:auto-cols-[calc((100%-2rem)/4.5)]">
                      {STARTER_PROFILE_IMAGES.map((image) => {
                        const selected =
                          selectedStarterProfileImageUrl === image.url;

                        return (
                          <button
                            key={image.id}
                            type="button"
                            className="w-full disabled:opacity-60"
                            onClick={() =>
                              selectStarterProfileImage(image.url)
                            }
                            disabled={isGeneratingStarterProfileImage}
                            aria-pressed={selected}
                            aria-label={image.label}
                            data-testid={`onboarding-starter-image-${image.id}`}
                          >
                            <div
                              className={cn(
                                "relative aspect-square overflow-hidden rounded-md ring-1 transition",
                                selected
                                  ? "ring-primary ring-4 ring-offset-2 ring-offset-background"
                                  : "ring-border/40",
                              )}
                            >
                              <Image
                                src={image.url}
                                alt={image.label}
                                fill
                                className="object-cover"
                                sizes="(max-width: 640px) 40vw, 160px"
                              />
                              {selected ? (
                                <span className="bg-primary text-primary-foreground absolute top-1.5 right-1.5 grid size-7 place-items-center rounded-full shadow-sm">
                                  <CheckCircle2 className="size-4.5" />
                                </span>
                              ) : null}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {isGeneratingStarterProfileImage ? (
                    <p className="text-muted-foreground text-xs">
                      Generating starter image with your garden name...
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-3">
                  <ProfileImageUploadCropper
                    setImageError={setImageError}
                    updateProfileImage={updateProfileImage}
                  />
                  {draft.profile.profileImageSource === "upload" &&
                  draft.profile.profileImageDataUrl ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={clearProfileImage}
                    >
                      Remove image
                    </Button>
                  ) : null}
                </div>
              )}

              {imageError ? (
                <p className="text-destructive text-sm">{imageError}</p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="space-y-2 rounded-lg border p-4">
          <Label htmlFor="anonymous-profile-location">
            Location (recommended)
          </Label>
          <Input
            id="anonymous-profile-location"
            data-testid="anonymous-profile-location"
            value={draft.profile.location}
            placeholder={DEFAULT_LOCATION_PLACEHOLDER}
            onChange={(event) =>
              updateProfileDraft(setDraft, {
                location: event.target.value,
              })
            }
          />
        </div>

        <div className="space-y-2 rounded-lg border p-4">
          <Label htmlFor="anonymous-profile-description">
            Seller description
          </Label>
          <Textarea
            id="anonymous-profile-description"
            data-testid="anonymous-profile-description"
            rows={5}
            value={draft.profile.description}
            placeholder={DEFAULT_PROFILE_DESCRIPTION_PLACEHOLDER}
            onChange={(event) =>
              updateProfileDraft(setDraft, {
                description: event.target.value,
              })
            }
          />
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-semibold">Catalog card preview</p>
        <ProfilePreviewCard
          title={profilePreview.title}
          description={profilePreview.description}
          imageUrl={profilePreview.imageUrl}
          location={profilePreview.location}
          ownershipBadge="Preview"
        />
      </div>
    </div>
  );
}

type ListingStepProps = Pick<
  AnonymousOnboardingController,
  | "draft"
  | "exampleCultivars"
  | "imageError"
  | "listingPreview"
  | "setDraft"
  | "setImageError"
  | "updateListingImage"
>;

export function ListingStep({
  draft,
  exampleCultivars,
  imageError,
  listingPreview,
  setDraft,
  setImageError,
  updateListingImage,
}: ListingStepProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,24rem)]">
      <div className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">
            Edit your first listing
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            This is how buyers will see one of your listing cards. Edit these
            fields and watch the preview update live. This is just an example.
            It will not be added to your catalog.
          </p>
        </div>

        <div className="space-y-2 rounded-lg border p-4">
          <Label>Example cultivar</Label>
          <div className="grid gap-2 sm:grid-cols-3">
            {exampleCultivars.map((cultivar: ExampleCultivar) => {
              const selected =
                cultivar.key === draft.listingPreview.cultivarKey;
              return (
                <Button
                  key={cultivar.key}
                  type="button"
                  variant={selected ? "default" : "outline"}
                  className="justify-start whitespace-normal"
                  onClick={() =>
                    setDraft((currentDraft) => ({
                      ...currentDraft,
                      listingPreview: {
                        ...currentDraft.listingPreview,
                        cultivarKey: cultivar.key,
                        title:
                          currentDraft.listingPreview.title.trim().length > 0
                            ? currentDraft.listingPreview.title
                            : `${cultivar.name} Spring Fan`,
                      },
                    }))
                  }
                >
                  {cultivar.name}
                </Button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2 rounded-lg border p-4">
          <Label htmlFor="anonymous-listing-title">Listing title</Label>
          <Input
            id="anonymous-listing-title"
            data-testid="anonymous-listing-title"
            value={draft.listingPreview.title}
            onChange={(event) =>
              updateListingPreviewDraft(setDraft, {
                title: event.target.value,
              })
            }
          />
        </div>

        <div className="space-y-2 rounded-lg border p-4">
          <Label htmlFor="anonymous-listing-price">Price</Label>
          <Input
            id="anonymous-listing-price"
            data-testid="anonymous-listing-price"
            inputMode="decimal"
            value={draft.listingPreview.price ?? ""}
            onChange={(event) =>
              updateListingPreviewDraft(setDraft, {
                price: parseListingPriceInput(event.target.value),
              })
            }
          />
        </div>

        <div className="space-y-2 rounded-lg border p-4">
          <Label htmlFor="anonymous-listing-description">Description</Label>
          <Textarea
            id="anonymous-listing-description"
            data-testid="anonymous-listing-description"
            rows={4}
            value={draft.listingPreview.description}
            onChange={(event) =>
              updateListingPreviewDraft(setDraft, {
                description: event.target.value,
              })
            }
          />
        </div>

        <div className="space-y-2 rounded-lg border p-4">
          <Label htmlFor="anonymous-listing-image">
            Listing image (optional)
          </Label>
          <Input
            id="anonymous-listing-image"
            data-testid="anonymous-listing-image"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => {
              void updateListingImage(event.target.files?.[0]);
              event.currentTarget.value = "";
            }}
          />
          {draft.listingPreview.imageDataUrl ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setImageError(null);
                updateListingPreviewDraft(setDraft, {
                  imageDataUrl: null,
                });
              }}
            >
              Remove image
            </Button>
          ) : null}
          {imageError ? (
            <p className="text-destructive text-sm">{imageError}</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-semibold">Listing card preview</p>
        <ListingPreviewCard
          title={listingPreview.title}
          description={listingPreview.description}
          price={draft.listingPreview.price}
          linkedLabel={listingPreview.selectedCultivar.name}
          hybridizerYear={listingPreview.selectedCultivar.hybridizerYear}
          imageUrl={listingPreview.imageUrl}
          ownershipBadge="Example only"
        />
      </div>
    </div>
  );
}

type PreviewStepProps = Pick<
  AnonymousOnboardingController,
  "draft" | "goToStep" | "listingPreview" | "profilePreview"
>;

export function PreviewStep({
  draft,
  goToStep,
  listingPreview,
  profilePreview,
}: PreviewStepProps) {
  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-[repeat(2,minmax(0,24rem))]">
        <div className="space-y-3">
          <p className="text-sm font-semibold">Catalog card preview</p>
          <ProfilePreviewCard
            title={profilePreview.title}
            description={profilePreview.description}
            imageUrl={profilePreview.imageUrl}
            location={profilePreview.location}
            ownershipBadge="Preview"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => goToStep("profile")}
          >
            Go back and edit catalog card
          </Button>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold">Listing card preview</p>
          <ListingPreviewCard
            title={listingPreview.title}
            description={listingPreview.description}
            price={draft.listingPreview.price}
            linkedLabel={listingPreview.selectedCultivar.name}
            hybridizerYear={listingPreview.selectedCultivar.hybridizerYear}
            imageUrl={listingPreview.imageUrl}
            ownershipBadge="Example only"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => goToStep("listing")}
          >
            Go back and edit listing card
          </Button>
        </div>
      </div>

      <div className="bg-card max-w-2xl space-y-3 rounded-lg border p-5">
        <p className="font-semibold">How buyers contact you</p>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Buyers can contact you directly from your catalog, or add priced
          listings to cart and send one message with selected items.
        </p>
        <div className="text-muted-foreground space-y-2 text-sm">
          <p className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 size-4 text-emerald-600" />
            <span>
              Path 1: Buyer opens your catalog and sends an email immediately.
            </span>
          </p>
          <p className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 size-4 text-emerald-600" />
            <span>
              Path 2: Buyer adds priced listings to cart, then sends one message
              with item details.
            </span>
          </p>
        </div>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Buyers do not pay on Daylily Catalog. You arrange payment and shipping
          directly after inquiry.
        </p>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Your catalog and listings will not be publicly discoverable until you
          have an active trial or membership.
        </p>
      </div>
    </div>
  );
}

type CheckoutStepProps = Pick<
  AnonymousOnboardingController,
  | "createCheckout"
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
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">
            Confirm your account email
          </h2>
          <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">
            We will use this email for checkout, then send your login code to
            the same address.
          </p>
        </div>

        <div className="bg-card max-w-xl space-y-4 rounded-lg border p-5">
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
                data-testid="anonymous-checkout-email"
                type="email"
                required
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
                  className="text-lg font-semibold break-all"
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
            createCheckout.isPending || isEditingCheckoutEmail || !draft.email
          }
          onClick={() => void startCheckout()}
          data-testid="anonymous-onboarding-checkout"
        >
          <CreditCard className="size-4" />
          Continue to checkout
        </Button>

        {createCheckout.error ? (
          <p className="text-destructive text-sm">
            {createCheckout.error.message}
          </p>
        ) : null}
      </div>

      <div className="bg-card h-fit space-y-4 rounded-lg border p-6">
        <p className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
          Grower membership
        </p>
        <div>
          <p className="flex items-end gap-1 leading-none">
            <span className="text-5xl font-bold tracking-tight">
              {membershipPriceDisplay.amount}
            </span>
            <span className="text-2xl font-semibold tracking-tight">
              {membershipPriceDisplay.interval}
            </span>
          </p>
          {membershipPriceDisplay.monthlyEquivalent ? (
            <p className="text-muted-foreground mt-2 text-sm">
              {membershipPriceDisplay.monthlyEquivalent}/mo equivalent
            </p>
          ) : null}
        </div>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Start with a {SUBSCRIPTION_CONFIG.FREE_TRIAL_DAYS}-day free trial. We
          will add your profile to your dashboard after you verify your email.
        </p>
      </div>
    </div>
  );
}
