"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useRef } from "react";
export function AuthHandler() {
  const { userId } = useAuth();
  const previousUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const previousUserId = previousUserIdRef.current;
    previousUserIdRef.current = userId ?? null;

    if (typeof previousUserId === "undefined" || previousUserId === userId) {
      return;
    }

    window.location.reload();
  }, [userId]);

  return null;
}
