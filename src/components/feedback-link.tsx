"use client";

import Link from "next/link";
import { FEEDBACK_CONFIG } from "@/config/constants";
import { api } from "@/trpc/react";

export function FeedbackLink() {
  const { data: user } = api.user.getCurrentUser.useQuery();

  const feedbackUrl = new URL(FEEDBACK_CONFIG.FORM_URL);
  feedbackUrl.searchParams.set("board-slug", FEEDBACK_CONFIG.BOARD_SLUG);

  if (user) {
    feedbackUrl.searchParams.set("email", user.email);
  }

  return (
    <Link
      href={feedbackUrl.toString()}
      target="_blank"
      className="text-sm text-muted-foreground hover:text-foreground"
    >
      💡 Ideas + 🪲 Bugs
    </Link>
  );
}
