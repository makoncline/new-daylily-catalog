"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { api, type RouterOutputs } from "@/trpc/react";
import { profileFormSchema } from "@/types/schemas/profile";
import { useZodForm } from "@/hooks/use-zod-form";
import { useManagedFormSave } from "@/hooks/use-managed-form-save";
import { useFormCommit } from "@/hooks/use-form-commit";
import {
  getErrorMessage,
  normalizeError,
  reportError,
} from "@/lib/error-utils";
import type { ContentManagerFormHandle } from "@/components/forms/content-form";
import { useWatch } from "react-hook-form";
import { isConflictError } from "@/trpc/is-conflict-error";

export type UserProfile = RouterOutputs["dashboardV2"]["userProfile"]["get"];
type SaveReason = "manual" | "navigate";
export interface ProfileFormHandle {
  saveChanges: (reason: SaveReason) => Promise<boolean>;
  hasPendingChanges: () => boolean;
}

function toFormValues(profile: UserProfile) {
  return {
    title: profile.title ?? "",
    slug: profile.slug ?? "",
    description: profile.description ?? "",
    location: profile.location ?? "",
    logoUrl: profile.logoUrl ?? undefined,
  };
}

function profileTimestamp(profile: UserProfile) {
  return new Date(profile.updatedAt).getTime();
}

export function useProfileForm(
  initialProfile: UserProfile,
  formRef?: React.RefObject<ProfileFormHandle | null>,
) {
  const [profile, setProfile] = useState(initialProfile);
  const [isContentDirty, setIsContentDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const syncedProfileTimestampRef = useRef(profileTimestamp(initialProfile));
  const contentFormRef = useRef<ContentManagerFormHandle | null>(null);
  const utils = api.useUtils();
  const form = useZodForm({
    schema: profileFormSchema,
    defaultValues: toFormValues(profile),
  });
  const {
    committed,
    hasRemoteChange,
    setHasRemoteChange,
    hasFieldChanges,
    hasPendingChanges: hasFieldOrChildChanges,
    markNeedsParentCommit,
    reset,
    rebase,
    saveFields,
  } = useFormCommit(form, initialProfile, toFormValues);
  const update = api.dashboardV2.userProfile.update.useMutation();
  useWatch({ control: form.control });
  const hasPendingChanges = useCallback(
    () =>
      hasFieldOrChildChanges() ||
      (contentFormRef.current?.hasPendingChanges() ?? isContentDirty),
    [hasFieldOrChildChanges, isContentDirty],
  );

  useEffect(() => {
    if (profileTimestamp(initialProfile) <= syncedProfileTimestampRef.current)
      return;
    setProfile(initialProfile);
    if (hasPendingChanges()) {
      setHasRemoteChange(true);
      return;
    }
    syncedProfileTimestampRef.current = profileTimestamp(initialProfile);
    reset(initialProfile);
  }, [initialProfile, hasPendingChanges, reset, setHasRemoteChange]);

  const onContentSaved = useCallback(
    (saved: UserProfile) => {
      rebase(saved);
      syncedProfileTimestampRef.current = profileTimestamp(saved);
      setProfile(saved);
      utils.dashboardV2.userProfile.get.setData(undefined, saved);
      void utils.dashboardV2.userProfile.get.invalidate();
      markNeedsParentCommit();
    },
    [rebase, markNeedsParentCommit, utils],
  );

  const discardFieldsAndLoadLatest = useCallback(async () => {
    setIsSaving(true);
    try {
      const latest = await utils.dashboardV2.userProfile.get.fetch(undefined, {
        staleTime: 0,
      });
      reset(latest);
      syncedProfileTimestampRef.current = profileTimestamp(latest);
      setProfile(latest);
      setSaveError(null);
    } catch (error) {
      toast.error("Failed to load the latest profile", {
        description: getErrorMessage(error),
      });
    } finally {
      setIsSaving(false);
    }
  }, [reset, utils]);

  const save = useCallback(
    async (reason: SaveReason) => {
      if (reason === "manual") setIsSaving(true);
      setSaveError(null);
      try {
        if (contentFormRef.current?.hasPendingChanges()) {
          if (!(await contentFormRef.current.saveChanges(reason))) {
            setSaveError("Failed to save profile content.");
            if (reason === "manual")
              toast.error("Failed to save changes", {
                description: "Failed to save profile content.",
              });
            return false;
          }
        }

        if (hasFieldChanges()) {
          const valid =
            reason === "manual"
              ? await form.trigger(undefined, { shouldFocus: true })
              : profileFormSchema.safeParse(form.getValues()).success;
          if (!valid) {
            if (reason === "navigate")
              await form.trigger(undefined, { shouldFocus: true });
            return false;
          }
        }
        const fieldsSaved = await saveFields(
          initialProfile,
          (data, expectedUpdatedAt) =>
            update.mutateAsync({ expectedUpdatedAt, data }),
        );
        syncedProfileTimestampRef.current = profileTimestamp(committed.current);
        setProfile(committed.current);
        utils.dashboardV2.userProfile.get.setData(undefined, committed.current);
        void utils.dashboardV2.userProfile.get.invalidate();
        if (!fieldsSaved || hasPendingChanges()) {
          setSaveError("More changes were made during the save.");
          return false;
        }
        toast.success("Changes saved");
        return true;
      } catch (error) {
        if (isConflictError(error)) setHasRemoteChange(true);
        setSaveError(getErrorMessage(error));
        if (reason === "manual")
          toast.error("Failed to save changes", {
            description: getErrorMessage(error),
          });
        reportError({
          error: normalizeError(error),
          context: { source: "ProfileForm", reason },
        });
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [
      form,
      initialProfile,
      committed,
      hasFieldChanges,
      hasPendingChanges,
      saveFields,
      setHasRemoteChange,
      update,
      utils,
    ],
  );

  const { saveChanges } = useManagedFormSave<SaveReason, ProfileFormHandle>({
    formRef,
    hasPendingChanges,
    save,
  });
  return {
    form,
    profile,
    contentFormRef,
    isSaving,
    saveError,
    hasRemoteChange,
    discardFieldsAndLoadLatest,
    hasPendingChanges,
    saveChanges,
    markNeedsParentCommit,
    onContentSaved,
    onContentDirtyChange: setIsContentDirty,
  };
}

export type ProfileFormState = ReturnType<typeof useProfileForm>;
