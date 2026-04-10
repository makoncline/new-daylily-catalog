"use client";

import { useCallback, useEffect, useMemo, useRef, type RefObject } from "react";

export interface ManagedFormSaveHandle<TReason extends string = string> {
  hasPendingChanges: () => boolean;
  saveChanges: (reason: TReason) => Promise<boolean>;
}

interface UseManagedFormSaveArgs<
  TReason extends string,
  THandle extends
    ManagedFormSaveHandle<TReason> = ManagedFormSaveHandle<TReason>,
> {
  formRef?: RefObject<THandle | null>;
  hasPendingChanges: () => boolean;
  save: (reason: TReason) => Promise<boolean>;
  createHandle?: (baseHandle: ManagedFormSaveHandle<TReason>) => THandle;
}

export function useManagedFormSave<
  TReason extends string,
  THandle extends
    ManagedFormSaveHandle<TReason> = ManagedFormSaveHandle<TReason>,
>({
  formRef,
  hasPendingChanges,
  save,
  createHandle,
}: UseManagedFormSaveArgs<TReason, THandle>) {
  const inFlightSaveRef = useRef<Promise<boolean> | null>(null);

  const saveChanges = useCallback(
    async (reason: TReason): Promise<boolean> => {
      if (inFlightSaveRef.current) {
        return inFlightSaveRef.current;
      }

      if (!hasPendingChanges()) {
        return true;
      }

      const savePromise = save(reason);
      inFlightSaveRef.current = savePromise;

      try {
        return await savePromise;
      } finally {
        if (inFlightSaveRef.current === savePromise) {
          inFlightSaveRef.current = null;
        }
      }
    },
    [hasPendingChanges, save],
  );

  const baseHandle = useMemo<ManagedFormSaveHandle<TReason>>(
    () => ({
      hasPendingChanges,
      saveChanges,
    }),
    [hasPendingChanges, saveChanges],
  );

  const handle = useMemo(() => {
    if (createHandle) {
      return createHandle(baseHandle);
    }

    return baseHandle as THandle;
  }, [baseHandle, createHandle]);

  useEffect(() => {
    if (!formRef) {
      return;
    }

    formRef.current = handle;
  }, [formRef, handle]);

  return {
    handle,
    saveChanges,
  };
}
