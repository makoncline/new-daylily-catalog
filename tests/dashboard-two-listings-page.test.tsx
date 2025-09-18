import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { withTempAppDb } from "@/lib/test-utils/app-test-db";

// Mock Clerk SignedIn to just render children
vi.mock("@clerk/nextjs", () => ({
  SignedIn: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock next/navigation search params + router used by useEditListing
vi.mock("next/navigation", async () => {
  const actual = await vi.importActual<any>("next/navigation");
  return {
    ...actual,
    useSearchParams: () => new URLSearchParams(""),
    useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  };
});

describe("/dashboard-two/listings page", () => {
  it("renders the Listings page title with an empty temp DB", async () => {
    await withTempAppDb(async () => {
      const Page = (await import("@/app/dashboard-two/listings/page")).default;

      render(<Page />);

      await waitFor(() => {
        // Page header heading
        expect(screen.getByRole("heading", { name: /listings/i })).toBeInTheDocument();
      });
    });
  });
});

