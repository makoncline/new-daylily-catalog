import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FloatingCartButton } from "@/components/floating-cart-button";

vi.mock("@/components/contact-form", () => ({
  ContactForm: () => <div>Contact form</div>,
}));

describe("FloatingCartButton", () => {
  it("describes the seller contact dialog", () => {
    render(
      <FloatingCartButton
        showTopButton
        userId="seller-1"
        userName="Starcrossed Seeds"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /^Contact Seller$/ }));

    expect(screen.getByRole("dialog")).toHaveAccessibleDescription(
      "Ask the seller about availability, shipping, pickup, or anything else you need to know.",
    );
  });
});
