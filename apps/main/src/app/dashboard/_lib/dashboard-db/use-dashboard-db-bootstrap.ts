"use client";

import { useCallback, useEffect, useState } from "react";
import type { DashboardDbStatus } from "@/app/dashboard/_components/dashboard-db-loading-screen";
import {
  bootstrapDashboardDbForUser,
  resetDashboardDbForSignedOutUser,
} from "./dashboard-db-bootstrap";

export interface DashboardDbState {
  status: DashboardDbStatus;
  userId: string | null;
}

export function useDashboardDbBootstrap(args: {
  isError: boolean;
  isLoading: boolean;
  prefetchUserProfile: () => Promise<unknown>;
  userId: string | null;
}) {
  const [state, setState] = useState<DashboardDbState>({
    status: "idle",
    userId: null,
  });
  const [hideLoadingScreen, setHideLoadingScreen] = useState(false);
  const [isExitingLoadingScreen, setIsExitingLoadingScreen] = useState(false);

  const setDashboardDbState = useCallback((nextState: DashboardDbState) => {
    queueMicrotask(() => {
      setState((current) =>
        current.status === nextState.status && current.userId === nextState.userId
          ? current
          : nextState,
      );
    });
  }, []);

  const setLoadingScreenState = useCallback(
    ({ hide, exiting }: { hide: boolean; exiting: boolean }) => {
      queueMicrotask(() => {
        setHideLoadingScreen((current) => (current === hide ? current : hide));
        setIsExitingLoadingScreen((current) =>
          current === exiting ? current : exiting,
        );
      });
    },
    [],
  );

  useEffect(() => {
    if (state.status !== "ready") {
      setLoadingScreenState({ hide: false, exiting: false });
      return;
    }

    setLoadingScreenState({ hide: false, exiting: true });
    const id = window.setTimeout(() => {
      setHideLoadingScreen(true);
    }, 200);

    return () => {
      window.clearTimeout(id);
    };
  }, [setLoadingScreenState, state.status]);

  useEffect(() => {
    if (args.isLoading) {
      setDashboardDbState({ status: "loading", userId: null });
      return;
    }

    if (!args.userId) {
      void resetDashboardDbForSignedOutUser();
      setDashboardDbState({ status: "idle", userId: null });
      return;
    }

    if (args.isError) {
      return;
    }

    let cancelled = false;
    setDashboardDbState({ status: "loading", userId: args.userId });

    void bootstrapDashboardDbForUser({
      prefetchUserProfile: args.prefetchUserProfile,
      userId: args.userId,
    })
      .then(() => {
        if (!cancelled) {
          setDashboardDbState({ status: "ready", userId: args.userId });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDashboardDbState({ status: "error", userId: args.userId });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    args.isError,
    args.isLoading,
    args.prefetchUserProfile,
    args.userId,
    setDashboardDbState,
  ]);

  return {
    hideLoadingScreen,
    isExitingLoadingScreen,
    state,
  };
}

