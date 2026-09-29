"use client";

import * as React from "react";
import { Copy, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TAG_TEMPLATE_FIELD_DEFINITIONS } from "./tag-designer-model";

export function TagTemplateAiDialog({
  instructions,
}: {
  instructions: string;
}) {
  const [needsManualCopy, setNeedsManualCopy] = React.useState(false);
  const instructionsRef = React.useRef<HTMLTextAreaElement>(null);
  const feedbackId = React.useId();

  const copyInstructions = async () => {
    try {
      await navigator.clipboard.writeText(instructions);
      setNeedsManualCopy(false);
      toast.success(
        "AI prompt copied. Describe the tag you want, then paste back only the returned template.",
      );
    } catch {
      setNeedsManualCopy(true);
      instructionsRef.current?.focus();
      instructionsRef.current?.select();
    }
  };

  return (
    <Dialog onOpenChange={() => setNeedsManualCopy(false)}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Sparkles data-icon="inline-start" />
          Get AI instructions
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Make a tag template with AI</DialogTitle>
          <DialogDescription>
            Copy this prompt into ChatGPT or another assistant, describe the tag
            you want, then paste only the template it returns into the editor.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          ref={instructionsRef}
          aria-label="AI template instructions"
          aria-describedby={needsManualCopy ? feedbackId : undefined}
          readOnly
          value={instructions}
          className="min-h-80 resize-none"
        />
        {needsManualCopy ? (
          <p
            id={feedbackId}
            role="status"
            className="text-muted-foreground text-sm"
          >
            Automatic copy is not available. The instructions are selected.
            Press Ctrl+C or Command+C, or use the Copy command on your device.
          </p>
        ) : null}
        <div className="text-muted-foreground text-xs">
          {TAG_TEMPLATE_FIELD_DEFINITIONS.length} fields included.
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => void copyInstructions()}
          >
            <Copy data-icon="inline-start" />
            Copy instructions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
