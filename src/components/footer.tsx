"use client";

import { FeedbackLink } from "@/components/feedback-link";

export function Footer() {
  return (
    <footer className="mt-auto border-t px-4 py-3">
      <div className="container">
        <FeedbackLink />
      </div>
    </footer>
  );
}
