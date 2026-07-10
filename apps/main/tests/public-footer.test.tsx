import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PublicFooter } from "@/components/public-footer";

const navigationState = vi.hoisted(() => ({ pathname: "/" }));

vi.mock("next/navigation", () => ({
  usePathname: () => navigationState.pathname,
}));

describe("PublicFooter", () => {
  beforeEach(() => {
    navigationState.pathname = "/";
  });

  it("renders the public policy and support links", () => {
    render(<PublicFooter />);

    const footerNav = screen.getByRole("navigation", { name: "Public footer" });
    const privacyLink = screen.getByRole("link", { name: "Privacy" });
    const termsLink = screen.getByRole("link", { name: "Terms" });
    const supportLink = screen.getByRole("link", { name: "Support" });

    expect(privacyLink).toHaveAttribute("href", "/privacy");
    expect(termsLink).toHaveAttribute("href", "/terms");
    expect(supportLink).toHaveAttribute("href", "/support");
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
    expect(footerNav).toBeVisible();
    expect(footerNav.querySelectorAll("li")).toHaveLength(3);
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
    expect(screen.getByRole("link", { name: "Support" })).toHaveClass(
      "text-white/70",
    );
  });
});
