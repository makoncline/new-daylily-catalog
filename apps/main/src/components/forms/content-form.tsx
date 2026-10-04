"use client";

import * as React from "react";
import { isTRPCClientError } from "@trpc/client";
import type EditorJS from "@editorjs/editorjs";
import type { AppRouter } from "@/server/api/root";
import { type RouterOutputs } from "@/trpc/react";
import { api } from "@/trpc/react";
import { getTrpcClient } from "@/trpc/client";
import { toast } from "sonner";
import { Editor } from "@/components/editor";
import { parseEditorContent } from "@/lib/editor-utils";
import { Spinner } from "../ui/spinner";
import { FieldDescription } from "../ui/field";
import { useOnClickOutside } from "usehooks-ts";
import { type OutputData } from "@editorjs/editorjs";
import {
  getErrorMessage,
  normalizeError,
  reportError,
} from "@/lib/error-utils";
import { useManagedFormSave } from "@/hooks/use-managed-form-save";
import { useDashboardSectionFocus } from "@/hooks/use-dashboard-section-focus";

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
  useDashboardSectionFocus("profile-content");
  const [isSaving, setIsSaving] = React.useState(false);
  const [isDirty, setIsDirty] = React.useState(false);
  const editorRef = React.useRef<EditorJS | null>(null);
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const isDirtyRef = React.useRef(isDirty);
  const lastSavedRef = React.useRef(initialProfile.content);
  const lastAcceptedContentRef = React.useRef(initialProfile.content);
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
              setIsDirty(false);
              onDirtyChange?.(false);
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
        lastAcceptedContentRef.current = saved.content;
        lastSavedUpdatedAtRef.current = saved.updatedAt;
        setEditorSnapshot((current) => ({ ...current, content: newData }));
        setHasRemoteChange(false);

        onMutationSuccess?.(saved);
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
        if (
          isTRPCClientError<AppRouter>(error) &&
          error.data?.code === "CONFLICT"
        ) {
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
      initialProfile.content === lastAcceptedContentRef.current
    ) {
      return;
    }
    if (isDirtyRef.current) {
      if (initialProfile.content === lastAcceptedContentRef.current) {
        lastSavedUpdatedAtRef.current = initialProfile.updatedAt;
        setHasRemoteChange(false);
        return;
      }
      setHasRemoteChange(true);
      return;
    }

    lastSavedRef.current = initialProfile.content;
    lastAcceptedContentRef.current = initialProfile.content;
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
      lastAcceptedContentRef.current = latest.content;
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
    <section
      id="profile-content"
      aria-labelledby="profile-content-heading"
      className="flex flex-col gap-3"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 id="profile-content-heading" className="text-sm font-medium">
          Content
        </h2>
        {isPendingIndicatorVisible && <Spinner aria-label="Saving content" />}
      </div>
      <FieldDescription>
        Tell visitors about yourself and your garden.
      </FieldDescription>
      <div ref={contentRef} className="space-y-3" onInputCapture={markDirty}>
        {hasRemoteChange && (
          <div role="status" className="text-sm">
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
            onChange={() => void handleEditorChange()}
            onReady={focusReviewBlock}
          />
        </div>
      </div>
    </section>
  );
}
