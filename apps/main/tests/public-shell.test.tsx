import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const navigationState = vi.hoisted(() => ({ pathname: "/" }));

vi.mock("next/navigation", () => ({
  usePathname: () => navigationState.pathname,
}));

vi.mock("@/components/public-nav", () => ({
  isGrowerMarketingPath: (pathname: string) =>
    ["/start-membership", "/daylily-database-software"].includes(pathname),
  PublicHeader: () => <header>Public header</header>,
}));

vi.mock("@/components/public-footer", () => ({
  PublicFooter: () => <footer>Public footer</footer>,
}));

import { PublicShell } from "@/components/public-shell";

describe("PublicShell", () => {
  it("renders the shared public header, main content, skip link, and footer", () => {
    render(
      <PublicShell>
        <div>Public page content</div>
      </PublicShell>,
    );

    expect(screen.getByText("Public header")).toBeVisible();
    expect(screen.getByText("Public footer")).toBeVisible();
    const skipLink = screen.getByText("Skip to content");
    expect(skipLink).toHaveAttribute("href", "#main-content");
    const main = screen.getByRole("main");
    expect(main).toHaveAttribute("id", "main-content");
    expect(main).toHaveClass("-mt-16", "lg:-mt-20");
    expect(main).not.toHaveClass("pt-16");
    expect(screen.getByText("Public page content")).toBeVisible();
    expect(main.parentElement).toHaveClass("bg-[#f1f4ec]");
  });

  it.each(["/start-membership", "/daylily-database-software"])(
    "uses the dark page background on %s",
    (pathname) => {
      navigationState.pathname = pathname;

      render(<PublicShell>Membership</PublicShell>);

      expect(screen.getByRole("main").parentElement).toHaveClass(
        "bg-[#07120e]",
      );
      expect(screen.getByRole("main")).toHaveClass("-mt-16", "lg:-mt-20");
    },
  );

  it("uses the light page background away from dark landing pages", () => {
    navigationState.pathname = "/catalogs";

    render(<PublicShell>Catalogs</PublicShell>);

    expect(screen.getByRole("main").parentElement).toHaveClass("bg-[#f6f8f3]");
    expect(screen.getByRole("main")).not.toHaveClass("-mt-16", "lg:-mt-20");
  });
});
