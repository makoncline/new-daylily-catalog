"use client";

import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/error-utils";
import { useFeedbackUrl } from "@/hooks/use-feedback-url";

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary?: () => void;
  className?: string;
}

export function ErrorFallback({
  error,
  resetErrorBoundary,
  className = "",
}: ErrorFallbackProps) {
  const feedbackUrl = useFeedbackUrl();

  return (
    <div
      className={`flex min-h-[300px] w-full flex-col items-center justify-center gap-6 p-8 text-center ${className}`}
    >
      <div className="space-y-4">
        <h1 className="text-4xl font-bold">Oops, something went wrong!</h1>
        <p className="mx-auto max-w-md text-lg text-muted-foreground">
          We're sorry, but an unexpected error has occurred.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {resetErrorBoundary && (
          <Button variant="default" size="lg" onClick={resetErrorBoundary}>
            Try Again
          </Button>
        )}

        <Button
          variant="link"
          className="text-sm text-muted-foreground hover:text-foreground"
          asChild
        >
          <a href={feedbackUrl} target="_blank" rel="noopener noreferrer">
            Report this issue
          </a>
        </Button>
      </div>
    </div>
  );
}
