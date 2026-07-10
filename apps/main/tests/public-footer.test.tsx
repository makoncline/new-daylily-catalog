import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PublicFooter } from "@/components/public-footer";

const navigationState = vi.hoisted(() => ({ pathname: "/" }));

vi.mock("@/hooks/use-feedback-url", () => ({
  useFeedbackUrl: () =>
    "https://coda.io/form/Ideas-Bugs_dWgu2I2WTqJ?board-slug=daylily-catalog",
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigationState.pathname,
}));

describe("PublicFooter", () => {
  beforeEach(() => {
    navigationState.pathname = "/";
  });

  it("renders the single public feedback footer", () => {
    render(<PublicFooter />);

    const footerNav = screen.getByRole("navigation", { name: "Public footer" });
    const feedbackLink = screen.getByRole("link", { name: "Feedback" });

    expect(feedbackLink).toHaveAttribute(
      "href",
      "https://coda.io/form/Ideas-Bugs_dWgu2I2WTqJ?board-slug=daylily-catalog",
    );
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
    expect(footerNav).toBeVisible();
    expect(footerNav.querySelectorAll("li")).toHaveLength(1);
    expect(
      screen.queryByText("Browse daylily catalogs created by growers."),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Create your catalog" }),
    ).not.toBeInTheDocument();
  });

  it("uses the high-contrast hero footer on the grower landing page", () => {
    navigationState.pathname = "/start-membership";
    render(<PublicFooter />);

    expect(screen.getByRole("contentinfo")).toHaveClass("text-white");
    expect(screen.getByRole("link", { name: "Feedback" })).toHaveClass(
      "text-white/70",
    );
  });
});
