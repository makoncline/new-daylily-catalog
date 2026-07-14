"use client";

import {
  Fragment,
  Suspense,
  useEffect,
  useRef,
  useState,
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
  guardEntityTransitions?: boolean;
  onClose: () => void;
  onEntityChangeRejected?: (entityId: string) => void;
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
  guardEntityTransitions = false,
  isOpen,
  onClose,
  onEntityChangeRejected,
  onError,
  renderForm,
  title,
}: ManagedEditDialogProps<THandle>) {
  const formRef = useRef<THandle | null>(null);
  const skipNextEntitySaveRef = useRef(false);
  const [guardedEntityId, setGuardedEntityId] = useState(entityId);
  const rejectionHandlerRef = useRef(onEntityChangeRejected);
  const displayedEntityId = guardEntityTransitions ? guardedEntityId : entityId;
  const displayedIsOpen = guardEntityTransitions
    ? Boolean(displayedEntityId)
    : isOpen;
  const { saveIfDirty } = useSaveBeforeNavigate(
    formRef,
    "navigate",
    displayedIsOpen,
    guardEntityTransitions,
  );

  useEffect(() => {
    rejectionHandlerRef.current = onEntityChangeRejected;
  }, [onEntityChangeRejected]);

  useEffect(() => {
    if (!guardEntityTransitions || entityId === guardedEntityId) {
      return;
    }

    if (skipNextEntitySaveRef.current) {
      skipNextEntitySaveRef.current = false;
      setGuardedEntityId(entityId);
      return;
    }

    let cancelled = false;
    void saveIfDirty()
      .then((didSave) => {
        if (cancelled) return;
        if (!didSave) {
          if (guardedEntityId) {
            rejectionHandlerRef.current?.(guardedEntityId);
          }
          return;
        }

        setGuardedEntityId(entityId);
      })
      .catch(() => {
        if (!cancelled && guardedEntityId) {
          rejectionHandlerRef.current?.(guardedEntityId);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [entityId, guardEntityTransitions, guardedEntityId, saveIfDirty]);

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

  const handleEntityDeleted = () => {
    skipNextEntitySaveRef.current = true;
    formRef.current = null;
    onClose();
  };

  const renderedFormContent = displayedEntityId
    // eslint-disable-next-line react-hooks/refs -- renderForm receives the ref and delete callback; it does not invoke either during render.
    ? renderForm(displayedEntityId, formRef, handleEntityDeleted)
    : null;
  const renderedForm = displayedEntityId ? (
    <Fragment key={displayedEntityId}>{renderedFormContent}</Fragment>
  ) : null;
  const content = displayedEntityId ? (
    <ErrorBoundary
      key={displayedEntityId}
      fallback={<ErrorFallback resetErrorBoundary={onClose} />}
      onError={onError}
    >
      <Suspense fallback={fallback}>{renderedForm}</Suspense>
    </ErrorBoundary>
  ) : null;

  return (
    <Dialog open={displayedIsOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        data-managed-edit-entity-id={displayedEntityId ?? undefined}
      >
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
