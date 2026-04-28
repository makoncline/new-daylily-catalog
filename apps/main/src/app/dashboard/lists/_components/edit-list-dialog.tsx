"use client";

import { reportError } from "@/lib/error-utils";
import {
  ListForm,
  type ListFormHandle,
} from "@/components/forms/list-form";
import { ListFormSkeleton } from "@/components/forms/list-form-skeleton";
import { atom } from "jotai";
import { useAtomDialogSearchParam } from "@/hooks/use-dialog-search-param";
import { ManagedEditDialog } from "@/app/dashboard/_components/managed-edit-dialog";

// Atom for editing state
export const editingListIdAtom = atom<string | null>(null);

export const useEditList = () => {
  const { close, open, value } = useAtomDialogSearchParam({
    atom: editingListIdAtom,
    history: "replace",
    paramName: "editing",
  });

  return {
    editList: (id: string) => {
      open(id);
    },
    closeEditList: () => {
      close();
    },
    editingId: value,
  };
};

export function EditListDialog() {
  const { editingId, closeEditList } = useEditList();

  return (
    <ManagedEditDialog<ListFormHandle>
      contentWrapperClassName="h-[calc(100%-4rem)]"
      description="Make changes to your list here."
      entityId={editingId}
      fallback={<ListFormSkeleton />}
      isOpen={!!editingId}
      onClose={closeEditList}
      onError={(error, errorInfo) =>
        reportError({
          error,
          context: { source: "EditListDialog", errorInfo },
        })
      }
      renderForm={(id, formRef, onClose) => (
        <ListForm formRef={formRef} listId={id} onDelete={onClose} />
      )}
      title="Edit List"
    />
  );
}
