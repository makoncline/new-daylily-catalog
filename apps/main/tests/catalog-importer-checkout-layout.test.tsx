import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import CatalogImporterCheckoutLayout from "@/app/catalog-importer/checkout/layout";

vi.mock("@/components/public-shell", () => ({
  PublicShell: ({ children }: { children: ReactNode }) => (
    <div data-testid="public-shell">{children}</div>
  ),
}));

vi.mock("@/components/auth-providers", () => ({
  AuthProviders: ({ children }: { children: ReactNode }) => (
    <div data-testid="auth-providers">{children}</div>
  ),
}));

describe("CatalogImporterCheckoutLayout", () => {
  it("provides auth and API state to checkout pages", () => {
    render(
      <CatalogImporterCheckoutLayout>
        <div>Checkout content</div>
      </CatalogImporterCheckoutLayout>,
    );

    expect(screen.getByTestId("auth-providers")).toBeVisible();
    expect(screen.getByTestId("public-shell")).toBeVisible();
    expect(screen.getByText("Checkout content")).toBeVisible();
  });
});
