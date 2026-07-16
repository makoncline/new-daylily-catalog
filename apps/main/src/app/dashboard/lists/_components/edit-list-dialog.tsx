"use client";

import { ListForm, type ListFormHandle } from "@/components/forms/list-form";
import { ListFormSkeleton } from "@/components/forms/list-form-skeleton";
import { ArrowLeft } from "lucide-react";
import {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { ErrorBoundary } from "react-error-boundary";
import { useQueryParamDialogState } from "@/hooks/use-dialog-search-param";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";
import { Button } from "@/components/ui/button";
import { ErrorFallback } from "@/components/error-fallback";
import { PageHeader } from "@/components/page-header";
import { ListingSurfaceSaveBar } from "../../listings/_components/listing-surface-save-bar";
import { reportError } from "@/lib/error-utils";

export const useEditList = () => {
  const { setValue, value } = useQueryParamDialogState({
    history: "push",
    paramName: "editing",
    scroll: false,
  });
  const [optimisticEditing, setOptimisticEditing] = useState<{
    from: string | null;
    to: string | null;
  } | null>(null);

  const editingId =
    optimisticEditing?.from === value ? optimisticEditing.to : value;

  useEffect(() => {
    if (optimisticEditing?.to !== value) {
      return;
    }

    const timeout = window.setTimeout(() => setOptimisticEditing(null), 0);
    return () => window.clearTimeout(timeout);
  }, [optimisticEditing, value]);

  return {
    editList: (id: string) => {
      setOptimisticEditing({ from: value, to: id });
      setValue(id);
    },
    closeEditList: () => {
      setOptimisticEditing({ from: editingId, to: null });
      setValue(null, "replace");
    },
    editingId,
  };
};

export function EditListSurface({
  listId,
  onClose,
}: {
  listId: string;
  onClose: () => void;
}) {
  const formRef = useRef<ListFormHandle | null>(null);
  const backButtonRef = useRef<HTMLButtonElement | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const hasPendingChanges = useCallback(
    () => formRef.current?.hasPendingChanges() ?? false,
    [],
  );
  const { confirmDiscard } = useUnsavedChangesGuard(hasPendingChanges);

  const handleBack = () => {
    if (confirmDiscard()) {
      onClose();
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await formRef.current?.saveChanges("manual");
    } finally {
      setIsSaving(false);
    }
  };

  useLayoutEffect(() => {
    backButtonRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <section aria-label="Edit list" className="mx-auto w-full max-w-3xl pb-8">
      {isDirty ? (
        <ListingSurfaceSaveBar
          title="Unsaved list"
          saveLabel="Save"
          isSaving={isSaving}
          saveDisabled={false}
          onDiscard={onClose}
          onSave={() => void handleSave()}
        />
      ) : null}

      <PageHeader heading="Edit List" text="Make changes to your list.">
        <Button
          ref={backButtonRef}
          type="button"
          variant="outline"
          onClick={handleBack}
        >
          <ArrowLeft aria-hidden="true" />
          Back to lists
        </Button>
      </PageHeader>

      <ErrorBoundary
        fallback={<ErrorFallback resetErrorBoundary={onClose} />}
        onError={(error, errorInfo) =>
          reportError({
            error,
            context: { source: "EditListSurface", errorInfo },
          })
        }
      >
        <Suspense fallback={<ListFormSkeleton />}>
          <ListForm
            formRef={formRef}
            listId={listId}
            onDelete={onClose}
            onSave={onClose}
            onPendingChangesChange={setIsDirty}
          />
        </Suspense>
      </ErrorBoundary>
    </section>
  );
}
