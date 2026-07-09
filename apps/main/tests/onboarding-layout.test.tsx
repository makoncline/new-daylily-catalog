import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import OnboardingLayout from "@/app/onboarding/layout";

vi.mock("@/components/public-nav", () => ({
  PublicNav: () => <nav>Public nav</nav>,
}));

vi.mock("@/components/public-footer", () => ({
  PublicFooter: () => <footer>Feedback footer</footer>,
}));

vi.mock("@/components/auth-providers", () => ({
  AuthProviders: ({ children }: { children: ReactNode }) => (
    <div data-testid="auth-providers">{children}</div>
  ),
}));

describe("OnboardingLayout", () => {
  it("wraps onboarding and checkout interstitial pages with the feedback footer", () => {
    render(
      <OnboardingLayout>
        <div>Onboarding content</div>
      </OnboardingLayout>,
    );

    expect(screen.getByTestId("auth-providers")).toBeVisible();
    expect(screen.getByText("Public nav")).toBeVisible();
    expect(screen.getByText("Onboarding content")).toBeVisible();
    expect(screen.getByText("Feedback footer")).toBeVisible();
  });
});
