"use client";

import { Button } from "@/components/ui/button";
import { useFeedbackUrl } from "@/hooks/use-feedback-url";
import { H1, P } from "@/components/typography";
import type { FallbackProps } from "react-error-boundary";

interface ErrorFallbackProps extends Partial<FallbackProps> {
  className?: string;
}

export function ErrorFallback({
  resetErrorBoundary,
  className = "",
}: ErrorFallbackProps) {
  const feedbackUrl = useFeedbackUrl();

  return (
    <div
      className={`flex min-h-[300px] w-full flex-col items-center justify-center gap-6 p-8 text-center ${className}`}
    >
      <div className="space-y-4">
        <H1 className="text-4xl">Oops, something went wrong!</H1>
        <P className="mx-auto max-w-md text-lg text-muted-foreground">
          We&apos;re sorry, but an unexpected error has occurred.
        </P>
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
