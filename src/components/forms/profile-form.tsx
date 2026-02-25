"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useDebouncedCallback } from "use-debounce";
import { type RouterOutputs } from "@/trpc/react";
import { api } from "@/trpc/react";
import { getBaseUrl } from "@/lib/utils/getBaseUrl";
import {
  profileFormSchema,
  type ProfileFormData,
} from "@/types/schemas/profile";
import { useZodForm } from "@/hooks/use-zod-form";
import { usePro } from "@/hooks/use-pro";
import { SLUG_INPUT_PATTERN } from "@/lib/utils/slugify";
import { getErrorMessage, normalizeError, reportError } from "@/lib/error-utils";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Muted } from "@/components/typography";
import { CheckoutButton } from "@/components/checkout-button";
import { SlugChangeConfirmDialog } from "@/components/slug-change-confirm-dialog";
import { ProfileImageManager } from "@/app/dashboard/profile/_components/profile-image-manager";
import {
  ContentManagerFormItem,
  type ContentManagerFormHandle,
} from "./content-form";

type UserProfile = RouterOutputs["dashboardDb"]["userProfile"]["get"];

export type ProfileFormSaveReason = "manual" | "navigate";

export interface ProfileFormHandle {
  saveChanges: (reason: ProfileFormSaveReason) => Promise<boolean>;
  hasPendingChanges: () => boolean;
}

interface ProfileFormProps {
  initialProfile: UserProfile;
  formRef?: React.RefObject<ProfileFormHandle | null>;
}

function toFormValues(profile: UserProfile): ProfileFormData {
  return {
    title: profile.title ?? undefined,
    slug: profile.slug ?? undefined,
    description: profile.description ?? undefined,
    location: profile.location ?? undefined,
    logoUrl: profile.logoUrl ?? undefined,
  };
}

function areProfileValuesEqual(
  a: ProfileFormData,
  b: ProfileFormData,
): boolean {
  return (
    a.title === b.title &&
    a.slug === b.slug &&
    a.description === b.description &&
    a.location === b.location &&
    a.logoUrl === b.logoUrl
  );
}

export function ProfileForm({ initialProfile, formRef }: ProfileFormProps) {
  const [profile, setProfile] = useState(initialProfile);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  const [needsParentCommit, setNeedsParentCommit] = useState(false);
  const [showSlugEditWarningDialog, setShowSlugEditWarningDialog] =
    useState(false);
  const [isSlugEditingUnlocked, setIsSlugEditingUnlocked] = useState(false);
  const slugInputRef = useRef<HTMLInputElement | null>(null);
  const contentFormRef = useRef<ContentManagerFormHandle | null>(null);
  const inFlightSaveRef = useRef<Promise<boolean> | null>(null);
  const needsParentCommitRef = useRef(needsParentCommit);
  const { isPro } = usePro();
  const utils = api.useUtils();
  needsParentCommitRef.current = needsParentCommit;

  const cleanBaseUrl = getBaseUrl().replace(/^https?:\/\//, "");

  const form = useZodForm({
    schema: profileFormSchema,
    defaultValues: toFormValues(profile),
  });

  const updateProfileMutation = api.dashboardDb.userProfile.update.useMutation();

  const checkSlug = api.dashboardDb.userProfile.checkSlug.useQuery(
    { slug: form.watch("slug") ?? undefined },
    {
      enabled: false,
      retry: false,
    },
  );

  const debouncedCheckSlug = useDebouncedCallback(
    (value: string | null | undefined) => {
      if (value && value !== profile.userId) {
        setIsCheckingSlug(true);
        void checkSlug.refetch().then((result) => {
          setIsCheckingSlug(false);
          if (result.data?.available) {
            form.clearErrors("slug");
            return;
          }
          if (result.data && !result.data.available) {
            form.setError("slug", {
              type: "manual",
              message: "This URL is already taken. Please choose another one.",
            });
          }
        });
      }
    },
    500,
  );

  const markNeedsParentCommit = useCallback(() => {
    if (needsParentCommitRef.current) {
      return;
    }

    needsParentCommitRef.current = true;
    setNeedsParentCommit(true);
  }, []);

  const hasPendingChanges = useCallback(() => {
    const values = form.getValues();
    const committedValues = toFormValues(profile);
    const hasContentPending = contentFormRef.current?.hasPendingChanges() ?? false;

    return (
      !areProfileValuesEqual(values, committedValues) ||
      hasContentPending ||
      needsParentCommitRef.current
    );
  }, [form, profile]);

  const saveChangesInternal = useCallback(
    async (reason: ProfileFormSaveReason): Promise<boolean> => {
      const shouldUpdateUi = reason !== "navigate";
      if (shouldUpdateUi) {
        setIsUpdating(true);
      }

      try {
        const hadContentPending = contentFormRef.current?.hasPendingChanges() ?? false;
        if (hadContentPending) {
          const didSaveContent = await contentFormRef.current?.saveChanges(reason);
          if (didSaveContent === false) {
            if (shouldUpdateUi) {
              toast.error("Failed to save changes", {
                description: "Failed to save profile content.",
              });
            }
            return false;
          }
          markNeedsParentCommit();
        }

        const values = form.getValues();
        const committedValues = toFormValues(profile);
        const hasFieldPending = !areProfileValuesEqual(values, committedValues);
        const shouldCommitParent =
          hasFieldPending || needsParentCommitRef.current;

        if (!shouldCommitParent) {
          return true;
        }

        if (hasFieldPending) {
          if (reason !== "navigate") {
            const isValid = await form.trigger();
            if (!isValid) {
              return false;
            }
          } else {
            const parsed = profileFormSchema.safeParse(values);
            if (!parsed.success) {
              return false;
            }
          }

        }

        const updatedProfile = await updateProfileMutation.mutateAsync({
          data: values,
        });
        setProfile(updatedProfile);
        form.reset(toFormValues(updatedProfile), { keepIsValid: true });
        needsParentCommitRef.current = false;
        setNeedsParentCommit(false);
        utils.dashboardDb.userProfile.get.setData(undefined, updatedProfile);
        void utils.dashboardDb.userProfile.get.invalidate();
        toast.success("Changes saved");

        return true;
      } catch (error) {
        if (shouldUpdateUi) {
          toast.error("Failed to save changes", {
            description: getErrorMessage(error),
          });
        }
        reportError({
          error: normalizeError(error),
          context: { source: "ProfileForm", reason },
        });
        return false;
      } finally {
        if (shouldUpdateUi) {
          setIsUpdating(false);
        }
      }
    },
    [form, markNeedsParentCommit, profile, updateProfileMutation, utils],
  );

  const saveChanges = useCallback(
    async (reason: ProfileFormSaveReason): Promise<boolean> => {
      if (inFlightSaveRef.current) {
        return inFlightSaveRef.current;
      }

      if (!hasPendingChanges()) {
        return true;
      }

      const savePromise = saveChangesInternal(reason);
      inFlightSaveRef.current = savePromise;
      try {
        return await savePromise;
      } finally {
        if (inFlightSaveRef.current === savePromise) {
          inFlightSaveRef.current = null;
        }
      }
    },
    [hasPendingChanges, saveChangesInternal],
  );

  useEffect(() => {
    if (!formRef) {
      return;
    }

    formRef.current = { saveChanges, hasPendingChanges };
  }, [formRef, hasPendingChanges, saveChanges]);

  async function onSubmit() {
    await saveChanges("manual");
  }

  function handleSlugPointerDown(e: React.PointerEvent<HTMLInputElement>) {
    if (!isPro || isUpdating || isSlugEditingUnlocked) {
      return;
    }

    e.preventDefault();
    setShowSlugEditWarningDialog(true);
  }

  function handleSlugFocus(e: React.FocusEvent<HTMLInputElement>) {
    if (
      !isPro ||
      isUpdating ||
      isSlugEditingUnlocked ||
      showSlugEditWarningDialog
    ) {
      return;
    }

    e.currentTarget.blur();
    setShowSlugEditWarningDialog(true);
  }

  function handleConfirmSlugEditWarning() {
    setShowSlugEditWarningDialog(false);
    setIsSlugEditingUnlocked(true);
    requestAnimationFrame(() => {
      slugInputRef.current?.focus();
    });
  }

  function handleCancelSlugEditWarning() {
    setShowSlugEditWarningDialog(false);
    setIsSlugEditingUnlocked(false);
  }

  return (
    <>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-6"
        >
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Garden Name</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value ?? ""}
                    disabled={isUpdating}
                  />
                </FormControl>
                <FormDescription>
                  The name of your garden or business.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="slug"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  Profile URL
                  {!isPro && (
                    <Sparkles className="text-muted-foreground h-4 w-4" />
                  )}
                </FormLabel>
                <FormControl>
                  <div className="flex flex-col gap-2">
                    <div className="relative">
                      <Input
                        name={field.name}
                        ref={(element) => {
                          field.ref(element);
                          slugInputRef.current = element;
                        }}
                        value={field.value ?? ""}
                        pattern={SLUG_INPUT_PATTERN.source}
                        onPointerDown={handleSlugPointerDown}
                        onFocus={handleSlugFocus}
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(value);
                          debouncedCheckSlug(value);
                        }}
                        onBlur={field.onBlur}
                        readOnly={!isSlugEditingUnlocked}
                        disabled={isUpdating || !isPro}
                        placeholder={profile.userId}
                      />
                      {isCheckingSlug && (
                        <div className="absolute top-2.5 right-3">
                          <div className="border-muted-foreground h-4 w-4 animate-spin rounded-full border-2 border-t-transparent" />
                        </div>
                      )}
                    </div>
                    <Muted className="text-sm">
                      Your profile will be available at: {cleanBaseUrl}/
                      {field.value ?? profile.userId}
                    </Muted>
                  </div>
                </FormControl>
                <FormDescription>
                  {!isPro ? (
                    <CheckoutButton
                      variant="link"
                      className="h-auto p-0 text-xs"
                    >
                      Upgrade to Pro to customize your profile URL
                    </CheckoutButton>
                  ) : (
                    <>
                      Choose a unique URL for your public profile (minimum 5
                      characters). Only letters, numbers, hyphens, and
                      underscores are allowed.
                      {!field.value &&
                        " If not set, your user ID will be used."}
                    </>
                  )}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormItem>
            <Label>Profile Images</Label>
            <p className="text-muted-foreground text-[0.8rem]">
              Upload images to showcase your garden. You can reorder them by
              dragging.
            </p>
            <ProfileImageManager
              profileId={profile.id}
              onMutationSuccess={markNeedsParentCommit}
            />
          </FormItem>

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    value={field.value ?? ""}
                    disabled={isUpdating}
                  />
                </FormControl>
                <FormDescription>
                  A brief description that appears at the top of your profile.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value ?? ""}
                    disabled={isUpdating}
                  />
                </FormControl>
                <FormDescription>
                  Optional. Your city, state, or general location.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end">
            <Button type="submit" disabled={isUpdating || !hasPendingChanges()}>
              Save Changes
            </Button>
          </div>

          <ContentManagerFormItem
            initialProfile={profile}
            formRef={contentFormRef}
            onMutationSuccess={markNeedsParentCommit}
          />
        </form>
      </Form>

      <SlugChangeConfirmDialog
        open={showSlugEditWarningDialog}
        onOpenChange={setShowSlugEditWarningDialog}
        onConfirm={handleConfirmSlugEditWarning}
        onCancel={handleCancelSlugEditWarning}
        currentSlug={profile.slug ?? profile.userId}
        baseUrl={cleanBaseUrl}
      />
    </>
  );
}
