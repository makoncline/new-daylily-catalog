"use client";

import * as React from "react";
import type EditorJS from "@editorjs/editorjs";
import { type RouterOutputs } from "@/trpc/react";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { Editor } from "@/components/editor";
import { parseEditorContent } from "@/lib/editor-utils";
import { Loader2 } from "lucide-react";
import { FormItem } from "../ui/form";
import { Label } from "../ui/label";
import { useOnClickOutside } from "usehooks-ts";
import { type OutputData } from "@editorjs/editorjs";
import { Muted } from "@/components/typography";
import { getErrorMessage, normalizeError, reportError } from "@/lib/error-utils";

export type ContentManagerSaveReason = "outside" | "manual" | "navigate";

export interface ContentManagerFormHandle {
  saveChanges: (reason: ContentManagerSaveReason) => Promise<boolean>;
  hasPendingChanges: () => boolean;
}

interface ContentManagerFormProps {
  initialProfile: RouterOutputs["dashboardDb"]["userProfile"]["get"];
  formRef?: React.RefObject<ContentManagerFormHandle | null>;
}

export function ContentManagerFormItem({
  initialProfile,
  formRef,
}: ContentManagerFormProps) {
  const [isSaving, setIsSaving] = React.useState(false);
  const [lastSaved, setLastSaved] = React.useState(() => initialProfile.content);
  const [isDirty, setIsDirty] = React.useState(false);
  const editorRef = React.useRef<EditorJS | null>(null);
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const inFlightSaveRef = React.useRef<Promise<boolean> | null>(null);
  const isDirtyRef = React.useRef(isDirty);
  const lastSavedRef = React.useRef(lastSaved);
  isDirtyRef.current = isDirty;
  lastSavedRef.current = lastSaved;
  const utils = api.useUtils();

  const updateContentMutation = api.dashboardDb.userProfile.updateContent.useMutation();

  const markDirty = React.useCallback(() => {
    if (isDirtyRef.current) {
      return;
    }

    isDirtyRef.current = true;
    setIsDirty(true);
  }, []);

  const hasPendingChanges = React.useCallback(() => {
    return isDirtyRef.current;
  }, []);

  const saveChanges = React.useCallback(
    async (reason: ContentManagerSaveReason): Promise<boolean> => {
      if (inFlightSaveRef.current) {
        return inFlightSaveRef.current;
      }

      const shouldUpdateUi = reason !== "navigate";

      const editor = editorRef.current;

      if (!editor || !isDirtyRef.current) {
        return true;
      }

      const savePromise = (async (): Promise<boolean> => {
        if (shouldUpdateUi) {
          setIsSaving(true);
        }

        try {
          const newBlocks = await editor.save();
          const previousContent = lastSavedRef.current;

          if (previousContent) {
            try {
              const oldData = (
                typeof previousContent === "string"
                  ? JSON.parse(previousContent)
                  : previousContent
              ) as OutputData;

              if (
                JSON.stringify(newBlocks.blocks) === JSON.stringify(oldData.blocks)
              ) {
                isDirtyRef.current = false;
                if (shouldUpdateUi) {
                  setIsDirty(false);
                }
                return true;
              }
            } catch {
              // If old content cannot be parsed, continue and save the current content.
            }
          }

          const newData = JSON.stringify(newBlocks);
          const updatedProfile = await updateContentMutation.mutateAsync({
            content: newData,
          });

          utils.dashboardDb.userProfile.get.setData(undefined, updatedProfile);
          if (shouldUpdateUi) {
            void utils.dashboardDb.userProfile.get.invalidate();
          }

          lastSavedRef.current = newData;
          if (shouldUpdateUi) {
            setLastSaved(newData);
          }

          isDirtyRef.current = false;
          if (shouldUpdateUi) {
            setIsDirty(false);
          }

          if (reason === "outside") {
            toast.success("Content saved");
          }

          return true;
        } catch (error) {
          if (reason === "outside") {
            toast.error("Failed to save content", {
              description: getErrorMessage(error),
            });
          }

          reportError({
            error: normalizeError(error),
            context: { source: "ContentManagerFormItem", reason },
          });
          return false;
        } finally {
          if (shouldUpdateUi) {
            setIsSaving(false);
          }
        }
      })();

      inFlightSaveRef.current = savePromise;
      try {
        return await savePromise;
      } finally {
        if (inFlightSaveRef.current === savePromise) {
          inFlightSaveRef.current = null;
        }
      }
    },
    [updateContentMutation, utils],
  );

  React.useEffect(() => {
    if (!formRef) {
      return;
    }

    formRef.current = {
      saveChanges,
      hasPendingChanges,
    };
  }, [formRef, hasPendingChanges, saveChanges]);

  React.useEffect(() => {
    if (isDirtyRef.current) {
      return;
    }

    lastSavedRef.current = initialProfile.content;
    setLastSaved(initialProfile.content);
  }, [initialProfile.content]);

  useOnClickOutside(contentRef as React.RefObject<HTMLElement>, () => {
    void saveChanges("outside");
  });

  const isPendingIndicatorVisible = isSaving || updateContentMutation.isPending;

  return (
    <FormItem>
      <div className="flex w-full items-end justify-between">
        <div>
          <Label>Content</Label>
          <Muted className="text-sm">
            Tell visitors about yourself and your garden.
          </Muted>
        </div>
        {isPendingIndicatorVisible && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      </div>
      <div ref={contentRef} className="space-y-3">
        <div
          className="bg-background min-h-96 rounded-md border"
          onInputCapture={markDirty}
        >
          <Editor
            editorRef={editorRef}
            initialContent={parseEditorContent(initialProfile.content)}
            className="px-3 py-2 pb-8"
            onChange={markDirty}
          />
        </div>
      </div>
      <div className="h-96" />
    </FormItem>
  );
}
