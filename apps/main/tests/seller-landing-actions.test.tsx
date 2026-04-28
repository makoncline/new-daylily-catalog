import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MouseEvent, ReactNode } from "react";
import {
  SellerLandingAuthCta,
  SellerLandingExampleLink,
} from "@/app/start-membership/_components/seller-landing-actions";

const useAuthMock = vi.hoisted(() => vi.fn());
const signUpButtonPropsMock = vi.hoisted(() => vi.fn());
const capturePosthogEventMock = vi.hoisted(() => vi.fn());

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    onClick,
    ...props
  }: {
    children: ReactNode;
    href: string;
    onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  }) => (
    <a
      {...props}
      href={href}
      onClick={(event) => {
        event.preventDefault();
        onClick?.(event);
      }}
    >
      {children}
    </a>
  ),
}));

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => useAuthMock(),
  SignUpButton: ({
    children,
    ...props
  }: {
    children: ReactNode;
    forceRedirectUrl?: string;
    signInForceRedirectUrl?: string;
  }) => {
    signUpButtonPropsMock(props);
    return <div data-testid="mock-sign-up-button">{children}</div>;
  },
}));

vi.mock("@/lib/analytics/posthog", () => ({
  capturePosthogEvent: capturePosthogEventMock,
}));

describe("seller landing actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthMock.mockReturnValue({
      isLoaded: true,
      userId: null,
    });
  });

  it("configures Clerk auth redirect to onboarding", () => {
    render(
      <SellerLandingAuthCta
        ctaId="seller-landing-hero-primary"
        ctaLabel="Create your catalog"
      />,
    );

    expect(signUpButtonPropsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        forceRedirectUrl: "/onboarding",
        signInForceRedirectUrl: "/onboarding",
      }),
    );
  });

  it("captures seller CTA, auth start, and next path when signed out", () => {
    render(
      <SellerLandingAuthCta
        ctaId="seller-landing-hero-primary"
        ctaLabel="Create your catalog"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Create your catalog" }));

    expect(capturePosthogEventMock).toHaveBeenNthCalledWith(
      1,
      "seller_cta_clicked",
      {
        source_page_type: "seller_landing",
        source_path: "/start-membership",
        cta_id: "seller-landing-hero-primary",
        cta_label: "Create your catalog",
        target_path: "/onboarding",
        next_path: "/onboarding",
        is_authenticated: false,
      },
    );
    expect(capturePosthogEventMock).toHaveBeenNthCalledWith(
      2,
      "auth_started",
      {
        source_page_type: "seller_landing",
        source_path: "/start-membership",
        cta_id: "seller-landing-hero-primary",
        cta_label: "Create your catalog",
        target_path: "/onboarding",
        next_path: "/onboarding",
        is_authenticated: false,
      },
    );
  });

  it("tracks example-link clicks", () => {
    render(
      <SellerLandingExampleLink
        ctaId="seller-landing-example"
        ctaLabel="See a live example"
        href="/rollingoaksdaylilies"
      />,
    );

    fireEvent.click(screen.getByRole("link", { name: "See a live example" }));

    expect(capturePosthogEventMock).toHaveBeenCalledWith(
      "seller_example_clicked",
      {
        source_page_type: "seller_landing",
        source_path: "/start-membership",
        cta_id: "seller-landing-example",
        cta_label: "See a live example",
        target_path: "/rollingoaksdaylilies",
        is_authenticated: false,
      },
    );
  });
});
