"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { P } from "@/components/typography";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useSetAtom } from "jotai";
import { editingListIdAtom } from "./edit-list-dialog";
import { normalizeError, reportError } from "@/lib/error-utils";
import { insertList } from "@/app/dashboard/_lib/dashboard-db/lists-collection";

export function CreateListDialog({
  onOpenChange,
}: {
  onOpenChange: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(true);
  const [title, setTitle] = useState("");
  const [isPending, setIsPending] = useState(false);

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

      setOpen(false);
      onOpenChange(false);
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

  const handleCancel = () => {
    setOpen(false);
    onOpenChange(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      onOpenChange(newOpen);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="top-[20%] sm:top-[30%]">
        <DialogHeader>
          <DialogTitle>Create New List</DialogTitle>
          <P className="text-muted-foreground text-sm">
            Create a new list to organize your daylilies.
          </P>
        </DialogHeader>

        <div className="space-y-4 py-4">
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isPending || !title.trim()}>
            Create List
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
