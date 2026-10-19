"use client";

import { createContext } from "react";

export const EditorHistoryContext = createContext<{
  register: (hasPendingChanges: () => boolean) => () => void;
} | null>(null);
