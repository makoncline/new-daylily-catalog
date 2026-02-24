"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";
import { useRouter } from "next/navigation";

export interface PendingChangesGuardHandle<TReason extends string = string> {
  hasPendingChanges: () => boolean;
  saveChanges: (reason: TReason) => Promise<boolean>;
}

interface PendingChangesSource<TReason extends string = string> {
  formRef: RefObject<PendingChangesGuardHandle<TReason> | null>;
  navigateReason: TReason;
  enabled: boolean;
}

interface PendingChangesSourceInternal {
  formRef: RefObject<PendingChangesGuardHandle<string> | null>;
  navigateReason: string;
  enabled: boolean;
  priority: number;
}

interface NavigationRequest {
  path: string;
  mode: "push" | "replace";
}

interface DashboardNavigationGuardContextValue {
  registerSource: <TReason extends string>(
    id: symbol,
    source: PendingChangesSource<TReason>,
  ) => void;
  unregisterSource: (id: symbol) => void;
  attemptNavigate: (
    nextPath: string,
    mode?: "push" | "replace",
  ) => Promise<boolean>;
  hasPendingChanges: () => boolean;
}

const DashboardNavigationGuardContext =
  createContext<DashboardNavigationGuardContextValue | null>(null);

function getCurrentPath() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

export function DashboardNavigationGuardProvider({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const sourcesRef = useRef<Map<symbol, PendingChangesSourceInternal>>(new Map());
  const sourcePriorityRef = useRef(0);
  const isHandlingNavigationRef = useRef(false);
  const queuedRequestRef = useRef<NavigationRequest | null>(null);

  const getActiveSource = useCallback((): PendingChangesSourceInternal | null => {
    let activeSource: PendingChangesSourceInternal | null = null;

    for (const source of sourcesRef.current.values()) {
      if (!source.enabled) {
        continue;
      }

      if (!source.formRef.current) {
        continue;
      }

      if (!activeSource || source.priority > activeSource.priority) {
        activeSource = source;
      }
    }

    return activeSource;
  }, []);

  const hasPendingChanges = useCallback(() => {
    const activeSource = getActiveSource();
    const handle = activeSource?.formRef.current;

    if (!handle) {
      return false;
    }

    return handle.hasPendingChanges();
  }, [getActiveSource]);

  const registerSource = useCallback(
    <TReason extends string>(
      id: symbol,
      source: PendingChangesSource<TReason>,
    ) => {
      const existing = sourcesRef.current.get(id);

      let priority = existing?.priority ?? 0;
      if (!existing || (source.enabled && !existing.enabled)) {
        priority = ++sourcePriorityRef.current;
      }
      if (priority === 0) {
        priority = ++sourcePriorityRef.current;
      }

      sourcesRef.current.set(id, {
        formRef:
          source.formRef as RefObject<PendingChangesGuardHandle<string> | null>,
        navigateReason: source.navigateReason,
        enabled: source.enabled,
        priority,
      });
    },
    [],
  );

  const unregisterSource = useCallback((id: symbol) => {
    sourcesRef.current.delete(id);
  }, []);

  const attemptNavigate = useCallback(
    async (
      nextPath: string,
      mode: "push" | "replace" = "push",
    ): Promise<boolean> => {
      const initialRequest: NavigationRequest = { path: nextPath, mode };

      if (typeof window !== "undefined" && initialRequest.path === getCurrentPath()) {
        return true;
      }

      if (isHandlingNavigationRef.current) {
        queuedRequestRef.current = initialRequest;
        return true;
      }

      let currentRequest = initialRequest;
      isHandlingNavigationRef.current = true;

      try {
        while (true) {
          const activeSource = getActiveSource();
          const handle = activeSource?.formRef.current;

          if (activeSource && handle?.hasPendingChanges()) {
            const didSave = await handle.saveChanges(activeSource.navigateReason);
            if (didSave === false) {
              queuedRequestRef.current = null;
              return false;
            }
          }

          const queuedRequest = queuedRequestRef.current;
          if (queuedRequest) {
            currentRequest = queuedRequest;
            queuedRequestRef.current = null;
            continue;
          }

          if (
            typeof window !== "undefined" &&
            currentRequest.path === getCurrentPath()
          ) {
            return true;
          }

          if (currentRequest.mode === "replace") {
            router.replace(currentRequest.path);
          } else {
            router.push(currentRequest.path);
          }

          return true;
        }
      } finally {
        isHandlingNavigationRef.current = false;
      }
    },
    [getActiveSource, router],
  );

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasPendingChanges()) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasPendingChanges]);

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
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

      const eventTarget = event.target;
      if (!(eventTarget instanceof Element)) {
        return;
      }

      const anchor = eventTarget.closest("a[href]");
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
      if (nextPath === getCurrentPath()) {
        return;
      }

      if (isHandlingNavigationRef.current) {
        event.preventDefault();
        void attemptNavigate(nextPath, "push");
        return;
      }

      if (!hasPendingChanges()) {
        return;
      }

      event.preventDefault();
      void attemptNavigate(nextPath, "push");
    };

    document.addEventListener("click", handleDocumentClick, true);
    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, [attemptNavigate, hasPendingChanges]);

  const contextValue = useMemo<DashboardNavigationGuardContextValue>(
    () => ({
      registerSource,
      unregisterSource,
      attemptNavigate,
      hasPendingChanges,
    }),
    [attemptNavigate, hasPendingChanges, registerSource, unregisterSource],
  );

  return (
    <DashboardNavigationGuardContext.Provider value={contextValue}>
      {children}
    </DashboardNavigationGuardContext.Provider>
  );
}

export function useDashboardNavigationGuardContext() {
  return useContext(DashboardNavigationGuardContext);
}

export function useDashboardNavigationGuard() {
  const context = useDashboardNavigationGuardContext();
  if (!context) {
    throw new Error(
      "useDashboardNavigationGuard must be used within DashboardNavigationGuardProvider",
    );
  }
  return context;
}
