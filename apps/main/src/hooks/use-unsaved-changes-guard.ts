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

    // Navigate runs before popstate and before the router removes this editor.
    // TypeScript 5.9 does not declare Window.navigation yet.
    const navigation = (window as Window & { navigation?: EventTarget })
      .navigation;
    const onNavigate = (event: Event) => {
      if (
        (event as Event & { navigationType: string }).navigationType !==
          "traverse" ||
        !event.cancelable
      )
        return;
      if (!confirmDiscard()) event.preventDefault();
    };
    navigation?.addEventListener("navigate", onNavigate);

    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);

    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      navigation?.removeEventListener("navigate", onNavigate);
      document.removeEventListener("click", onClick, true);
    };
  }, [confirmDiscard, enabled]);

  return { confirmDiscard };
}
