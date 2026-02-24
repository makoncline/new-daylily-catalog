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
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export const useEditList = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const editingId = searchParams.get("editing");

  const setEditingId = (nextEditingId: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextEditingId) {
      params.set("editing", nextEditingId);
    } else {
      params.delete("editing");
    }

    const nextSearch = params.toString();
    if (nextSearch === searchParams.toString()) {
      return;
    }

    const nextUrl = nextSearch ? `${pathname}?${nextSearch}` : pathname;
    router.push(nextUrl);
  };

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

  const handleOpenChange = async (open: boolean) => {
    if (!open) {
      const didSave = await formRef.current?.saveChanges("close");
      if (didSave === false) {
        return;
      }
      closeEditList();
    }
  };

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!formRef.current?.hasPendingChanges()) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (!formRef.current?.hasPendingChanges()) {
        return;
      }

      // eslint-disable-next-line react-hooks/exhaustive-deps
      void formRef.current.saveChanges("navigate");
    };
  }, []);

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
