"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ErrorBoundary } from "react-error-boundary";
import { ErrorFallback } from "@/components/error-fallback";
import { reportError } from "@/lib/error-utils";
import {
  ListForm,
  type ListFormHandle,
} from "@/components/forms/list-form";
import { ListFormSkeleton } from "@/components/forms/list-form-skeleton";
import { useRef, useEffect, Suspense } from "react";
import { atom, useAtom } from "jotai";
import { useRouter, useSearchParams } from "next/navigation";
import { useSaveBeforeNavigate } from "@/hooks/use-save-before-navigate";

// Atom for editing state
export const editingListIdAtom = atom<string | null>(null);

export const useEditList = () => {
  const [editingId, setEditingId] = useAtom(editingListIdAtom);
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasInitialized = useRef(false);

  // Sync atom state to URL for persistence
  useEffect(() => {
    if (!hasInitialized.current) {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());

    if (editingId) {
      params.set("editing", editingId);
    } else {
      params.delete("editing");
    }

    const newUrl = `?${params.toString()}`;
    const currentUrl = searchParams.toString()
      ? `?${searchParams.toString()}`
      : "";

    if (newUrl !== currentUrl) {
      router.push(newUrl);
    }
  }, [editingId, router, searchParams]);

  // Initialize from URL on first load
  useEffect(() => {
    if (hasInitialized.current) {
      return;
    }

    const urlEditingId = searchParams.get("editing");
    if (urlEditingId) {
      setEditingId(urlEditingId);
    }

    hasInitialized.current = true;
  }, [searchParams, setEditingId]);

  return {
    editList: (id: string) => {
      setEditingId(id);
    },
    closeEditList: () => {
      setEditingId(null);
    },
    editingId,
  };
};

export function EditListDialog() {
  const { editingId, closeEditList } = useEditList();
  const formRef = useRef<ListFormHandle | null>(null);
  const isOpen = !!editingId;
  useSaveBeforeNavigate(formRef, "navigate", isOpen);

  const handleOpenChange = async (open: boolean) => {
    if (!open) {
      // Save any pending changes before closing
      const didSave = await formRef.current?.saveChanges("close");
      if (didSave === false) {
        return;
      }
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

        <div className="h-[calc(100%-4rem)]">
          {editingId && (
            <ErrorBoundary
              fallback={<ErrorFallback resetErrorBoundary={closeEditList} />}
              onError={(error, errorInfo) =>
                reportError({
                  error,
                  context: { source: "EditListDialog", errorInfo },
                })
              }
            >
              <Suspense fallback={<ListFormSkeleton />}>
                <ListForm
                  formRef={formRef}
                  listId={editingId}
                  onDelete={closeEditList}
                />
              </Suspense>
            </ErrorBoundary>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
