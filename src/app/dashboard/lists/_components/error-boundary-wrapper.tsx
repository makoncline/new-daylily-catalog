"use client";

import { ErrorBoundary } from "react-error-boundary";
import { ErrorFallback } from "@/components/error-fallback";
import { logError } from "@/lib/error-utils";
import { type ReactNode } from "react";

interface ErrorBoundaryWrapperProps {
  children: ReactNode;
}

export function ErrorBoundaryWrapper({ children }: ErrorBoundaryWrapperProps) {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback} onError={logError}>
      {children}
    </ErrorBoundary>
  );
}
