import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthErrorPageClient } from "@/app/auth-error/auth-error-page-client";
import { SUBSCRIPTION_CONFIG } from "@/config/subscription-config";
import type { ReactNode } from "react";

const useAuthMock = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => useAuthMock(),
  SignInButton: ({
    children,
    forceRedirectUrl,
    signUpForceRedirectUrl,
  }: {
    children: ReactNode;
    forceRedirectUrl: string;
    signUpForceRedirectUrl: string;
  }) => (
    <button
      data-force-redirect-url={forceRedirectUrl}
      data-sign-up-force-redirect-url={signUpForceRedirectUrl}
      type="button"
    >
      {children}
    </button>
  ),
  SignOutButton: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("returnTo=/dashboard/listings"),
}));

describe("AuthErrorPageClient", () => {
  beforeEach(() => {
    useAuthMock.mockReset();
  });

  it("shows sign in for signed-out users", () => {
    useAuthMock.mockReturnValue({ isLoaded: true, userId: null });

    render(<AuthErrorPageClient />);

    expect(screen.getByRole("heading")).toHaveTextContent(
      "Authentication Required",
    );
    expect(screen.getByText(/you need to be signed in/i)).toBeVisible();
    const signIn = screen.getByRole("button", { name: "Sign In" });
    expect(signIn).toHaveAttribute(
      "data-force-redirect-url",
      "/dashboard/listings",
    );
    expect(signIn).toHaveAttribute(
      "data-sign-up-force-redirect-url",
      SUBSCRIPTION_CONFIG.NEW_USER_ONBOARDING_PATH,
    );
    expect(
      screen.queryByRole("link", { name: "Go to Dashboard" }),
    ).not.toBeInTheDocument();
  });

  it("shows dashboard and sign-out actions for signed-in users", () => {
    useAuthMock.mockReturnValue({ isLoaded: true, userId: "user-1" });

    render(<AuthErrorPageClient />);

    expect(screen.getByRole("heading")).toHaveTextContent(
      "Something Went Wrong",
    );
    expect(screen.getByText(/you are signed in/i)).toBeVisible();
    expect(screen.getByRole("link", { name: "Go to Dashboard" })).toHaveAttribute(
      "href",
      "/dashboard",
    );
    expect(screen.getByRole("button", { name: "Sign out" })).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Sign In" }),
    ).not.toBeInTheDocument();
  });
});
