"use client";

import Link from "next/link";
import { FeedbackLink } from "@/components/feedback-link";

export function Footer() {
  return (
    <footer className="mt-auto border-t px-4">
      <div className="container flex items-center gap-2 font-mono italic">
        <Link
          href="https://x.com/makon_dev"
          target="_blank"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          by @makon_dev
        </Link>
        <span className="text-sm text-muted-foreground"> - </span>
        <FeedbackLink />
      </div>
    </footer>
  );
}
