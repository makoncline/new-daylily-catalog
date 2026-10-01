"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";
import { usePathname, useSearchParams } from "next/navigation";
import {
  trackDashboardHistory,
  type DashboardEntry,
} from "../_lib/dashboard-history";

interface Traversal {
  source: DashboardEntry;
  target: DashboardEntry | null;
  phase:
    | "target"
    | "restore"
    | "prompt"
    | "leave"
    | "settle"
    | "recovery"
    | "resume";
}
const LEAVE_MESSAGE =
  "You have unsaved changes. Leave this page and discard them?";
interface EditorHistoryActions {
  holdWorkspace: (held: boolean) => void;
  onStart: () => void;
  onStay: () => void;
  onDiscard: () => void;
}

export function useEditorHistory(actions: EditorHistoryActions) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { holdWorkspace } = actions;
  const callbacks = useRef(actions);
  useLayoutEffect(() => {
    callbacks.current = actions;
  });
  const [revision, update] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pendingChanges = useRef<() => boolean>(() => false);
  const traversal = useRef<Traversal | null>(null);
  const tracker = useRef<ReturnType<typeof trackDashboardHistory> | null>(null);
  const deadline = useRef<ReturnType<typeof setTimeout> | null>(null);
  const matches = useCallback(
    (entry: DashboardEntry) => {
      const url = new URL(entry.url);
      const route = `${pathname}${searchParams.size ? `?${searchParams.toString()}` : ""}`;
      return (
        route === url.pathname + url.search &&
        location.hash === url.hash &&
        tracker.current?.current()?.id === entry.id
      );
    },
    [pathname, searchParams],
  );
  const [registration] = useState(() => ({
    register: (callback: () => boolean) => {
      pendingChanges.current = callback;
      return () => {
        pendingChanges.current = () => false;
      };
    },
  }));
  const refresh = useCallback(() => {
    setPending(traversal.current !== null);
    update((value) => value + 1);
  }, []);
  const clearDeadline = useCallback(() => {
    if (deadline.current !== null) clearTimeout(deadline.current);
    deadline.current = null;
  }, []);
  const fail = useCallback(
    (message: string) => {
      clearDeadline();
      if (traversal.current) traversal.current.phase = "recovery";
      setError(message);
      refresh();
    },
    [clearDeadline, refresh],
  );

  const waitForEntry = useCallback(() => {
    clearDeadline();
    deadline.current = setTimeout(
      () =>
        fail(
          "The browser did not return to the requested entry. Your draft is still open. Retry, or discard the draft.",
        ),
      5000,
    );
  }, [clearDeadline, fail]);

  useLayoutEffect(() => {
    tracker.current = trackDashboardHistory((change) => {
      const current = traversal.current;
      if (
        change.type === "before-traverse" &&
        !current &&
        pendingChanges.current() &&
        change.from
      ) {
        callbacks.current.onStart();
        traversal.current = {
          source: change.from,
          target: null,
          phase: "target",
        };
        waitForEntry();
        refresh();
        flushSync(() => holdWorkspace(true));
      } else if (change.type === "replace" && current && change.entry) {
        if (current.source.id === change.entry.id)
          current.source = change.entry;
        if (current.target?.id === change.entry.id)
          current.target = change.entry;
      } else if (
        change.type === "traverse" &&
        (current || pendingChanges.current())
      ) {
        if (!current) {
          if (!change.from) {
            setError(
              "The editor history entry is not known. Keep this draft open.",
            );
            return;
          }
          callbacks.current.onStart();
          traversal.current = {
            source: change.from,
            target: change.entry,
            phase: "target",
          };
          waitForEntry();
          refresh();
          flushSync(() => holdWorkspace(true));
        } else if (
          current.phase === "recovery" &&
          change.entry?.id === current.source.id
        ) {
          waitForEntry();
          current.phase = "resume";
          setError(null);
        } else if (
          current.phase === "restore" &&
          change.entry?.id === current.source.id
        ) {
          current.phase = "prompt";
          setError(null);
        } else if (
          current.phase === "leave" &&
          change.entry?.id === current.target?.id
        ) {
          current.phase = "settle";
        } else {
          waitForEntry();
          current.target = change.entry;
          current.phase = "target";
        }
        if (!change.entry)
          fail(
            "This history entry is not tracked. Use browser history to return to the editor, or discard the draft here.",
          );
      } else if (change.type === "traverse" && !change.entry) {
        tracker.current?.startTrackingHere();
      }
      refresh();
    });
    return () => {
      clearDeadline();
      tracker.current?.stop();
      tracker.current = null;
      holdWorkspace(false);
    };
  }, [holdWorkspace, clearDeadline, fail, waitForEntry, refresh]);

  useEffect(() => {
    const transaction = traversal.current;
    if (!transaction) return;
    const move = (target: DashboardEntry, phase: "restore" | "leave") => {
      waitForEntry();
      if (tracker.current?.current()?.id === target.id) {
        transaction.phase = phase === "restore" ? "prompt" : "settle";
        refresh();
        return;
      }
      transaction.phase = phase;
      refresh();
      try {
        tracker.current?.goTo(target);
      } catch (cause) {
        fail(
          cause instanceof Error
            ? cause.message
            : "Could not move to the requested history entry.",
        );
      }
    };
    if (
      transaction.phase === "target" &&
      transaction.target &&
      matches(transaction.target)
    ) {
      move(transaction.source, "restore");
    } else if (transaction.phase === "prompt" && matches(transaction.source)) {
      clearDeadline();
      const frame = requestAnimationFrame(() => {
        if (
          traversal.current !== transaction ||
          transaction.phase !== "prompt" ||
          !matches(transaction.source)
        )
          return;
        if (!window.confirm(LEAVE_MESSAGE)) {
          traversal.current = null;
          holdWorkspace(false);
          callbacks.current.onStay();
          refresh();
        } else if (transaction.target) move(transaction.target, "leave");
      });
      return () => cancelAnimationFrame(frame);
    } else if (
      transaction.phase === "settle" &&
      transaction.target &&
      matches(transaction.target)
    ) {
      clearDeadline();
      traversal.current = null;
      callbacks.current.onDiscard();
      holdWorkspace(false);
      refresh();
    } else if (transaction.phase === "resume" && matches(transaction.source)) {
      clearDeadline();
      traversal.current = null;
      holdWorkspace(false);
      callbacks.current.onStay();
      refresh();
    }
  }, [
    pathname,
    searchParams,
    revision,
    holdWorkspace,
    clearDeadline,
    fail,
    matches,
    waitForEntry,
    refresh,
  ]);

  return {
    registration,
    pending,
    error,
    retry: () => {
      const current = traversal.current;
      if (!current) {
        setError(null);
        return;
      }
      if (!tracker.current?.current()) {
        setError(
          "Use browser history to return to the editor. The current entry has no recorded position.",
        );
        return;
      }
      if (matches(current.source)) {
        traversal.current = null;
        holdWorkspace(false);
        setError(null);
        callbacks.current.onStay();
        refresh();
        return;
      }
      if (tracker.current.current()?.id === current.source.id) {
        setError(
          "History returned to the editor, but its route is not ready. Keep the draft open and try browser Back and Forward.",
        );
        return;
      }
      setError(null);
      current.phase = "target";
      current.target = tracker.current.current();
      waitForEntry();
      refresh();
    },
    discard: () => {
      clearDeadline();
      traversal.current = null;
      holdWorkspace(false);
      if (!tracker.current?.current()) tracker.current?.startTrackingHere();
      setError(null);
      callbacks.current.onDiscard();
      refresh();
    },
  };
}
