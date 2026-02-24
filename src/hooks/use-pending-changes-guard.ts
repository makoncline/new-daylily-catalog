"use client";

import { useEffect, useRef, type RefObject } from "react";
import {
  useDashboardNavigationGuardContext,
  type PendingChangesGuardHandle,
} from "@/hooks/use-dashboard-navigation-guard";

export type { PendingChangesGuardHandle } from "@/hooks/use-dashboard-navigation-guard";

export function usePendingChangesGuard<TReason extends string>(
  formRef: RefObject<PendingChangesGuardHandle<TReason> | null>,
  navigateReason: TReason,
  enabled = true,
) {
  const navigationGuard = useDashboardNavigationGuardContext();
  const sourceIdRef = useRef(Symbol("pending-changes-source"));

  useEffect(() => {
    if (!navigationGuard) {
      return;
    }

    const sourceId = sourceIdRef.current;

    navigationGuard.registerSource(sourceId, {
      formRef,
      navigateReason,
      enabled,
    });

    return () => {
      navigationGuard.unregisterSource(sourceId);
    };
  }, [enabled, formRef, navigateReason, navigationGuard]);
}
