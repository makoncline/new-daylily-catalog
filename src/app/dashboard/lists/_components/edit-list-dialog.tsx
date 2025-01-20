"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ErrorBoundary } from "react-error-boundary";
import { ErrorFallback } from "@/components/error-fallback";
import { logError } from "@/lib/error-utils";
import { ListForm } from "@/components/forms/list-form";
import { ListFormSkeleton } from "@/components/forms/list-form-skeleton";

export const useEditList = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const params = new URLSearchParams(searchParams);

  const setEditingId = (id: string | null) => {
    if (id) {
      params.set("editing", id);
    } else {
      params.delete("editing");
    }
    router.replace(`?${params.toString()}`);
  };

  const getEditingId = () => searchParams.get("editing");

  return {
    editList: (id: string) => {
      setEditingId(id);
    },
    closeEditList: () => {
      setEditingId(null);
    },
    editingId: getEditingId(),
  };
};

export function EditListDialog() {
  const { editingId, closeEditList } = useEditList();
  const isOpen = !!editingId;

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      closeEditList();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit List</DialogTitle>
          <DialogDescription>Make changes to your list here.</DialogDescription>
        </DialogHeader>

        {editingId && (
          <ErrorBoundary FallbackComponent={ErrorFallback} onError={logError}>
            <Suspense fallback={<ListFormSkeleton />}>
              <ListForm listId={editingId} />
            </Suspense>
          </ErrorBoundary>
        )}
      </DialogContent>
    </Dialog>
  );
}
