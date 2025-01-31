"use client";

import Link from "next/link";
import { SignInButton } from "@clerk/nextjs";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { Flower2 } from "lucide-react";
import { Muted, Small } from "@/components/typography";

function DashboardButton({ className }: { className?: string }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const text = "Dashboard";

  if (!isMounted) {
    return (
      <Button className={className} disabled>
        {text}
      </Button>
    );
  }

  return (
    <Button className={className} asChild>
      <div>
        <SignedIn>
          <Link href="/dashboard">{text}</Link>
        </SignedIn>
        <SignedOut>
          <SignInButton mode="modal" forceRedirectUrl="/dashboard">
            {text}
          </SignInButton>
        </SignedOut>
      </div>
    </Button>
  );
}

export function PublicdNav() {
  return (
    <nav className="flex w-full items-center justify-between px-4 py-3">
      <Link href="/" className="flex items-center gap-2 hover:opacity-90">
        <Flower2 className="h-5 w-5" />
        <Small>Daylily Catalog</Small>
      </Link>

      <div className="flex items-center gap-4">
        <Button variant="ghost" asChild>
          <Link href="/catalogs">Catalogs</Link>
        </Button>

        <DashboardButton />
      </div>
    </nav>
  );
}
