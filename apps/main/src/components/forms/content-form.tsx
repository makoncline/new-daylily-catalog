"use client";

import * as React from "react";
import type EditorJS from "@editorjs/editorjs";
import { type RouterOutputs } from "@/trpc/react";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { Editor } from "@/components/editor";
import { parseEditorContent } from "@/lib/editor-utils";
import { Spinner } from "../ui/spinner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { useOnClickOutside } from "usehooks-ts";
import { type OutputData } from "@editorjs/editorjs";
import {
  getErrorMessage,
  normalizeError,
  reportError,
} from "@/lib/error-utils";
import { useManagedFormSave } from "@/hooks/use-managed-form-save";

export type ContentManagerSaveReason = "outside" | "manual" | "navigate";

export interface ContentManagerFormHandle {
  saveChanges: (reason: ContentManagerSaveReason) => Promise<boolean>;
  hasPendingChanges: () => boolean;
}

interface ContentManagerFormProps {
  initialProfile: RouterOutputs["dashboardDb"]["userProfile"]["get"];
  formRef?: React.RefObject<ContentManagerFormHandle | null>;
  onMutationSuccess?: () => void;
  onDirtyChange?: (isDirty: boolean) => void;
}

export function ContentManagerFormItem({
  initialProfile,
  formRef,
  onMutationSuccess,
  onDirtyChange,
}: ContentManagerFormProps) {
  const [isSaving, setIsSaving] = React.useState(false);
  const [isDirty, setIsDirty] = React.useState(false);
  const [editorContent, setEditorContent] = React.useState(
    initialProfile.content,
  );
  const editorRef = React.useRef<EditorJS | null>(null);
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const isDirtyRef = React.useRef(isDirty);
  const lastSavedRef = React.useRef(initialProfile.content);
  const lastSavedTimestampRef = React.useRef(
    new Date(initialProfile.updatedAt).getTime(),
  );
  isDirtyRef.current = isDirty;

  const updateContentMutation =
    api.dashboardDb.userProfile.updateContent.useMutation();

  const markDirty = React.useCallback(() => {
    if (isDirtyRef.current) {
      return;
    }

    isDirtyRef.current = true;
    setIsDirty(true);
    onDirtyChange?.(true);
  }, [onDirtyChange]);

  const hasPendingChanges = React.useCallback(() => {
    return isDirtyRef.current;
  }, []);

  const saveChangesInternal = React.useCallback(
    async (reason: ContentManagerSaveReason): Promise<boolean> => {
      const shouldUpdateUi = reason !== "navigate";

      const editor = editorRef.current;
      if (!editor || !isDirtyRef.current) {
        return true;
      }
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
              JSON.stringify(newBlocks.blocks) ===
              JSON.stringify(oldData.blocks)
            ) {
              isDirtyRef.current = false;
              setIsDirty(false);
              onDirtyChange?.(false);
              return true;
            }
          } catch {
            // If old content cannot be parsed, continue and save current content.
          }
        }

        const newData = JSON.stringify(newBlocks);
        const savedProfile = await updateContentMutation.mutateAsync({
          content: newData,
        });

        lastSavedRef.current = newData;
        lastSavedTimestampRef.current = new Date(
          savedProfile.updatedAt,
        ).getTime();

        onMutationSuccess?.();
        const currentBlocks = await editor.save();
        if (
          JSON.stringify(currentBlocks.blocks) !==
          JSON.stringify(newBlocks.blocks)
        )
          return false;

        isDirtyRef.current = false;
        setIsDirty(false);
        onDirtyChange?.(false);

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
    },
    [onDirtyChange, onMutationSuccess, updateContentMutation],
  );

  const { saveChanges } = useManagedFormSave<
    ContentManagerSaveReason,
    ContentManagerFormHandle
  >({
    formRef,
    hasPendingChanges,
    save: saveChangesInternal,
  });

  React.useEffect(() => {
    const timestamp = new Date(initialProfile.updatedAt).getTime();
    if (isDirtyRef.current || timestamp <= lastSavedTimestampRef.current) {
      return;
    }

    lastSavedTimestampRef.current = timestamp;

    if (lastSavedRef.current !== initialProfile.content) {
      lastSavedRef.current = initialProfile.content;
      setEditorContent(initialProfile.content);
    }
  }, [initialProfile.content, initialProfile.updatedAt]);

  useOnClickOutside(contentRef as React.RefObject<HTMLElement>, () => {
    void saveChanges("outside");
  });

  const handleEditorChange = React.useCallback(async () => {
    try {
      const current = await editorRef.current?.save();
      if (
        current &&
        JSON.stringify(current.blocks) !==
          JSON.stringify(parseEditorContent(lastSavedRef.current)?.blocks ?? [])
      )
        markDirty();
    } catch {
      markDirty();
    }
  }, [markDirty]);

  const isPendingIndicatorVisible = isSaving || updateContentMutation.isPending;
  const editorResetKey = editorContent ?? "empty-content";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Content</CardTitle>
          {isPendingIndicatorVisible && <Spinner aria-label="Saving content" />}
        </div>
        <CardDescription>
          Tell visitors about yourself and your garden.
        </CardDescription>
      </CardHeader>
      <CardContent ref={contentRef} onInputCapture={markDirty}>
        <div className="bg-background min-h-96 rounded-md border">
          <Editor
            key={editorResetKey}
            editorRef={editorRef}
            initialContent={parseEditorContent(editorContent)}
            className="px-3 py-2 pb-8"
            onChange={() => void handleEditorChange()}
          />
        </div>
      </CardContent>
    </Card>
  );
}
