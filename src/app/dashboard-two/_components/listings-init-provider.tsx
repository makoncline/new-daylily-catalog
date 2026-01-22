"use client";

import React, { createContext, useContext, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { setCurrentUserId } from "@/lib/utils/cursor";
import { initializeListingsCollection } from "@/app/dashboard-two/_lib/listings-collection";
import { initializeListsCollection } from "@/app/dashboard-two/_lib/lists-collection";
import { initializeImagesCollection } from "@/app/dashboard-two/_lib/images-collection";
import { initializeAhsCollection } from "@/app/dashboard-two/_lib/ahs-collection";

type DashboardContextValue = object;

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const { userId } = useAuth();

  // Set current userId for cursor key generation
  useEffect(() => {
    setCurrentUserId(userId ?? null);
  }, [userId]);

  // Initialize the page data in tanstack-db collections
  useEffect(() => {
    if (!userId) return; // Wait for user to be authenticated

    void (async () => {
      const tasks = [
        initializeListingsCollection(userId!),
        initializeListsCollection(userId!),
        initializeImagesCollection(userId!),
        initializeAhsCollection(userId!),
      ];
      const results = await Promise.allSettled(tasks);
      results.forEach((r, i) => {
        if (r.status === "rejected") {
          const name = ["listings", "lists", "images", "AHS"][i];
          console.error(`Failed to initialize ${name} collection:`, r.reason);
        }
      });
    })();
  }, [userId]);

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
