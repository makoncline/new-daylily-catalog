"use client";

import { useEffect } from "react";
import { MainContent } from "@/app/(public)/_components/main-content";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { reportError } from "@/lib/error-utils";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    reportError({ error, errorInfo: { digest: error.digest } });
  }, [error]);

  return (
    <MainContent>
      <EmptyState
        icon={<AlertCircle className="h-12 w-12 text-destructive" />}
        title="Something went wrong!"
        description="There was an error loading this catalog. Please try again later."
        action={
          <div className="flex gap-4">
            <Button onClick={reset}>Try again</Button>
            <Button asChild variant="outline">
              <Link href="/catalogs">Browse Catalogs</Link>
            </Button>
          </div>
        }
      />
    </MainContent>
  );
}
