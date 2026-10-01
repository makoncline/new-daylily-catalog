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

export function useProfileForm(
  initialProfile: UserProfile,
  formRef?: React.RefObject<ProfileFormHandle | null>,
) {
  const [profile, setProfile] = useState(initialProfile);
  const [isContentDirty, setIsContentDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
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
      !equalValues(form.getValues(), toFormValues(profile)) ||
      (contentFormRef.current?.hasPendingChanges() ?? isContentDirty) ||
      needsParentCommitRef.current,
    [form, profile, isContentDirty, needsParentCommitRef],
  );

  useEffect(() => {
    if (
      new Date(initialProfile.updatedAt).getTime() <=
        new Date(profile.updatedAt).getTime() ||
      hasPendingChanges()
    )
      return;
    setProfile(initialProfile);
    form.reset(toFormValues(initialProfile), { keepIsValid: true });
    resetNeedsParentCommit();
  }, [
    initialProfile,
    profile.updatedAt,
    form,
    hasPendingChanges,
    resetNeedsParentCommit,
  ]);

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
          markChildMutation();
        }

        const values = form.getValues();
        const hasFieldPending = !equalValues(values, toFormValues(profile));
        if (!hasFieldPending && !needsParentCommitRef.current) return true;
        if (hasFieldPending) {
          const valid =
            reason === "manual"
              ? await form.trigger(undefined, { shouldFocus: true })
              : profileFormSchema.safeParse(values).success;
          if (!valid) {
            if (reason === "navigate")
              await form.trigger(undefined, { shouldFocus: true });
            return false;
          }
        }

        const childMutationVersion = childMutationVersionRef.current;
        const updatedProfile = await update.mutateAsync({ data: values });
        const changedDuringSave = !equalValues(form.getValues(), values);
        setProfile(updatedProfile);
        form.reset(toFormValues(updatedProfile), {
          keepIsValid: true,
          keepValues: changedDuringSave,
        });
        if (childMutationVersionRef.current === childMutationVersion)
          resetNeedsParentCommit();
        utils.dashboardDb.userProfile.get.setData(undefined, updatedProfile);
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
      markChildMutation,
      needsParentCommitRef,
      profile,
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
    hasPendingChanges,
    saveChanges,
    markNeedsParentCommit: markChildMutation,
    onContentDirtyChange: setIsContentDirty,
  };
}

export type ProfileFormState = ReturnType<typeof useProfileForm>;
