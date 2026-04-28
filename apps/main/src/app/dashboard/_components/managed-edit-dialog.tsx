"use client";

import {
  Suspense,
  useRef,
  type ErrorInfo,
  type ReactNode,
  type RefObject,
} from "react";
import { ErrorBoundary } from "react-error-boundary";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ErrorFallback } from "@/components/error-fallback";
import {
  useSaveBeforeNavigate,
  type SaveOnNavigateHandle,
} from "@/hooks/use-save-before-navigate";

interface ManagedEditDialogProps<
  THandle extends SaveOnNavigateHandle<"close" | "navigate">,
> {
  contentWrapperClassName?: string;
  description: ReactNode;
  entityId: string | null;
  fallback: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  renderForm: (
    id: string,
    formRef: RefObject<THandle | null>,
    onClose: () => void,
  ) => ReactNode;
  title: string;
}

export function ManagedEditDialog<
  THandle extends SaveOnNavigateHandle<"close" | "navigate">,
>({
  contentWrapperClassName,
  description,
  entityId,
  fallback,
  isOpen,
  onClose,
  onError,
  renderForm,
  title,
}: ManagedEditDialogProps<THandle>) {
  const formRef = useRef<THandle | null>(null);
  useSaveBeforeNavigate(formRef, "navigate", isOpen);

  const handleOpenChange = async (open: boolean) => {
    if (open) {
      return;
    }

    const didSave = await formRef.current?.saveChanges("close");
    if (didSave === false) {
      return;
    }

    onClose();
  };

  const content = entityId ? (
    <ErrorBoundary
      fallback={<ErrorFallback resetErrorBoundary={onClose} />}
      onError={onError}
    >
      <Suspense fallback={fallback}>
        {renderForm(entityId, formRef, onClose)}
      </Suspense>
    </ErrorBoundary>
  ) : null;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {contentWrapperClassName ? (
          <div className={contentWrapperClassName}>{content}</div>
        ) : (
          content
        )}
      </DialogContent>
    </Dialog>
  );
}
