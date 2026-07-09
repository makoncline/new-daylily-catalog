import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/public-nav", () => ({
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
    expect(screen.getByText("Public page content")).toBeVisible();
  });
});
