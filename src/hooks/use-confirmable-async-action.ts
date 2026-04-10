"use client";

import { useCallback, useRef, useState } from "react";

interface UseConfirmableAsyncActionOptions {
  action: () => Promise<void>;
  onError?: (error: unknown) => void;
  onSuccess?: () => void;
}

export function useConfirmableAsyncAction({
  action,
  onError,
  onSuccess,
}: UseConfirmableAsyncActionOptions) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const isPendingRef = useRef(false);

  const openDialog = useCallback(() => {
    setIsDialogOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setIsDialogOpen(false);
  }, []);

  const runAction = useCallback(async () => {
    if (isPendingRef.current) {
      return false;
    }

    isPendingRef.current = true;
    setIsPending(true);

    try {
      await action();
      setIsDialogOpen(false);
      onSuccess?.();
      return true;
    } catch (error) {
      onError?.(error);
      return false;
    } finally {
      isPendingRef.current = false;
      setIsPending(false);
    }
  }, [action, onError, onSuccess]);

  return {
    closeDialog,
    isDialogOpen,
    isPending,
    openDialog,
    runAction,
    setIsDialogOpen,
  };
}
