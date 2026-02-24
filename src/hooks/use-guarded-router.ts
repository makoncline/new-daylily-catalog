"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDashboardNavigationGuardContext } from "@/hooks/use-dashboard-navigation-guard";

function normalizeInternalPath(href: string): string | null {
  const url = new URL(href, window.location.href);
  if (url.origin !== window.location.origin) {
    return null;
  }

  return `${url.pathname}${url.search}${url.hash}`;
}

export function useGuardedRouter() {
  const router = useRouter();
  const navigationGuard = useDashboardNavigationGuardContext();

  const push = useCallback(
    async (href: string): Promise<boolean> => {
      if (typeof window === "undefined") {
        router.push(href);
        return true;
      }

      const nextPath = normalizeInternalPath(href);
      if (!nextPath) {
        window.location.assign(href);
        return true;
      }

      if (!navigationGuard) {
        router.push(nextPath);
        return true;
      }

      return navigationGuard.attemptNavigate(nextPath, "push");
    },
    [navigationGuard, router],
  );

  const replace = useCallback(
    async (href: string): Promise<boolean> => {
      if (typeof window === "undefined") {
        router.replace(href);
        return true;
      }

      const nextPath = normalizeInternalPath(href);
      if (!nextPath) {
        window.location.replace(href);
        return true;
      }

      if (!navigationGuard) {
        router.replace(nextPath);
        return true;
      }

      return navigationGuard.attemptNavigate(nextPath, "replace");
    },
    [navigationGuard, router],
  );

  return { push, replace };
}
