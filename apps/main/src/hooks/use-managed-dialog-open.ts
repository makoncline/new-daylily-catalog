"use client";

import { useCallback, useState } from "react";

export function useManagedDialogOpen(onOpenChange: (open: boolean) => void) {
  const [open, setOpen] = useState(true);

  const closeDialog = useCallback(() => {
    setOpen(false);
    onOpenChange(false);
  }, [onOpenChange]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);

      if (!nextOpen) {
        onOpenChange(false);
      }
    },
    [onOpenChange],
  );

  return {
    closeDialog,
    handleOpenChange,
    open,
  };
}
