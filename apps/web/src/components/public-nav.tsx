"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Flower2 } from "lucide-react";
import { Small } from "@/components/typography";
import { DashboardButton } from "@/components/dashboard-button";

export function PublicdNav() {
  return (
    <nav className="flex w-full items-center justify-between py-3">
      <Link href="/" className="flex items-center gap-2 hover:opacity-90">
        <Flower2 className="h-5 w-5" />
        <Small className="hidden sm:block">Daylily Catalog</Small>
      </Link>

      <div className="flex items-center gap-4">
        <Button variant="ghost" asChild size="sm">
          <Link href="/catalogs">Catalogs</Link>
        </Button>

        <DashboardButton />
      </div>
    </nav>
  );
}
