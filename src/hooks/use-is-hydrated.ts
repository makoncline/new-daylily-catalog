"use client";

import { useSyncExternalStore } from "react";

function subscribe() {
  return () => undefined;
}

export function useIsHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
