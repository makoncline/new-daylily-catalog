"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { useToast } from "@/hooks/use-toast";
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

export function CreateListDialog({
  onOpenChange,
}: {
  onOpenChange: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(true);
  const [title, setTitle] = useState("");
  const [isPending, setIsPending] = useState(false);
  const { toast } = useToast();
  const setEditingId = useSetAtom(editingListIdAtom);

  const createListMutation = api.list.create.useMutation({
    onSuccess: (newList) => {
      toast({
        title: "List created",
        description: `${newList.title} has been created.`,
      });

      // Close dialog
      setOpen(false);
      onOpenChange(false);

      // Open edit dialog
      setEditingId(newList.id);
    },
    onError: (error) => {
      toast({
        title: "Failed to create list",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreate = async () => {
    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a title for your list.",
        variant: "destructive",
      });
      return;
    }

    setIsPending(true);
    try {
      await createListMutation.mutateAsync({
        title: title.trim(),
        description: "",
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
          <P className="text-sm text-muted-foreground">
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
