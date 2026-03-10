"use client";

import Link from "next/link";
import { useFeedbackUrl } from "@/hooks/use-feedback-url";

export function FeedbackLink() {
  const feedbackUrl = useFeedbackUrl();
  return (
    <Link
      href={feedbackUrl.toString()}
      target="_blank"
      className="text-sm text-muted-foreground hover:text-foreground"
    >
      Ideas + bugs
    </Link>
  );
}
