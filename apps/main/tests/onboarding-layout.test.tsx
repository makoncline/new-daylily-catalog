import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import OnboardingLayout from "@/app/onboarding/layout";

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

describe("OnboardingLayout", () => {
  it("wraps onboarding and checkout interstitial pages with the shared public shell", () => {
    render(
      <OnboardingLayout>
        <div>Onboarding content</div>
      </OnboardingLayout>,
    );

    expect(screen.getByTestId("auth-providers")).toBeVisible();
    expect(screen.getByTestId("public-shell")).toBeInTheDocument();
    expect(screen.getByText("Onboarding content")).toBeVisible();
  });
});
