"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { api, type RouterOutputs } from "@/trpc/react";
import { profileFormSchema } from "@/types/schemas/profile";
import { useZodForm } from "@/hooks/use-zod-form";
import { useManagedFormSave } from "@/hooks/use-managed-form-save";
import { useParentCommitFlag } from "@/hooks/use-parent-commit-flag";
import {
  getErrorMessage,
  normalizeError,
  reportError,
} from "@/lib/error-utils";
import type { ContentManagerFormHandle } from "@/components/forms/content-form";
import type { z } from "zod";
import { useWatch } from "react-hook-form";
import { rebaseFormValues } from "@/lib/rebase-form-values";

export type UserProfile = RouterOutputs["dashboardDb"]["userProfile"]["get"];
type SaveReason = "manual" | "navigate";
export interface ProfileFormHandle {
  saveChanges: (reason: SaveReason) => Promise<boolean>;
  hasPendingChanges: () => boolean;
}

function toFormValues(profile: UserProfile) {
  return {
    title: profile.title ?? undefined,
    slug: profile.slug ?? undefined,
    description: profile.description ?? undefined,
    location: profile.location ?? undefined,
    logoUrl: profile.logoUrl ?? undefined,
  };
}

function equalValues(
  a: z.input<typeof profileFormSchema>,
  b: z.input<typeof profileFormSchema>,
) {
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

export function useProfileForm(
  initialProfile: UserProfile,
  formRef?: React.RefObject<ProfileFormHandle | null>,
) {
  const [profile, setProfile] = useState(initialProfile);
  const [isContentDirty, setIsContentDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [hasRemoteChange, setHasRemoteChange] = useState(false);
  const committedProfileRef = useRef(initialProfile);
  const syncedProfileTimestampRef = useRef(profileTimestamp(initialProfile));
  const contentFormRef = useRef<ContentManagerFormHandle | null>(null);
  const childMutationVersionRef = useRef(0);
  const utils = api.useUtils();
  const {
    markNeedsParentCommit,
    needsParentCommitRef,
    resetNeedsParentCommit,
  } = useParentCommitFlag();
  const markChildMutation = useCallback(() => {
    childMutationVersionRef.current += 1;
    markNeedsParentCommit();
  }, [markNeedsParentCommit]);
  const form = useZodForm({
    schema: profileFormSchema,
    defaultValues: toFormValues(profile),
  });
  const update = api.dashboardDb.userProfile.update.useMutation();
  useWatch({ control: form.control });
  const hasPendingChanges = useCallback(
    () =>
      !equalValues(
        form.getValues(),
        toFormValues(committedProfileRef.current),
      ) ||
      (contentFormRef.current?.hasPendingChanges() ?? isContentDirty) ||
      needsParentCommitRef.current,
    [form, isContentDirty, needsParentCommitRef],
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
    committedProfileRef.current = initialProfile;
    form.reset(toFormValues(initialProfile), { keepIsValid: true });
    resetNeedsParentCommit();
    setHasRemoteChange(false);
  }, [initialProfile, form, hasPendingChanges, resetNeedsParentCommit]);

  const onContentSaved = useCallback(
    (saved: UserProfile) => {
      const draft = form.getValues();
      const rebased = rebaseFormValues(
        draft,
        toFormValues(committedProfileRef.current),
        toFormValues(saved),
      );
      if (rebased) {
        committedProfileRef.current = saved;
        if (!equalValues(draft, rebased))
          form.reset(rebased, { keepIsValid: true });
      }
      syncedProfileTimestampRef.current = profileTimestamp(saved);
      setProfile(saved);
      setHasRemoteChange(!rebased);
      utils.dashboardDb.userProfile.get.setData(undefined, saved);
      void utils.dashboardDb.userProfile.get.invalidate();
      markChildMutation();
    },
    [form, markChildMutation, utils],
  );

  const discardFieldsAndLoadLatest = useCallback(async () => {
    setIsSaving(true);
    try {
      const latest = await utils.dashboardDb.userProfile.get.fetch(undefined, {
        staleTime: 0,
      });
      committedProfileRef.current = latest;
      syncedProfileTimestampRef.current = profileTimestamp(latest);
      setProfile(latest);
      form.reset(toFormValues(latest), { keepIsValid: true });
      resetNeedsParentCommit();
      setHasRemoteChange(false);
      setSaveError(null);
    } catch (error) {
      toast.error("Failed to load the latest profile", {
        description: getErrorMessage(error),
      });
    } finally {
      setIsSaving(false);
    }
  }, [form, resetNeedsParentCommit, utils]);

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

        const values = form.getValues();
        const hasFieldPending = !equalValues(
          values,
          toFormValues(committedProfileRef.current),
        );
        if (!hasFieldPending && !needsParentCommitRef.current) return true;
        if (!hasFieldPending) {
          if (
            profileTimestamp(initialProfile) >
            profileTimestamp(committedProfileRef.current)
          ) {
            committedProfileRef.current = initialProfile;
            syncedProfileTimestampRef.current =
              profileTimestamp(initialProfile);
            setProfile(initialProfile);
            form.reset(toFormValues(initialProfile), { keepIsValid: true });
          }
          resetNeedsParentCommit();
          setHasRemoteChange(false);
          toast.success("Changes saved");
          return true;
        }
        const valid =
          reason === "manual"
            ? await form.trigger(undefined, { shouldFocus: true })
            : profileFormSchema.safeParse(values).success;
        if (!valid) {
          if (reason === "navigate")
            await form.trigger(undefined, { shouldFocus: true });
          return false;
        }

        const childMutationVersion = childMutationVersionRef.current;
        const updatedProfile = await update.mutateAsync({
          expectedUpdatedAt: new Date(
            committedProfileRef.current.updatedAt,
          ).toISOString(),
          data: values,
        });
        const changedDuringSave = !equalValues(form.getValues(), values);
        if (
          profileTimestamp(updatedProfile) >=
          profileTimestamp(committedProfileRef.current)
        ) {
          committedProfileRef.current = updatedProfile;
          syncedProfileTimestampRef.current = profileTimestamp(updatedProfile);
          setProfile(updatedProfile);
          setHasRemoteChange(false);
          form.reset(toFormValues(updatedProfile), {
            keepIsValid: true,
            keepValues: changedDuringSave,
          });
        }
        if (childMutationVersionRef.current === childMutationVersion)
          resetNeedsParentCommit();
        utils.dashboardDb.userProfile.get.setData(
          undefined,
          committedProfileRef.current,
        );
        void utils.dashboardDb.userProfile.get.invalidate();
        if (
          changedDuringSave ||
          childMutationVersionRef.current !== childMutationVersion ||
          contentFormRef.current?.hasPendingChanges()
        ) {
          setSaveError("More changes were made during the save.");
          return false;
        }
        toast.success("Changes saved");
        return true;
      } catch (error) {
        if (getErrorMessage(error).includes("changed. Load the latest"))
          setHasRemoteChange(true);
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
      contentFormRef,
      form,
      needsParentCommitRef,
      initialProfile,
      resetNeedsParentCommit,
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
    markNeedsParentCommit: markChildMutation,
    onContentSaved,
    onContentDirtyChange: setIsContentDirty,
  };
}

export type ProfileFormState = ReturnType<typeof useProfileForm>;
