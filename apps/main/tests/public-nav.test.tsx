import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { PublicNav } from "@/components/public-nav";

vi.mock("next/navigation", () => ({
  usePathname: () => "/catalogs",
}));

vi.mock("@/components/dashboard-button", () => ({
  DashboardButton: ({ className }: { className?: string }) => (
    <a className={className} href="/dashboard">
      Dashboard
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

describe("PublicNav", () => {
  it("includes feedback links for public pages", () => {
    render(<PublicNav />);

    const feedbackLinks = screen.getAllByRole("link", { name: "Feedback" });
    expect(feedbackLinks).toHaveLength(2);
    expect(feedbackLinks[0]).toHaveAttribute(
      "href",
      "https://coda.io/form/Ideas-Bugs_dWgu2I2WTqJ?board-slug=daylily-catalog",
    );
    expect(feedbackLinks[1]).toHaveAttribute(
      "href",
      "https://coda.io/form/Ideas-Bugs_dWgu2I2WTqJ?board-slug=daylily-catalog",
    );
  });
});
