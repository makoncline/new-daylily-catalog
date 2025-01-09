"use client";

import Link from "next/link";

export function TwitterLink() {
  return (
    <Link
      href="https://x.com/makon___"
      target="_blank"
      className="text-sm text-muted-foreground hover:text-foreground"
    >
      @makon___
    </Link>
  );
}
