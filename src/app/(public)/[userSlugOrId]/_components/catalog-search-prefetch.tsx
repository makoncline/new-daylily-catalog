"use client";

import { useEffect } from "react";
import {
  prefetchAndPersistPublicCatalogSearchSnapshot,
  PUBLIC_CATALOG_SEARCH_PERSISTED_SWR,
} from "@/lib/public-catalog-search-persistence";

interface CatalogSearchPrefetchProps {
  userId: string;
  userSlugOrId: string;
}

function scheduleIdleTask(task: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  if ("requestIdleCallback" in window) {
    const idleId = window.requestIdleCallback(() => {
      task();
    });

    return () => {
      window.cancelIdleCallback(idleId);
    };
  }

  const timeoutId = setTimeout(task, 1200);
  return () => {
    clearTimeout(timeoutId);
  };
}

export function CatalogSearchPrefetch({
  userId,
  userSlugOrId,
}: CatalogSearchPrefetchProps) {
  useEffect(() => {
    if (!PUBLIC_CATALOG_SEARCH_PERSISTED_SWR.enabled) {
      return;
    }

    let cancelled = false;
    const cancelIdleTask = scheduleIdleTask(() => {
      if (cancelled) {
        return;
      }

      void prefetchAndPersistPublicCatalogSearchSnapshot({
        userId,
        userSlugOrId,
      });
    });

    return () => {
      cancelled = true;
      cancelIdleTask();
    };
  }, [userId, userSlugOrId]);

  return null;
}
