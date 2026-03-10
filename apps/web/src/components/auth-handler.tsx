"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Component that monitors auth state changes and invalidates
 * the query cache when the user changes to prevent cross-user data leakage
 */
export function AuthHandler() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    // When userId changes (user logs in or out), invalidate all queries
    // This forces fresh data fetches and prevents cross-user contamination
    console.log(`Auth state changed: User ID is now ${userId ?? "none"}`);
    void queryClient.invalidateQueries();
  }, [userId, queryClient]);

  return null; // This component doesn't render anything
}
