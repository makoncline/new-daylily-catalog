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
import { ContentManagerFormItem } from "./content-form";

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

export function ProfileForm({ initialProfile, formRef }: ProfileFormProps) {
  const [profile, setProfile] = useState(initialProfile);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  const [hasExternalUnsavedChanges, setHasExternalUnsavedChanges] =
    useState(false);
  const [showSlugEditWarningDialog, setShowSlugEditWarningDialog] =
    useState(false);
  const [isSlugEditingUnlocked, setIsSlugEditingUnlocked] = useState(false);
  const slugInputRef = useRef<HTMLInputElement | null>(null);
  const { isPro } = usePro();
  const utils = api.useUtils();

  const cleanBaseUrl = getBaseUrl().replace(/^https?:\/\//, "");

  const form = useZodForm({
    schema: profileFormSchema,
    defaultValues: toFormValues(profile),
  });

  const updateProfileMutation = api.dashboardDb.userProfile.update.useMutation({
    onError: (error, errorInfo) => {
      toast.error("Failed to save changes", {
        description: getErrorMessage(error),
      });
      reportError({
        error: normalizeError(error),
        context: { source: "ProfileForm", errorInfo },
      });
    },
  });

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

  const markExternalUnsavedChanges = useCallback(() => {
    setHasExternalUnsavedChanges(true);
  }, []);

  const hasPendingChanges = useCallback(() => {
    return form.formState.isDirty || hasExternalUnsavedChanges;
  }, [form.formState.isDirty, hasExternalUnsavedChanges]);

  const saveChangesInternal = useCallback(
    async (): Promise<boolean> => {
      if (!hasPendingChanges()) {
        return true;
      }

      const isValid = await form.trigger();
      if (!isValid) {
        return false;
      }

      const values = form.getValues();

      setIsUpdating(true);
      try {
        const updatedProfile = await updateProfileMutation.mutateAsync({
          data: values,
        });
        utils.dashboardDb.userProfile.get.setData(undefined, updatedProfile);
        setProfile(updatedProfile);
        form.reset(toFormValues(updatedProfile), { keepIsValid: true });
        setHasExternalUnsavedChanges(false);
        toast.success("Changes saved");

        return true;
      } catch {
        return false;
      } finally {
        setIsUpdating(false);
      }
    },
    [
      form,
      hasPendingChanges,
      updateProfileMutation,
      utils,
    ],
  );

  const saveChanges = useCallback(
    async (_reason: ProfileFormSaveReason): Promise<boolean> => {
      return saveChangesInternal();
    },
    [saveChangesInternal],
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
                        onKeyDown={(e) => {
                          if (
                            e.key === "Backspace" ||
                            e.key === "Delete" ||
                            e.key === "ArrowLeft" ||
                            e.key === "ArrowRight" ||
                            e.key === "Tab" ||
                            e.ctrlKey ||
                            e.metaKey
                          ) {
                            return;
                          }

                          const newValue = e.currentTarget.value + e.key;
                          if (!SLUG_INPUT_PATTERN.test(newValue)) {
                            e.preventDefault();
                          }
                        }}
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(value);
                          debouncedCheckSlug(value);
                        }}
                        onBlur={field.onBlur}
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
              onMutationSuccess={markExternalUnsavedChanges}
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

          <ContentManagerFormItem initialProfile={profile} />
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
