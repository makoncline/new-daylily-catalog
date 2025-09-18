"use client";

import React, { createContext, useContext, useEffect } from "react";
import { initializeListingsCollection } from "@/app/dashboard-two/_lib/listings-collection";
import { initializeListsCollection } from "@/app/dashboard-two/_lib/lists-collection";
import { initializeImagesCollection } from "@/app/dashboard-two/_lib/images-collection";
import { initializeAhsCollection } from "@/app/dashboard-two/_lib/ahs-collection";

type DashboardContextValue = object;

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  // Initialize the page data in tanstack-db collections
  useEffect(() => {
    void initializeListingsCollection();
    void initializeListsCollection();
    void initializeImagesCollection();
    void initializeAhsCollection();
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
