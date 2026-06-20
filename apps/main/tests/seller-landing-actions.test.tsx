import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MouseEvent, ReactNode } from "react";
import {
  SellerLandingAuthCta,
  SellerLandingExampleLink,
} from "@/app/start-membership/_components/seller-landing-actions";

const useAuthMock = vi.hoisted(() => vi.fn());
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
    <button
      {...props}
      type="button"
      role="link"
      data-href={href}
      onClick={(event) => {
        onClick?.(event as unknown as MouseEvent<HTMLAnchorElement>);
      }}
    >
      {children}
    </button>
  ),
}));

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => useAuthMock(),
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

  it("links signed-out sellers directly to anonymous onboarding", () => {
    render(
      <SellerLandingAuthCta
        ctaId="seller-landing-hero-primary"
        ctaLabel="Create your catalog"
      />,
    );

    expect(
      screen.getByRole("link", { name: "Create your catalog" }),
    ).toHaveAttribute("data-href", "/onboarding");
  });

  it("links signed-in sellers to onboarding for the already-signed-in treatment", () => {
    useAuthMock.mockReturnValue({
      isLoaded: true,
      userId: "clerk-user",
    });

    render(
      <SellerLandingAuthCta
        ctaId="seller-landing-hero-primary"
        ctaLabel="Create your catalog"
      />,
    );

    expect(
      screen.getByRole("link", { name: "Create your catalog" }),
    ).toHaveAttribute("data-href", "/onboarding");
  });

  it("captures seller CTA and next path when signed out", () => {
    render(
      <SellerLandingAuthCta
        ctaId="seller-landing-hero-primary"
        ctaLabel="Create your catalog"
      />,
    );

    fireEvent.click(
      screen.getByRole("link", { name: "Create your catalog" }),
    );

    expect(capturePosthogEventMock).toHaveBeenCalledWith(
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
