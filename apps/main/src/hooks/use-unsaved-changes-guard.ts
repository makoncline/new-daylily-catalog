"use client";

import { useCallback, useEffect, useRef } from "react";

const LEAVE_MESSAGE =
  "You have unsaved changes. Leave this page and discard them?";

export function useUnsavedChangesGuard(
  hasPendingChanges: () => boolean,
  enabled = true,
) {
  const hasPendingChangesRef = useRef(hasPendingChanges);

  useEffect(() => {
    hasPendingChangesRef.current = hasPendingChanges;
  }, [hasPendingChanges]);

  const confirmDiscard = useCallback(() => {
    return (
      !enabled ||
      !hasPendingChangesRef.current() ||
      window.confirm(LEAVE_MESSAGE)
    );
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let isRestoringHistory = false;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasPendingChangesRef.current()) {
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
      const anchor =
        target instanceof Element ? target.closest("a[href]") : null;
      if (!(anchor instanceof HTMLAnchorElement)) {
        return;
      }

      if (
        (anchor.target && anchor.target !== "_self") ||
        anchor.hasAttribute("download")
      ) {
        return;
      }

      const nextUrl = new URL(anchor.href, window.location.href);
      if (
        nextUrl.origin !== window.location.origin ||
        nextUrl.href === window.location.href
      ) {
        return;
      }

      if (!confirmDiscard()) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    const onPopState = () => {
      if (isRestoringHistory) {
        isRestoringHistory = false;
        return;
      }

      if (!hasPendingChangesRef.current() || window.confirm(LEAVE_MESSAGE)) {
        return;
      }

      isRestoringHistory = true;
      window.history.forward();
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("popstate", onPopState);
    document.addEventListener("click", onClick, true);

    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("popstate", onPopState);
      document.removeEventListener("click", onClick, true);
    };
  }, [confirmDiscard, enabled]);

  return { confirmDiscard };
}
