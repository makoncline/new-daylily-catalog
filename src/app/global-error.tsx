"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

const isSentryEnabled = process.env.NEXT_PUBLIC_SENTRY_ENABLED !== "false";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (isSentryEnabled) {
      Sentry.captureException(error);
    }
  }, [error]);

  return (
    <html>
      <body className="bg-background text-foreground">
        <main className="mx-auto flex min-h-screen max-w-lg flex-col items-start justify-center gap-4 px-6">
          <h1 className="text-2xl font-semibold">Something went wrong</h1>
          <p className="text-muted-foreground">
            The page hit an unexpected error. You can try loading it again.
          </p>
          <button
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded px-4 py-2 text-sm font-medium"
            onClick={reset}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
