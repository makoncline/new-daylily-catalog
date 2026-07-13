"use client";

import { useCallback, useEffect, useRef, type RefObject } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export interface SaveOnNavigateHandle<TReason extends string = "navigate"> {
  hasPendingChanges: () => boolean;
  saveChanges: (reason: TReason) => Promise<boolean>;
}

interface BrowserNavigationEvent extends Event {
  canIntercept: boolean;
  downloadRequest: string | null;
  hashChange: boolean;
  navigationType: "push" | "reload" | "replace" | "traverse";
  intercept(options: { precommitHandler: () => Promise<void> }): void;
}

interface BrowserNavigation {
  addEventListener(
    type: "navigate",
    listener: (event: BrowserNavigationEvent) => void,
  ): void;
  removeEventListener(
    type: "navigate",
    listener: (event: BrowserNavigationEvent) => void,
  ): void;
}

function currentPath() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

export function useSaveBeforeNavigate<TReason extends string = "navigate">(
  formRef: RefObject<SaveOnNavigateHandle<TReason> | null>,
  navigateReason: TReason,
  enabled = true,
  guardBrowserHistory = false,
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
      let ok = false;
      try {
        ok = await saveIfDirty();
      } catch {
        ok = false;
      }
      if (!ok) {
        if (!hadInFlightSave) {
          toast.error("Error saving changes. Please fix errors and try again.");
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

    const navigation = (window as unknown as { navigation?: BrowserNavigation })
      .navigation;
    const onNavigate = (event: BrowserNavigationEvent) => {
      if (
        !guardBrowserHistory ||
        !event.canIntercept ||
        !event.cancelable ||
        event.navigationType !== "traverse" ||
        event.hashChange ||
        event.downloadRequest ||
        !formRef.current?.hasPendingChanges()
      ) {
        return;
      }

      event.intercept({
        async precommitHandler() {
          let ok = false;
          try {
            ok = await saveIfDirty();
          } catch {
            ok = false;
          }
          if (!ok) {
            toast.error(
              "Error saving changes. Please fix errors and try again.",
            );
            throw new Error(
              "Navigation blocked because changes could not save",
            );
          }
        },
      });
    };
    // This agent-facing prototype can hold same-document history traversal through
    // Chromium's Navigation API. Cross-document and older-browser traversal retains
    // best-effort saving plus beforeunload; a pushState sentinel destroys Forward history.
    const onPopState = () => {
      if (!navigation && formRef.current?.hasPendingChanges()) {
        void saveIfDirty().catch(() => undefined);
      }
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
      if (
        !hrefAttribute ||
        hrefAttribute === "#" ||
        hrefAttribute.startsWith("#")
      ) {
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
    window.addEventListener("popstate", onPopState);
    navigation?.addEventListener("navigate", onNavigate);
    document.addEventListener("click", onClick, true);

    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("popstate", onPopState);
      navigation?.removeEventListener("navigate", onNavigate);
      document.removeEventListener("click", onClick, true);

      // Next.js client-side route changes keep the document alive, so an
      // in-flight save can finish even after this component unmounts. Full
      // document exits remain protected by beforeunload above.
      void saveIfDirty().catch(() => undefined);
    };
  }, [attemptNavigate, enabled, formRef, guardBrowserHistory, saveIfDirty]);

  return {
    saveIfDirty,
    attemptNavigate,
  };
}
