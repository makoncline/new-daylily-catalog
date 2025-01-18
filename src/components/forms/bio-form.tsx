"use client";

import * as React from "react";
import type EditorJS from "@editorjs/editorjs";
import { type RouterOutputs } from "@/trpc/react";
import { api } from "@/trpc/react";
import { useToast } from "@/hooks/use-toast";
import { Editor } from "@/components/editor";
import { parseEditorContent } from "@/lib/editor-utils";
import { Loader2 } from "lucide-react";
import { FormItem, FormLabel, FormDescription } from "../ui/form";
import { useOnClickOutside } from "usehooks-ts";
import { type OutputData } from "@editorjs/editorjs";

interface BioManagerFormProps {
  initialProfile: RouterOutputs["userProfile"]["get"];
}

export function BioManagerFormItem({ initialProfile }: BioManagerFormProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = React.useState(false);
  const [lastSaved, setLastSaved] = React.useState(() => initialProfile.bio);
  const editorRef = React.useRef<EditorJS>();
  const bioRef = React.useRef<HTMLDivElement>(null);

  const updateBioMutation = api.userProfile.updateBio.useMutation({
    onSuccess: () => {
      setIsSaving(false);
      toast({
        title: "Bio saved",
      });
    },
    onError: () => {
      setIsSaving(false);
      toast({
        title: "Failed to save bio",
        variant: "destructive",
      });
    },
  });

  async function handleSave() {
    if (!editorRef.current) return;

    setIsSaving(true);

    try {
      const newBlocks = await editorRef.current.save();
      // Extract the blocks field from the new data
      const newBlocksOnly = newBlocks.blocks;

      // Parse lastSaved if needed, then extract the blocks field
      const oldData = (
        typeof lastSaved === "string" ? JSON.parse(lastSaved) : lastSaved
      ) as OutputData;
      const oldBlocksOnly = oldData.blocks;

      // Compare blocks only
      if (JSON.stringify(newBlocksOnly) === JSON.stringify(oldBlocksOnly)) {
        setIsSaving(false);
        return; // No changes in blocks, skip saving
      }

      // Save if changed
      const newData = JSON.stringify(newBlocks);
      await updateBioMutation.mutateAsync({ bio: newData });
      setLastSaved(newData);
    } catch (error) {
      console.error("Failed to save editor content", error);
      setIsSaving(false);
    }
  }

  useOnClickOutside(bioRef, () => {
    void handleSave();
  });

  return (
    <FormItem>
      <div className="flex w-full items-end justify-between">
        <div>
          <FormLabel>Bio</FormLabel>
          <FormDescription>
            Tell visitors about yourself and your garden.
          </FormDescription>
        </div>
        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      </div>
      <div ref={bioRef} className="space-y-3">
        <Editor
          editorRef={editorRef}
          initialContent={parseEditorContent(initialProfile.bio)}
        />
      </div>
    </FormItem>
  );
}
