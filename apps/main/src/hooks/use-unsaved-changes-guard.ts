"use client";

import {
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
} from "react";
import { EditorHistoryContext } from "./editor-history-context";

const LEAVE_MESSAGE =
  "You have unsaved changes. Leave this page and discard them?";

export function useUnsavedChangesGuard(
  hasPendingChanges: () => boolean,
  enabled = true,
) {
  const hasPendingChangesRef = useRef(hasPendingChanges);
  const editorHistory = useContext(EditorHistoryContext);

  useLayoutEffect(() => {
    hasPendingChangesRef.current = hasPendingChanges;
  }, [hasPendingChanges]);
  useLayoutEffect(
    () =>
      editorHistory?.register(() => enabled && hasPendingChangesRef.current()),
    [editorHistory, enabled],
  );

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

    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);

    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [confirmDiscard, enabled]);

  return { confirmDiscard };
}
