"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center p-4 py-16 text-center">
      <div className="mx-auto max-w-md space-y-6 rounded-lg border bg-card p-8 shadow-sm">
        <h1 className="text-3xl font-bold">Page Not Found</h1>

        <div className="space-y-4">
          <p className="text-muted-foreground">
            We couldn&apos;t find the page you were looking for. It might have
            been moved or does not exist.
          </p>
          <div className="flex flex-col justify-center pt-4">
            <Button asChild size="lg">
              <Link href="/">Return Home</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
