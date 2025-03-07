"use client";

import { AuthHandler } from "@/components/auth-handler";
import { type ReactNode, useEffect } from "react";

interface DashboardClientWrapperProps {
  children: ReactNode;
}

/**
 * Client-side wrapper for dashboard content
 * Includes the AuthHandler to manage query invalidation on auth state changes
 */
export function DashboardClientWrapper({
  children,
}: DashboardClientWrapperProps) {
  // Log when this component renders to help with debugging
  useEffect(() => {
    console.log("DashboardClientWrapper mounted - Auth monitoring active");
  }, []);

  return (
    <>
      {/* AuthHandler monitors user authentication state */}
      <AuthHandler />

      {/* Dashboard content */}
      {children}
    </>
  );
}
