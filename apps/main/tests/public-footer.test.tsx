import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { PublicFooter } from "@/components/public-footer";

vi.mock("@/components/seller-intent-link", () => ({
  SellerIntentLink: ({
    children,
    className,
    href = "/start-membership",
  }: {
    children: ReactNode;
    className?: string;
    href?: string;
  }) => (
    <a className={className} href={href}>
      {children}
    </a>
  ),
}));

vi.mock("@/hooks/use-feedback-url", () => ({
  useFeedbackUrl: () =>
    "https://coda.io/form/Ideas-Bugs_dWgu2I2WTqJ?board-slug=daylily-catalog",
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: ReactNode;
    href: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("PublicFooter", () => {
  it("renders a feedback-only bar by default", () => {
    render(<PublicFooter />);

    const feedbackLink = screen.getByRole("link", { name: "Feedback" });
    expect(feedbackLink).toHaveAttribute(
      "href",
      "https://coda.io/form/Ideas-Bugs_dWgu2I2WTqJ?board-slug=daylily-catalog",
    );
    expect(feedbackLink).toHaveClass("text-xs");
    expect(
      screen.queryByText("Browse daylily catalogs created by growers."),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Create your catalog" }),
    ).not.toBeInTheDocument();
  });

  it("can include the existing marketing footer when requested", () => {
    render(<PublicFooter showMarketing />);

    expect(
      screen.getByText("Browse daylily catalogs created by growers."),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Create your catalog" }),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "Feedback" })).toBeVisible();
  });
});
