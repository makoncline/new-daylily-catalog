import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ListingGetOutput } from "@/server/api/routers/listing";
import { AhsListingLink } from "@/components/ahs-listing-link";

const mockMutateAsync = vi.hoisted(() => vi.fn());
const mockToastSuccess = vi.hoisted(() => vi.fn());
const mockToastError = vi.hoisted(() => vi.fn());

vi.mock("@/trpc/react", () => ({
  api: {
    listing: {
      update: {
        useMutation: () => ({
          mutateAsync: mockMutateAsync,
        }),
      },
    },
    useUtils: () => ({
      listing: {
        get: {
          invalidate: vi.fn(),
        },
      },
    }),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: mockToastSuccess,
    error: mockToastError,
  },
}));

vi.mock("@/components/ahs-listing-display", () => ({
  AhsListingDisplay: () => <div data-testid="ahs-listing-display" />,
}));

vi.mock("@/components/ahs-listing-select", () => ({
  AhsListingSelect: ({
    onSelect,
  }: {
    onSelect: (ahsListing: { id: string; name: string }) => void;
  }) => (
    <button
      type="button"
      onClick={() => onSelect({ id: "ahs-2", name: "Coffee Two" })}
    >
      Select AHS
    </button>
  ),
}));

function createListing(
  overrides: Partial<ListingGetOutput> = {},
): ListingGetOutput {
  return {
    id: "listing-1",
    title: "New Listing",
    ahsId: "ahs-1",
    ahsListing: {
      id: "ahs-1",
      name: "Coffee Frenzy",
    },
    images: [],
    lists: [],
    ...overrides,
  } as unknown as ListingGetOutput;
}

describe("AhsListingLink", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls mutation with null ahsId when unlinking", async () => {
    mockMutateAsync.mockResolvedValue(
      createListing({ ahsId: null, ahsListing: null }),
    );

    render(<AhsListingLink listing={createListing()} />);

    fireEvent.click(screen.getByRole("button", { name: "Unlink" }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        id: "listing-1",
        data: { ahsId: null },
      });
    });
  });

  it("calls mutation with ahsId and title when linking", async () => {
    mockMutateAsync.mockResolvedValue(createListing({ ahsId: "ahs-2" }));

    render(
      <AhsListingLink
        listing={createListing({ ahsId: null, ahsListing: null })}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Select AHS" }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        id: "listing-1",
        data: {
          ahsId: "ahs-2",
          title: "Coffee Two",
        },
      });
    });
  });
});
