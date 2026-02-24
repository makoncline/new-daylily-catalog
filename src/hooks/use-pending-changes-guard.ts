"use client";

import { useEffect, type RefObject } from "react";

interface PendingChangesGuardHandle<TReason extends string> {
  hasPendingChanges: () => boolean;
  saveChanges: (reason: TReason) => Promise<boolean>;
}

export function usePendingChangesGuard<TReason extends string>(
  formRef: RefObject<PendingChangesGuardHandle<TReason> | null>,
  navigateReason: TReason,
) {
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
  }, [formRef]);

  useEffect(() => {
    return () => {
      if (!formRef.current?.hasPendingChanges()) {
        return;
      }

      // eslint-disable-next-line react-hooks/exhaustive-deps
      void formRef.current.saveChanges(navigateReason);
    };
  }, [formRef, navigateReason]);
}
