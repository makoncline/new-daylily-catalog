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

interface ContentManagerFormProps {
  initialProfile: RouterOutputs["dashboardDb"]["userProfile"]["get"];
}

export function ContentManagerFormItem({
  initialProfile,
}: ContentManagerFormProps) {
  const [isSaving, setIsSaving] = React.useState(false);
  const [lastSaved, setLastSaved] = React.useState(
    () => initialProfile.content,
  );
  const editorRef = React.useRef<EditorJS | null>(null);
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const utils = api.useUtils();

  const updateContentMutation = api.dashboardDb.userProfile.updateContent.useMutation({
    onSuccess: (updatedProfile) => {
      utils.dashboardDb.userProfile.get.setData(undefined, updatedProfile);
      void utils.dashboardDb.userProfile.get.invalidate();
      setIsSaving(false);
      toast.success("Content saved");
    },
    onError: (error, errorInfo) => {
      setIsSaving(false);
      toast.error("Failed to save content", {
        description: getErrorMessage(error),
      });
      reportError({
        error: normalizeError(error),
        context: { source: "ContentManagerFormItem", errorInfo },
      });
    },
  });

  async function handleSave() {
    if (!editorRef.current) return;

    setIsSaving(true);

    try {
      const newBlocks = await editorRef.current.save();

      // Only compare if we have existing content
      if (lastSaved) {
        // Parse lastSaved if needed, then extract the blocks field
        const oldData = (
          typeof lastSaved === "string" ? JSON.parse(lastSaved) : lastSaved
        ) as OutputData;

        // Compare blocks only
        if (
          JSON.stringify(newBlocks.blocks) === JSON.stringify(oldData.blocks)
        ) {
          setIsSaving(false);
          return; // No changes in blocks, skip saving
        }
      }

      // Save if there was no previous content or if content changed
      const newData = JSON.stringify(newBlocks);
      await updateContentMutation.mutateAsync({ content: newData });
      setLastSaved(newData);
    } catch (error) {
      console.error("Failed to save editor content", error);
      setIsSaving(false);
    }
  }

  useOnClickOutside(contentRef as React.RefObject<HTMLElement>, () => {
    void handleSave();
  });

  return (
    <FormItem>
      <div className="flex w-full items-end justify-between">
        <div>
          <Label>Content</Label>
          <Muted className="text-sm">
            Tell visitors about yourself and your garden.
          </Muted>
        </div>
        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      </div>
      <div ref={contentRef} className="space-y-3">
        <div className="bg-background min-h-96 rounded-md border">
          <Editor
            editorRef={editorRef}
            initialContent={parseEditorContent(initialProfile.content)}
            className="px-3 py-2 pb-8"
          />
        </div>
      </div>
      <div className="h-96" />
    </FormItem>
  );
}
