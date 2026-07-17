"use client";

import {
  createContext,
  type FocusEvent,
  type PointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
  use,
} from "react";
import type { Control } from "react-hook-form";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useDebouncedCallback } from "use-debounce";
import { type RouterOutputs } from "@/trpc/react";
import { api } from "@/trpc/react";
import { getBaseUrl } from "@/lib/utils/getBaseUrl";
import { profileFormSchema, slugSchema } from "@/types/schemas/profile";
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
type ProfileFormController = ReturnType<typeof useProfileFormController>;

interface ProfileFormValues {
  title: string | null | undefined;
  slug: string | null | undefined;
  description: string | null | undefined;
  location: string | null | undefined;
  logoUrl: string | null | undefined;
}

export interface ProfileFormHandle {
  saveChanges: (reason: ProfileFormSaveReason) => Promise<boolean>;
  hasPendingChanges: () => boolean;
}

interface ProfileFormRootProps {
  children: ReactNode;
  initialProfile: UserProfile;
  formRef?: React.RefObject<ProfileFormHandle | null>;
}

interface ProfileFormProps {
  initialProfile: UserProfile;
  formRef?: React.RefObject<ProfileFormHandle | null>;
}

function toFormValues(profile: UserProfile): ProfileFormValues {
  return {
    title: profile.title ?? undefined,
    slug: profile.slug ?? undefined,
    description: profile.description ?? undefined,
    location: profile.location ?? undefined,
    logoUrl: profile.logoUrl ?? undefined,
  };
}

function areProfileValuesEqual(
  a: ProfileFormValues,
  b: ProfileFormValues,
): boolean {
  return (
    a.title === b.title &&
    a.slug === b.slug &&
    a.description === b.description &&
    a.location === b.location &&
    a.logoUrl === b.logoUrl
  );
}

function profileTimestamp(profile: UserProfile) {
  return new Date(profile.updatedAt).getTime();
}

const ProfileFormContext = createContext<ProfileFormController | null>(null);

function useProfileFormContext() {
  const context = use(ProfileFormContext);

  if (!context) {
    throw new Error("Profile form sections must render inside ProfileForm.");
  }

  return context;
}

function useProfileFormController({
  initialProfile,
  formRef,
}: Omit<ProfileFormRootProps, "children">) {
  const [profileOverride, setProfileOverride] = useState<UserProfile | null>(
    null,
  );
  const [saveState, setSaveState] = useState({
    isContentDirty: false,
    isUpdating: false,
  });
  const [slugState, setSlugState] = useState({
    isChecking: false,
    isEditingUnlocked: false,
    showWarningDialog: false,
  });
  const contentFormRef = useRef<ContentManagerFormHandle | null>(null);
  const slugInputRef = useRef<HTMLInputElement | null>(null);
  const syncedProfileTimestampRef = useRef(profileTimestamp(initialProfile));
  const profile = profileOverride ?? initialProfile;
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

  const hasPendingChanges = useCallback(() => {
    const values = form.getValues();
    const committedValues = toFormValues(profile);

    return (
      !areProfileValuesEqual(values, committedValues) ||
      saveState.isContentDirty ||
      needsParentCommitRef.current
    );
  }, [form, needsParentCommitRef, profile, saveState.isContentDirty]);

  useEffect(() => {
    const initialProfileTimestamp = profileTimestamp(initialProfile);
    if (initialProfileTimestamp <= syncedProfileTimestampRef.current) {
      return;
    }
    if (hasPendingChanges()) {
      return;
    }

    syncedProfileTimestampRef.current = initialProfileTimestamp;
    setProfileOverride(null);
    form.reset(toFormValues(initialProfile), { keepIsValid: true });
    resetNeedsParentCommit();
  }, [form, hasPendingChanges, initialProfile, resetNeedsParentCommit]);

  const saveChangesInternal = useCallback(
    async (reason: ProfileFormSaveReason): Promise<boolean> => {
      const shouldUpdateUi = reason !== "navigate";
      if (shouldUpdateUi) {
        setSaveState((current) => ({ ...current, isUpdating: true }));
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
        syncedProfileTimestampRef.current = profileTimestamp(updatedProfile);
        setProfileOverride(updatedProfile);
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
          setSaveState((current) => ({ ...current, isUpdating: false }));
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

  const debouncedCheckSlug = useDebouncedCallback(
    (value: string | null | undefined) => {
      if (
        !value ||
        value === profile.userId ||
        !slugSchema.safeParse(value).success
      ) {
        return;
      }

      setSlugState((current) => ({ ...current, isChecking: true }));
      void checkSlug.refetch().then((result) => {
        setSlugState((current) => ({ ...current, isChecking: false }));
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
    },
    500,
  );

  function handleSlugPointerDown(e: PointerEvent<HTMLInputElement>) {
    if (!isPro || saveState.isUpdating || slugState.isEditingUnlocked) {
      return;
    }

    e.preventDefault();
    setSlugState((current) => ({ ...current, showWarningDialog: true }));
  }

  function handleSlugFocus(e: FocusEvent<HTMLInputElement>) {
    if (
      !isPro ||
      saveState.isUpdating ||
      slugState.isEditingUnlocked ||
      slugState.showWarningDialog
    ) {
      return;
    }

    e.currentTarget.blur();
    setSlugState((current) => ({ ...current, showWarningDialog: true }));
  }

  function handleConfirmSlugEditWarning() {
    setSlugState((current) => ({
      ...current,
      isEditingUnlocked: true,
      showWarningDialog: false,
    }));
    requestAnimationFrame(() => {
      slugInputRef.current?.focus();
    });
  }

  function handleCancelSlugEditWarning() {
    setSlugState((current) => ({
      ...current,
      isEditingUnlocked: false,
      showWarningDialog: false,
    }));
  }

  function handleContentDirtyChange(isDirty: boolean) {
    setSaveState((current) => ({ ...current, isContentDirty: isDirty }));
  }

  async function onSubmit() {
    await saveChanges("manual");
  }

  return {
    cleanBaseUrl,
    contentFormRef,
    debouncedCheckSlug,
    form,
    hasPendingChanges,
    isPro,
    markNeedsParentCommit,
    onSubmit,
    profile,
    saveState,
    slugInputRef,
    slugState,
    handlers: {
      handleCancelSlugEditWarning,
      handleConfirmSlugEditWarning,
      handleContentDirtyChange,
      handleSlugFocus,
      handleSlugPointerDown,
      setSlugState,
    },
  };
}

function ProfileFormRoot({
  children,
  initialProfile,
  formRef,
}: ProfileFormRootProps) {
  const controller = useProfileFormController({ initialProfile, formRef });

  return (
    <ProfileFormContext.Provider value={controller}>
      <>
        <Form {...controller.form}>
          <form
            onSubmit={controller.form.handleSubmit(controller.onSubmit)}
            className="space-y-6"
          >
            {children}
          </form>
        </Form>
        <ProfileSlugWarningDialog />
      </>
    </ProfileFormContext.Provider>
  );
}

function GardenNameField({
  control,
  isUpdating,
}: {
  control: Control<ProfileFormValues>;
  isUpdating: boolean;
}) {
  return (
    <FormField
      control={control}
      name="title"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Garden Name</FormLabel>
          <FormControl>
            <Input {...field} value={field.value ?? ""} disabled={isUpdating} />
          </FormControl>
          <FormDescription>
            The name of your garden or business.
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function ProfileSlugField() {
  const {
    cleanBaseUrl,
    debouncedCheckSlug,
    form,
    handlers,
    isPro,
    profile,
    saveState,
    slugInputRef,
    slugState,
  } = useProfileFormContext();

  return (
    <FormField
      control={form.control}
      name="slug"
      render={({ field }) => (
        <FormItem>
          <FormLabel className="flex items-center gap-2">
            Profile URL
            {!isPro && <Sparkles className="text-muted-foreground size-4" />}
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
                  onPointerDown={handlers.handleSlugPointerDown}
                  onFocus={handlers.handleSlugFocus}
                  onChange={(e) => {
                    const value = e.target.value;
                    field.onChange(value);
                    debouncedCheckSlug(value);
                  }}
                  onBlur={(event) => {
                    field.onBlur();
                    if (
                      !slugSchema.safeParse(event.currentTarget.value).success
                    ) {
                      void form.trigger("slug");
                    }
                  }}
                  readOnly={!slugState.isEditingUnlocked}
                  disabled={saveState.isUpdating || !isPro}
                  placeholder={profile.userId}
                />
                {slugState.isChecking && (
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
              <CheckoutButton variant="link" className="h-auto p-0 text-xs">
                Upgrade to Pro to customize your profile URL
              </CheckoutButton>
            ) : (
              <>
                Choose a unique URL for your public profile (minimum 5
                characters). Only letters, numbers, hyphens, and underscores are
                allowed.
                {!field.value && " If not set, your user ID will be used."}
              </>
            )}
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function ProfileTextFields() {
  const { form, saveState } = useProfileFormContext();

  return (
    <>
      <GardenNameField
        control={form.control}
        isUpdating={saveState.isUpdating}
      />
      <ProfileSlugField />
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
                disabled={saveState.isUpdating}
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
                disabled={saveState.isUpdating}
              />
            </FormControl>
            <FormDescription>
              Optional. Your city, state, or general location.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}

function ProfileImagesSection() {
  const { markNeedsParentCommit, profile } = useProfileFormContext();

  return (
    <FormItem>
      <Label>Profile Images</Label>
      <p className="text-muted-foreground text-[0.8rem]">
        Upload images to showcase your garden. You can reorder them by dragging.
      </p>
      <ProfileImageManager
        profileId={profile.id}
        onMutationSuccess={markNeedsParentCommit}
      />
    </FormItem>
  );
}

function ProfileContentSection() {
  const { contentFormRef, handlers, markNeedsParentCommit, profile } =
    useProfileFormContext();

  return (
    <ContentManagerFormItem
      initialProfile={profile}
      formRef={contentFormRef}
      onMutationSuccess={markNeedsParentCommit}
      onDirtyChange={handlers.handleContentDirtyChange}
    />
  );
}

function ProfileFormActions() {
  const { hasPendingChanges, saveState } = useProfileFormContext();

  return (
    <div className="flex justify-end">
      <Button
        type="submit"
        disabled={saveState.isUpdating || !hasPendingChanges()}
      >
        Save Changes
      </Button>
    </div>
  );
}

function ProfileSlugWarningDialog() {
  const { cleanBaseUrl, handlers, profile, slugState } =
    useProfileFormContext();

  return (
    <SlugChangeConfirmDialog
      open={slugState.showWarningDialog}
      onOpenChange={(isOpen) =>
        handlers.setSlugState((current) => ({
          ...current,
          showWarningDialog: isOpen,
        }))
      }
      onConfirm={handlers.handleConfirmSlugEditWarning}
      onCancel={handlers.handleCancelSlugEditWarning}
      currentSlug={profile.slug ?? profile.userId}
      baseUrl={cleanBaseUrl}
    />
  );
}

export function ProfileForm({ initialProfile, formRef }: ProfileFormProps) {
  return (
    <ProfileFormRoot initialProfile={initialProfile} formRef={formRef}>
      <ProfileTextFields />
      <ProfileImagesSection />
      <ProfileFormActions />
      <ProfileContentSection />
    </ProfileFormRoot>
  );
}
