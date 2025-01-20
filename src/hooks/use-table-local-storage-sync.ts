"use client";

import * as React from "react";
import { type VisibilityState } from "@tanstack/react-table";
import { z } from "zod";

const localStorageStateSchema = z.object({
  columnVisibility: z.record(z.boolean()).optional(),
  columnOrder: z.array(z.string()).optional(),
});

export function useLocalStorageInitialTableState({
  storageKey,
}: {
  storageKey: string;
}) {
  const [state] = React.useState(() => {
    if (typeof window === "undefined") return {};

    const item = localStorage.getItem(`table-state-${storageKey}`);
    if (!item) return {};

    const data = JSON.parse(item) as unknown;
    const parsed = localStorageStateSchema.safeParse(data);
    if (!parsed.success) {
      console.error("Invalid table state in localStorage", parsed.error);
      return {};
    }
    return parsed.data;
  });

  return {
    columnVisibility: state.columnVisibility,
    columnOrder: state.columnOrder,
    meta: {
      storageKey,
    },
  };
}

export function useTableLocalStorageSync(state: {
  columnVisibility: VisibilityState;
  columnOrder: string[];
  meta?: {
    storageKey?: string;
  };
}) {
  React.useEffect(() => {
    if (!state.meta?.storageKey) return;

    const data = {
      columnVisibility: state.columnVisibility,
      columnOrder: state.columnOrder,
    };
    const parsed = localStorageStateSchema.safeParse(data);
    if (!parsed.success) {
      console.error("Invalid table state in localStorage", parsed.error);
      return;
    }

    localStorage.setItem(
      `table-state-${state.meta.storageKey}`,
      JSON.stringify(parsed.data),
    );
  }, [state.columnVisibility, state.columnOrder, state.meta?.storageKey]);
}
