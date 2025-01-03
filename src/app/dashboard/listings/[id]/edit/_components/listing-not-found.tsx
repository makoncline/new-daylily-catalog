"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";

export function ListingNotFound() {
  return (
    <div className="flex h-[50vh] flex-col items-center justify-center space-y-4">
      <h1 className="text-2xl font-bold">Listing Not Found</h1>
      <p className="text-muted-foreground">
        The listing you are looking for does not exist.
      </p>
      <Button asChild>
        <Link href="/listings">Back to Listings</Link>
      </Button>
    </div>
  );
}
