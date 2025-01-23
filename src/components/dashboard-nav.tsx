"use client";

import Link from "next/link";
import { SignInButton } from "@clerk/nextjs";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export function DashboardNav() {
  return (
    <div>
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
