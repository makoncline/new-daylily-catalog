"use client";

import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";
import { useEditList } from "./edit-list-dialog";

export function CreateListButton() {
  const { editList } = useEditList();
  const { toast } = useToast();

  const createList = api.list.create.useMutation({
    onError: () => {
      toast({
        title: "Failed to create list",
        variant: "destructive",
      });
    },
  });

  const handleCreate = async () => {
    try {
      const list = await createList.mutateAsync({
        name: "New List",
        intro: "",
      });
      editList(list.id);
    } catch (error) {
      // Error is already handled by the mutation's onError
    }
  };

  return (
    <Button onClick={handleCreate} disabled={createList.isPending}>
      <Plus className="mr-2 h-4 w-4" />
      {createList.isPending ? "Creating..." : "New List"}
    </Button>
  );
}
