import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MouseEvent, ReactNode } from "react";
import {
  SellerLandingExampleLink,
  SellerLandingOnboardingCta,
} from "@/app/start-membership/_components/seller-landing-actions";

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

vi.mock("@/lib/analytics/posthog", () => ({
  capturePosthogEvent: capturePosthogEventMock,
}));

describe("seller landing actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("links the seller CTA directly to anonymous onboarding", () => {
    render(
      <SellerLandingOnboardingCta
        ctaId="seller-landing-hero-primary"
        ctaLabel="Create your catalog"
      />,
    );

    expect(
      screen.getByRole("link", { name: "Create your catalog" }),
    ).toHaveAttribute("data-href", "/onboarding");
  });

  it("captures seller CTA clicks with the onboarding target", () => {
    render(
      <SellerLandingOnboardingCta
        ctaId="seller-landing-hero-primary"
        ctaLabel="Create your catalog"
      />,
    );

    fireEvent.click(screen.getByRole("link", { name: "Create your catalog" }));

    expect(capturePosthogEventMock).toHaveBeenCalledWith(
      "seller_cta_clicked",
      {
        source_page_type: "seller_landing",
        source_path: "/start-membership",
        cta_id: "seller-landing-hero-primary",
        cta_label: "Create your catalog",
        target_path: "/onboarding",
        next_path: "/onboarding",
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
      },
    );
  });
});
