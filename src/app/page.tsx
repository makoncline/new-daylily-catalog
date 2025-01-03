"use client";

import Link from "next/link";
import { SignInButton, SignedIn, SignedOut } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-4xl font-bold">Daylily Catalog</h1>
      <p className="mt-2 text-muted-foreground">
        Build and manage your online daylily presence
      </p>
      <div className="mt-8">
        <SignedIn>
          <Button asChild>
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </SignedIn>
        <SignedOut>
          <Button>
            <SignInButton mode="modal" />
          </Button>
        </SignedOut>
      </div>
    </div>
  );
}
