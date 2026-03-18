"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useSetAtom } from "jotai";
import { editingListIdAtom } from "./edit-list-dialog";
import { normalizeError, reportError } from "@/lib/error-utils";
import { insertList } from "@/app/dashboard/_lib/dashboard-db/lists-collection";
import { useManagedDialogOpen } from "@/hooks/use-managed-dialog-open";
import { ManagedCreateDialog } from "@/app/dashboard/_components/managed-create-dialog";

export function CreateListDialog({
  onOpenChange,
}: {
  onOpenChange: (open: boolean) => void;
}) {
  const [title, setTitle] = useState("");
  const [isPending, setIsPending] = useState(false);
  const { closeDialog, handleOpenChange, open } =
    useManagedDialogOpen(onOpenChange);

  const setEditingId = useSetAtom(editingListIdAtom);

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error("Title required", {
        description: "Please enter a title for your list.",
      });
      return;
    }

    setIsPending(true);
    try {
      const newList = await insertList({
        title: title.trim(),
        description: "",
      });

      toast.success("List created", {
        description: `${newList.title} has been created.`,
      });

      closeDialog();
      setEditingId(newList.id);
    } catch (error) {
      toast.error("Failed to create list");
      reportError({
        error: normalizeError(error),
        context: { source: "CreateListDialog" },
      });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <ManagedCreateDialog
      cancelDisabled={isPending}
      confirmDisabled={isPending || !title.trim()}
      confirmLabel="Create List"
      contentClassName="top-[20%] sm:top-[30%]"
      description="Create a new list to organize your daylilies."
      onCancel={closeDialog}
      onConfirm={handleCreate}
      onOpenChange={handleOpenChange}
      open={open}
      title="Create New List"
    >
      <div className="space-y-2">
        <Label htmlFor="title">
          List Title <span className="text-destructive">*</span>
        </Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter a title"
          disabled={isPending}
          required
        />
      </div>
    </ManagedCreateDialog>
  );
}
