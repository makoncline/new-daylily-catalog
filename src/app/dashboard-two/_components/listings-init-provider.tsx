"use client";

import React, { createContext, useContext, useEffect } from "react";
import { initializeListingsCollection } from "@/lib/listings-collection";
import { initializeListsCollection } from "@/lib/lists-collection";

type DashboardContextValue = object;

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  // Initialize the page data in tanstack-db collections
  useEffect(() => {
    void initializeListingsCollection();
    void initializeListsCollection();
  }, []);

  return (
    <DashboardContext.Provider value={{}}>{children}</DashboardContext.Provider>
  );
}

export function useDashboardProvider(): DashboardContextValue {
  const ctx = useContext(DashboardContext);
  if (ctx === null) {
    throw new Error(
      "useDashboardProvider must be used within a DashboardProvider",
    );
  }
  return ctx;
}
