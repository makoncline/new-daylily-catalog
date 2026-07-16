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
    render(<PublicHeader cultivarSearchEnabled />);

    const catalogsLinks = screen.getAllByRole("link", {
      name: "Browse catalogs",
    });
    const cultivarLinks = screen.getAllByRole("link", {
      name: "Search cultivars",
    });
    const growersLinks = screen.getAllByRole("link", { name: "For growers" });

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("banner")).not.toHaveClass("sticky");
    expect(screen.getByRole("banner")).toHaveClass(
      "before:backdrop-blur-[5px]",
    );
    expect(catalogsLinks).toHaveLength(2);
    expect(cultivarLinks).toHaveLength(2);
    expect(
      cultivarLinks.every((link) => link.getAttribute("href") === "/cultivars"),
    ).toBe(true);
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
    render(<PublicHeader cultivarSearchEnabled />);

    const mobileNav = screen.getByTestId("mobile-public-nav");
    const catalogsLink = mobileNav.querySelector('a[href="/catalogs"]');
    const cultivarLink = mobileNav.querySelector('a[href="/cultivars"]');
    const growersLink = mobileNav.querySelector('a[href="/start-membership"]');
    const dashboardLink = mobileNav.querySelector('a[href="/sign-in"]');

    expect(screen.getByText("Open public navigation")).toBeInTheDocument();
    expect(catalogsLink).toHaveAttribute("href", "/catalogs");
    expect(cultivarLink).toHaveAttribute("href", "/cultivars");
    expect(growersLink).toHaveAttribute("href", "/start-membership");
    expect(growersLink).toHaveAttribute("aria-current", "page");
    expect(dashboardLink).toHaveAttribute("href", "/sign-in");
  });

  it("uses the high-contrast hero navigation on the grower landing page", () => {
    navigationState.pathname = "/start-membership";
    render(<PublicHeader />);

    expect(screen.getByRole("banner")).toHaveClass("text-white");
    expect(screen.getByRole("banner")).not.toHaveClass("bg-[#07120e]");
    expect(screen.getByRole("button", { name: "Dashboard" })).toHaveClass(
      "text-white",
    );
  });

  it("does not expose cultivar search when the feature is disabled", () => {
    render(<PublicHeader />);

    expect(
      screen.queryByRole("link", { name: "Search cultivars" }),
    ).not.toBeInTheDocument();
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
