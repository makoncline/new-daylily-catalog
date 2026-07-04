import { render, screen } from "@testing-library/react";
import type React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ViewListingDialog } from "@/components/view-listing-dialog";

const mockUseListingDialogQueryState = vi.hoisted(() => vi.fn());
const mockUseParams = vi.hoisted(() => vi.fn());
const mockGetListingUseQuery = vi.hoisted(() => vi.fn());
const mockProvider = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/use-listing-dialog-query-state", () => ({
  useListingDialogQueryState: () => mockUseListingDialogQueryState(),
}));

vi.mock("next/navigation", () => ({
  useParams: () => mockUseParams(),
}));

vi.mock("@/trpc/react", () => ({
  TRPCReactProvider: ({ children }: { children: React.ReactNode }) => {
    mockProvider();
    return <>{children}</>;
  },
  api: {
    public: {
      getListing: {
        useQuery: (...args: unknown[]) => mockGetListingUseQuery(...args),
      },
    },
  },
}));

vi.mock("@/components/listing-display", () => ({
  ListingDisplay: ({ listing }: { listing: { title: string } }) => (
    <div data-testid="listing-display">{listing.title}</div>
  ),
  ListingDisplaySkeleton: () => <div data-testid="listing-skeleton" />,
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
}));

vi.mock("@radix-ui/react-visually-hidden", () => ({
  VisuallyHidden: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

const listing = {
  id: "listing-1",
  title: "A Green Desire",
};

describe("ViewListingDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseParams.mockReturnValue({ userSlugOrId: "plantfancygardens" });
    mockUseListingDialogQueryState.mockReturnValue({
      viewingId: null,
      closeListing: vi.fn(),
    });
    mockGetListingUseQuery.mockReturnValue({
      data: null,
      error: null,
    });
  });

  it("does not mount tRPC when no listing dialog is open", () => {
    render(<ViewListingDialog listings={[listing] as never} />);

    expect(screen.queryByTestId("listing-display")).not.toBeInTheDocument();
    expect(mockProvider).not.toHaveBeenCalled();
    expect(mockGetListingUseQuery).not.toHaveBeenCalled();
  });

  it("shows a listing already present on the page without mounting tRPC", () => {
    mockUseListingDialogQueryState.mockReturnValue({
      viewingId: "listing-1",
      closeListing: vi.fn(),
    });

    render(<ViewListingDialog listings={[listing] as never} />);

    expect(screen.getByTestId("listing-display")).toHaveTextContent(
      "A Green Desire",
    );
    expect(mockProvider).not.toHaveBeenCalled();
    expect(mockGetListingUseQuery).not.toHaveBeenCalled();
  });
});
