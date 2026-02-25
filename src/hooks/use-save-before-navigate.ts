"use client";

import { useCallback, useEffect, useRef, type RefObject } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export interface SaveOnNavigateHandle<TReason extends string = "navigate"> {
  hasPendingChanges: () => boolean;
  saveChanges: (reason: TReason) => Promise<boolean>;
}

function currentPath() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

export function useSaveBeforeNavigate<TReason extends string = "navigate">(
  formRef: RefObject<SaveOnNavigateHandle<TReason> | null>,
  navigateReason: TReason,
  enabled = true,
) {
  const router = useRouter();
  const savingRef = useRef<Promise<boolean> | null>(null);

  const saveIfDirty = useCallback(async (): Promise<boolean> => {
    const handle = formRef.current;
    if (!enabled || !handle?.hasPendingChanges()) {
      return true;
    }

    savingRef.current ??= handle.saveChanges(navigateReason).finally(() => {
      savingRef.current = null;
    });

    return savingRef.current;
  }, [enabled, formRef, navigateReason]);

  const attemptNavigate = useCallback(
    async (
      nextPath: string,
      mode: "push" | "replace" = "push",
    ): Promise<boolean> => {
      if (typeof window !== "undefined" && nextPath === currentPath()) {
        return true;
      }

      const hadInFlightSave = savingRef.current !== null;
      const ok = await saveIfDirty();
      if (!ok) {
        if (!hadInFlightSave) {
          toast.error("Fix errors before leaving");
        }
        return false;
      }

      if (mode === "replace") {
        router.replace(nextPath);
      } else {
        router.push(nextPath);
      }

      return true;
    },
    [router, saveIfDirty],
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      const handle = formRef.current;
      if (!handle?.hasPendingChanges()) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    };

    const onClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) {
        return;
      }

      if (anchor.hasAttribute("data-no-nav-guard")) {
        return;
      }

      if (anchor.target && anchor.target !== "_self") {
        return;
      }

      if (anchor.hasAttribute("download")) {
        return;
      }

      const hrefAttribute = anchor.getAttribute("href");
      if (!hrefAttribute || hrefAttribute === "#" || hrefAttribute.startsWith("#")) {
        return;
      }

      const nextUrl = new URL(anchor.href, window.location.href);
      if (nextUrl.origin !== window.location.origin) {
        return;
      }

      if (
        nextUrl.pathname === window.location.pathname &&
        nextUrl.search === window.location.search
      ) {
        return;
      }

      const nextPath = `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;
      if (nextPath === currentPath()) {
        return;
      }

      const handle = formRef.current;
      if (!handle?.hasPendingChanges()) {
        return;
      }

      event.preventDefault();
      void attemptNavigate(nextPath, "push");
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);

    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [attemptNavigate, enabled, formRef]);

  return {
    saveIfDirty,
    attemptNavigate,
  };
}
