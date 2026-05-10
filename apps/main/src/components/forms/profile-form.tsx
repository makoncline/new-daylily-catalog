"use client";

import { useCallback, useReducer, useRef } from "react";
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
import { useManagedFormSave } from "@/hooks/use-managed-form-save";
import { useParentCommitFlag } from "@/hooks/use-parent-commit-flag";
import { usePro } from "@/hooks/use-pro";
import { SLUG_INPUT_PATTERN } from "@/lib/utils/slugify";
import {
  getErrorMessage,
  normalizeError,
  reportError,
} from "@/lib/error-utils";
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

type ProfileFormSaveReason = "manual" | "navigate";

export interface ProfileFormHandle {
  saveChanges: (reason: ProfileFormSaveReason) => Promise<boolean>;
  hasPendingChanges: () => boolean;
}

interface ProfileFormProps {
  initialProfile: UserProfile;
  formRef?: React.RefObject<ProfileFormHandle | null>;
}

interface ProfileFormState {
  profile: UserProfile;
  isUpdating: boolean;
  isCheckingSlug: boolean;
  isContentDirty: boolean;
  showSlugEditWarningDialog: boolean;
  isSlugEditingUnlocked: boolean;
}

type ProfileFormAction =
  | { type: "profileSaved"; profile: UserProfile }
  | { type: "setIsUpdating"; value: boolean }
  | { type: "setIsCheckingSlug"; value: boolean }
  | { type: "setIsContentDirty"; value: boolean }
  | { type: "setShowSlugEditWarningDialog"; value: boolean }
  | { type: "setIsSlugEditingUnlocked"; value: boolean };

function profileFormReducer(
  state: ProfileFormState,
  action: ProfileFormAction,
): ProfileFormState {
  switch (action.type) {
    case "profileSaved":
      return { ...state, profile: action.profile };
    case "setIsUpdating":
      return { ...state, isUpdating: action.value };
    case "setIsCheckingSlug":
      return { ...state, isCheckingSlug: action.value };
    case "setIsContentDirty":
      return { ...state, isContentDirty: action.value };
    case "setShowSlugEditWarningDialog":
      return { ...state, showSlugEditWarningDialog: action.value };
    case "setIsSlugEditingUnlocked":
      return { ...state, isSlugEditingUnlocked: action.value };
  }
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

function useProfileFormController({
  initialProfile,
  formRef,
}: ProfileFormProps) {
  const [state, dispatch] = useReducer(profileFormReducer, {
    profile: initialProfile,
    isUpdating: false,
    isCheckingSlug: false,
    isContentDirty: false,
    showSlugEditWarningDialog: false,
    isSlugEditingUnlocked: false,
  });
  const {
    profile,
    isUpdating,
    isCheckingSlug,
    isContentDirty,
    showSlugEditWarningDialog,
    isSlugEditingUnlocked,
  } = state;
  const slugInputRef = useRef<HTMLInputElement | null>(null);
  const contentFormRef = useRef<ContentManagerFormHandle | null>(null);
  const { isPro } = usePro();
  const utils = api.useUtils();
  const {
    markNeedsParentCommit,
    needsParentCommitRef,
    resetNeedsParentCommit,
  } = useParentCommitFlag();

  const cleanBaseUrl = getBaseUrl().replace(/^https?:\/\//, "");

  const form = useZodForm({
    schema: profileFormSchema,
    defaultValues: toFormValues(profile),
  });

  const updateProfileMutation =
    api.dashboardDb.userProfile.update.useMutation();

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
        dispatch({ type: "setIsCheckingSlug", value: true });
        void checkSlug.refetch().then((result) => {
          dispatch({ type: "setIsCheckingSlug", value: false });
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

  const hasPendingChanges = useCallback(() => {
    const values = form.getValues();
    const committedValues = toFormValues(profile);

    return (
      !areProfileValuesEqual(values, committedValues) ||
      isContentDirty ||
      needsParentCommitRef.current
    );
  }, [form, isContentDirty, needsParentCommitRef, profile]);

  const saveChangesInternal = useCallback(
    async (reason: ProfileFormSaveReason): Promise<boolean> => {
      const shouldUpdateUi = reason !== "navigate";
      if (shouldUpdateUi) {
        dispatch({ type: "setIsUpdating", value: true });
      }

      try {
        const hadContentPending =
          contentFormRef.current?.hasPendingChanges() ?? false;
        if (hadContentPending) {
          const didSaveContent =
            await contentFormRef.current?.saveChanges(reason);
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
        dispatch({ type: "profileSaved", profile: updatedProfile });
        form.reset(toFormValues(updatedProfile), { keepIsValid: true });
        resetNeedsParentCommit();
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
          dispatch({ type: "setIsUpdating", value: false });
        }
      }
    },
    [
      form,
      markNeedsParentCommit,
      needsParentCommitRef,
      profile,
      resetNeedsParentCommit,
      updateProfileMutation,
      utils,
    ],
  );

  const { saveChanges } = useManagedFormSave<
    ProfileFormSaveReason,
    ProfileFormHandle
  >({
    formRef,
    hasPendingChanges,
    save: saveChangesInternal,
  });

  async function onSubmit() {
    await saveChanges("manual");
  }

  function handleSlugPointerDown(e: React.PointerEvent<HTMLInputElement>) {
    if (!isPro || isUpdating || isSlugEditingUnlocked) {
      return;
    }

    e.preventDefault();
    dispatch({ type: "setShowSlugEditWarningDialog", value: true });
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
    dispatch({ type: "setShowSlugEditWarningDialog", value: true });
  }

  function handleConfirmSlugEditWarning() {
    dispatch({ type: "setShowSlugEditWarningDialog", value: false });
    dispatch({ type: "setIsSlugEditingUnlocked", value: true });
    requestAnimationFrame(() => {
      slugInputRef.current?.focus();
    });
  }

  function handleCancelSlugEditWarning() {
    dispatch({ type: "setShowSlugEditWarningDialog", value: false });
    dispatch({ type: "setIsSlugEditingUnlocked", value: false });
  }

  return {
    cleanBaseUrl,
    contentFormRef,
    debouncedCheckSlug,
    dispatch,
    form,
    handlers: {
      handleCancelSlugEditWarning,
      handleConfirmSlugEditWarning,
      handleSlugFocus,
      handleSlugPointerDown,
      markNeedsParentCommit,
      onSubmit,
    },
    state: {
      hasPendingChanges,
      isCheckingSlug,
      isPro,
      isSlugEditingUnlocked,
      isUpdating,
      profile,
      showSlugEditWarningDialog,
    },
    slugInputRef,
  };
}

export function ProfileForm(props: ProfileFormProps) {
  const controller = useProfileFormController(props);

  return <ProfileFormView controller={controller} />;
}

function ProfileFormView({
  controller,
}: {
  controller: ReturnType<typeof useProfileFormController>;
}) {
  const {
    cleanBaseUrl,
    contentFormRef,
    debouncedCheckSlug,
    dispatch,
    form,
    handlers,
    state,
    slugInputRef,
  } = controller;
  const {
    handleCancelSlugEditWarning,
    handleConfirmSlugEditWarning,
    handleSlugFocus,
    handleSlugPointerDown,
    markNeedsParentCommit,
    onSubmit,
  } = handlers;
  const {
    hasPendingChanges,
    isCheckingSlug,
    isPro,
    isSlugEditingUnlocked,
    isUpdating,
    profile,
    showSlugEditWarningDialog,
  } = state;

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                    <Sparkles className="text-muted-foreground size-4" />
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
                          <div className="border-muted-foreground size-4 animate-spin rounded-full border-2 border-t-transparent" />
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
            onDirtyChange={(value) =>
              dispatch({ type: "setIsContentDirty", value })
            }
          />
        </form>
      </Form>

      <SlugChangeConfirmDialog
        open={showSlugEditWarningDialog}
        onOpenChange={(value) =>
          dispatch({ type: "setShowSlugEditWarningDialog", value })
        }
        onConfirm={handleConfirmSlugEditWarning}
        onCancel={handleCancelSlugEditWarning}
        currentSlug={profile.slug ?? profile.userId}
        baseUrl={cleanBaseUrl}
      />
    </>
  );
}
