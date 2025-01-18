"use client";

import * as React from "react";
import type EditorJS from "@editorjs/editorjs";
import { type RouterOutputs } from "@/trpc/react";
import { api } from "@/trpc/react";
import { useToast } from "@/hooks/use-toast";
import { Editor } from "@/components/editor";
import { parseEditorContent } from "@/lib/editor-utils";
import { buttonVariants } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type UserProfile = RouterOutputs["userProfile"]["get"];

interface BioFormProps {
  initialProfile: UserProfile;
}

export function BioForm({ initialProfile }: BioFormProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = React.useState(false);
  const editorRef = React.useRef<EditorJS>();

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
      const blocks = await editorRef.current.save();
      await updateBioMutation.mutateAsync({ bio: blocks });
    } catch (error) {
      console.error("Failed to save editor content", error);
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex w-full justify-end">
        <button
          type="button"
          onClick={handleSave}
          className={cn(buttonVariants())}
        >
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <span>Save</span>
        </button>
      </div>

      <Editor
        editorRef={editorRef}
        initialContent={parseEditorContent(initialProfile.bio)}
      />
    </div>
  );
}
