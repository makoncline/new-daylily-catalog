import type { ComponentProps } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EmailStep } from "@/app/onboarding/anonymous-onboarding-steps";
import { createAnonymousOnboardingDraft } from "@/app/onboarding/anonymous-onboarding-draft";

describe("EmailStep", () => {
  it("shows invalid email feedback on blur and links to sign in", () => {
    const props: ComponentProps<typeof EmailStep> = {
      collectEmail: {
        isPending: false,
      } as ComponentProps<typeof EmailStep>["collectEmail"],
      draft: createAnonymousOnboardingDraft({
        profile: { gardenName: "Test Garden" },
      }),
      emailInput: "invalid-email",
      emailIsValid: false,
      saveEmailAndContinue: vi.fn(),
      setEmailInput: vi.fn(),
    };

    render(<EmailStep {...props} />);

    const emailInput = screen.getByLabelText("Email address");
    expect(emailInput).toHaveAttribute("name", "email");
    expect(emailInput).toHaveAttribute("autocomplete", "email");
    expect(emailInput).toHaveAttribute("data-1p-ignore", "true");
    expect(emailInput).toHaveAttribute("data-bwignore", "true");
    expect(emailInput).toHaveAttribute("data-lpignore", "true");
    expect(emailInput).not.toHaveAttribute("aria-invalid", "true");
    expect(
      screen.queryByText("Enter a valid email address."),
    ).not.toBeInTheDocument();

    fireEvent.blur(emailInput);

    expect(emailInput).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Enter a valid email address.",
    );
    expect(
      screen.getByRole("button", { name: "Save and continue" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("link", { name: "Already have an account? Log in" }),
    ).toHaveAttribute("href", "/sign-in");
    expect(screen.queryByText("Why ask first?")).not.toBeInTheDocument();
  });
});
