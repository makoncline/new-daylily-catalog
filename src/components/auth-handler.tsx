"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Component that monitors auth state changes and invalidates
 * the query cache when the user changes to prevent cross-user data leakage
 */
export function AuthHandler() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const previousUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const previousUserId = previousUserIdRef.current;
    previousUserIdRef.current = userId ?? null;

    if (typeof previousUserId === "undefined" || previousUserId === userId) {
      return;
    }

    void (async () => {
      await queryClient.cancelQueries();
      queryClient.removeQueries();
    })();
  }, [userId, queryClient]);

  return null; // This component doesn't render anything
}
