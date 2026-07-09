import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PublicHeader } from "@/components/public-nav";

const navigationState = vi.hoisted(() => ({ pathname: "/" }));

vi.mock("next/navigation", () => ({
  usePathname: () => navigationState.pathname,
}));

describe("PublicHeader", () => {
  beforeEach(() => {
    navigationState.pathname = "/";
  });

  it("renders the public destinations and marks the current page active", () => {
    navigationState.pathname = "/catalogs";
    render(<PublicHeader />);

    const catalogsLinks = screen.getAllByRole("link", {
      name: "Browse catalogs",
    });
    const growersLinks = screen.getAllByRole("link", { name: "For growers" });

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(catalogsLinks).toHaveLength(2);
    expect(
      catalogsLinks.every(
        (link) =>
          link.getAttribute("href") === "/catalogs" &&
          link.getAttribute("aria-current") === "page",
      ),
    ).toBe(true);
    expect(growersLinks).toHaveLength(2);
    expect(
      growersLinks.every(
        (link) => link.getAttribute("href") === "/start-membership",
      ),
    ).toBe(true);
    expect(screen.getByRole("button", { name: "Dashboard" })).toBeVisible();
  });

  it("renders mobile destinations without requiring hydration", () => {
    navigationState.pathname = "/onboarding";
    render(<PublicHeader />);

    const mobileNav = screen.getByTestId("mobile-public-nav");
    const catalogsLink = mobileNav.querySelector('a[href="/catalogs"]');
    const growersLink = mobileNav.querySelector('a[href="/start-membership"]');
    const dashboardLink = mobileNav.querySelector('a[href="/sign-in"]');

    expect(screen.getByText("Open public navigation")).toBeInTheDocument();
    expect(catalogsLink).toHaveAttribute("href", "/catalogs");
    expect(growersLink).toHaveAttribute("href", "/start-membership");
    expect(growersLink).toHaveAttribute("aria-current", "page");
    expect(dashboardLink).toHaveAttribute("href", "/sign-in");
  });

  it("closes the mobile menu after navigation", () => {
    const { rerender } = render(<PublicHeader />);
    const mobileNav = screen.getByTestId("mobile-public-nav");
    mobileNav.setAttribute("open", "");

    navigationState.pathname = "/catalogs";
    rerender(<PublicHeader />);

    expect(mobileNav).not.toHaveAttribute("open");
  });
});
