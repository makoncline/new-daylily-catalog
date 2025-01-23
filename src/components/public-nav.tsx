"use client";

import Link from "next/link";
import { SignInButton } from "@clerk/nextjs";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export function PublicdNav() {
  return (
    <div className="flex items-center gap-4">
      <Button variant="ghost" asChild>
        <Link href="/catalogs">Catalogs</Link>
      </Button>

      <SignedIn>
        <Button asChild>
          <Link href="/dashboard">Dashboard</Link>
        </Button>
      </SignedIn>

      <SignedOut>
        <Button asChild>
          <SignInButton mode="modal" forceRedirectUrl="/dashboard">
            Dashboard
          </SignInButton>
        </Button>
      </SignedOut>
    </div>
  );
}
