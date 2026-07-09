import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PublicFooter } from "@/components/public-footer";

vi.mock("@/hooks/use-feedback-url", () => ({
  useFeedbackUrl: () =>
    "https://coda.io/form/Ideas-Bugs_dWgu2I2WTqJ?board-slug=daylily-catalog",
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

describe("PublicFooter", () => {
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
});
