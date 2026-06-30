"use client";

import { forwardRef } from "react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { useFeedbackUrl } from "@/hooks/use-feedback-url";

interface PublicFeedbackLinkProps
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  children?: ReactNode;
}

export const PublicFeedbackLink = forwardRef<
  HTMLAnchorElement,
  PublicFeedbackLinkProps
>(function PublicFeedbackLink(
  { children = "Feedback", rel, target = "_blank", ...props },
  ref,
) {
  const feedbackUrl = useFeedbackUrl();
  const externalRel =
    target === "_blank"
      ? [rel, "noopener noreferrer"].filter(Boolean).join(" ")
      : rel;

  return (
    <a href={feedbackUrl} ref={ref} rel={externalRel} target={target} {...props}>
      {children}
    </a>
  );
});
