"use client";

import * as React from "react";
import type EditorJS from "@editorjs/editorjs";
import { type RouterOutputs } from "@/trpc/react";
import { api } from "@/trpc/react";
import { getTrpcClient } from "@/trpc/client";
import { toast } from "sonner";
import { Editor } from "@/components/editor";
import { parseEditorContent } from "@/lib/editor-utils";
import { Loader2 } from "lucide-react";
import { FormItem } from "../ui/form";
import { Label } from "../ui/label";
import { useOnClickOutside } from "usehooks-ts";
import { type OutputData } from "@editorjs/editorjs";
import { Muted } from "@/components/typography";
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
  onMutationSuccess?: (
    profile: RouterOutputs["dashboardDb"]["userProfile"]["updateContent"],
  ) => void;
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
  const editorRef = React.useRef<EditorJS | null>(null);
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const isDirtyRef = React.useRef(isDirty);
  const lastSavedRef = React.useRef(initialProfile.content);
  const lastSavedUpdatedAtRef = React.useRef(initialProfile.updatedAt);
  const [editorSnapshot, setEditorSnapshot] = React.useState({
    content: initialProfile.content,
    revision: 0,
  });
  const [hasRemoteChange, setHasRemoteChange] = React.useState(false);
  isDirtyRef.current = isDirty;

  const updateContentMutation =
    api.dashboardDb.userProfile.updateContent.useMutation();
  const utils = api.useUtils();

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
              if (shouldUpdateUi) {
                setIsDirty(false);
                onDirtyChange?.(false);
              }
              return true;
            }
          } catch {
            // If old content cannot be parsed, continue and save current content.
          }
        }

        const newData = JSON.stringify(newBlocks);
        const saved = await updateContentMutation.mutateAsync({
          content: newData,
          expectedUpdatedAt: new Date(
            lastSavedUpdatedAtRef.current,
          ).toISOString(),
        });

        lastSavedRef.current = newData;
        lastSavedUpdatedAtRef.current = saved.updatedAt;
        setEditorSnapshot((current) => ({ ...current, content: newData }));
        setHasRemoteChange(false);

        isDirtyRef.current = false;
        if (shouldUpdateUi) {
          setIsDirty(false);
          onDirtyChange?.(false);
        }

        onMutationSuccess?.(saved);

        return true;
      } catch (error) {
        if (getErrorMessage(error).includes("changed. Load the latest")) {
          setHasRemoteChange(true);
          try {
            const latest =
              await getTrpcClient().dashboardDb.userProfile.get.query();
            utils.dashboardDb.userProfile.get.setData(undefined, latest);
          } catch (refreshError) {
            reportError({
              error: normalizeError(refreshError),
              context: { source: "ContentManagerFormItem", reason: "refresh" },
            });
          }
        }
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
    [onDirtyChange, onMutationSuccess, updateContentMutation, utils],
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
    const incomingTime = new Date(initialProfile.updatedAt).getTime();
    const savedTime = new Date(lastSavedUpdatedAtRef.current).getTime();
    if (incomingTime < savedTime) {
      return;
    }
    if (
      incomingTime === savedTime &&
      initialProfile.content === lastSavedRef.current
    ) {
      return;
    }
    if (isDirtyRef.current) {
      setHasRemoteChange(true);
      return;
    }

    lastSavedRef.current = initialProfile.content;
    lastSavedUpdatedAtRef.current = initialProfile.updatedAt;
    setEditorSnapshot((current) => ({
      content: initialProfile.content,
      revision:
        current.content === initialProfile.content
          ? current.revision
          : current.revision + 1,
    }));
    setHasRemoteChange(false);
  }, [initialProfile.content, initialProfile.updatedAt]);

  const loadLatestContent = React.useCallback(async () => {
    setIsSaving(true);
    try {
      const latest = await getTrpcClient().dashboardDb.userProfile.get.query();
      utils.dashboardDb.userProfile.get.setData(undefined, latest);
      lastSavedRef.current = latest.content;
      lastSavedUpdatedAtRef.current = latest.updatedAt;
      isDirtyRef.current = false;
      setIsDirty(false);
      onDirtyChange?.(false);
      setEditorSnapshot((current) => ({
        content: latest.content,
        revision: current.revision + 1,
      }));
      setHasRemoteChange(false);
    } catch (error) {
      toast.error("Failed to load the latest story", {
        description: getErrorMessage(error),
      });
    } finally {
      setIsSaving(false);
    }
  }, [onDirtyChange, utils]);

  useOnClickOutside(contentRef as React.RefObject<HTMLElement>, () => {
    void saveChanges("outside");
  });

  const isPendingIndicatorVisible = isSaving || updateContentMutation.isPending;
  const editorResetKey = editorSnapshot.revision;
  const focusReviewBlock = React.useCallback((editor: EditorJS) => {
    if (window.location.hash !== "#profile-content") return;
    const blockId = new URLSearchParams(window.location.search).get(
      "contentBlock",
    );
    if (!blockId) return;
    const block = editor.blocks.getById(blockId);
    if (!block) {
      toast.error("The profile block is no longer in the editor.");
      return;
    }
    block.holder.classList.add(
      "outline",
      "outline-2",
      "outline-primary",
      "outline-offset-2",
    );
    requestAnimationFrame(() => {
      block.holder.scrollIntoView({ block: "center" });
      editor.caret.setToBlock(block, "start");
    });
  }, []);

  return (
    <FormItem>
      <div className="flex w-full items-end justify-between">
        <div>
          <Label>Content</Label>
          <Muted className="text-sm">
            Tell visitors about yourself and your garden.
          </Muted>
        </div>
        {isPendingIndicatorVisible && (
          <Loader2 className="mr-2 size-4 animate-spin" />
        )}
      </div>
      <div ref={contentRef} className="space-y-3">
        {hasRemoteChange && (
          <div role="status" className="rounded-md border p-3 text-sm">
            <p>
              Your profile changed elsewhere. Your unsaved story is still here.
              Saving it will report a conflict.
            </p>
            <button
              type="button"
              className="mt-2 underline"
              onClick={() => void loadLatestContent()}
              disabled={isPendingIndicatorVisible}
            >
              Discard this draft and load the latest story
            </button>
          </div>
        )}
        <div className="bg-background min-h-96 rounded-md border">
          <Editor
            key={editorResetKey}
            editorRef={editorRef}
            initialContent={parseEditorContent(editorSnapshot.content)}
            className="px-3 py-2 pb-8"
            onChange={markDirty}
            onReady={focusReviewBlock}
          />
        </div>
      </div>
      <div className="h-96" />
    </FormItem>
  );
}
