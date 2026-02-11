import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ListingGetOutput } from "@/server/api/routers/listing";
import { AhsListingLink } from "@/components/ahs-listing-link";

const mockLinkAhsMutateAsync = vi.hoisted(() => vi.fn());
const mockUnlinkAhsMutateAsync = vi.hoisted(() => vi.fn());
const mockSyncAhsNameMutateAsync = vi.hoisted(() => vi.fn());
const mockToastSuccess = vi.hoisted(() => vi.fn());
const mockToastError = vi.hoisted(() => vi.fn());

vi.mock("@/trpc/react", () => ({
  api: {
    listing: {
      linkAhs: {
        useMutation: () => ({
          mutateAsync: mockLinkAhsMutateAsync,
        }),
      },
      unlinkAhs: {
        useMutation: () => ({
          mutateAsync: mockUnlinkAhsMutateAsync,
        }),
      },
      syncAhsName: {
        useMutation: () => ({
          mutateAsync: mockSyncAhsNameMutateAsync,
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
    onSelect: (result: {
      id: string;
      name: string;
      cultivarReferenceId: string | null;
    }) => void;
  }) => (
    <button
      type="button"
      onClick={() =>
        onSelect({
          id: "ahs-2",
          name: "Coffee Two",
          cultivarReferenceId: "cr-ahs-2",
        })
      }
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
    cultivarReferenceId: "cr-ahs-1",
    ahsListing: {
      id: "ahs-1",
      name: "Coffee Frenzy",
    },
    cultivarReference: {
      id: "cr-ahs-1",
      ahsListing: {
        id: "ahs-1",
        name: "Coffee Frenzy",
      },
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

  it("calls unlinkAhs mutation when unlinking", async () => {
    mockUnlinkAhsMutateAsync.mockResolvedValue(
      createListing({
        cultivarReferenceId: null,
        cultivarReference: null,
        ahsListing: null,
      }),
    );

    render(<AhsListingLink listing={createListing()} />);

    fireEvent.click(screen.getByRole("button", { name: "Unlink" }));

    await waitFor(() => {
      expect(mockUnlinkAhsMutateAsync).toHaveBeenCalledWith({
        id: "listing-1",
      });
    });
  });

  it("calls linkAhs mutation with cultivarReferenceId when linking", async () => {
    mockLinkAhsMutateAsync.mockResolvedValue(
      createListing({
        cultivarReferenceId: "cr-ahs-2",
        cultivarReference: {
          id: "cr-ahs-2",
          ahsListing: {
            id: "ahs-2",
            name: "Coffee Two",
          },
        } as unknown as ListingGetOutput["cultivarReference"],
      }),
    );

    render(
      <AhsListingLink
        listing={createListing({
          cultivarReferenceId: null,
          cultivarReference: null,
          ahsListing: null,
        })}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Select AHS" }));

    await waitFor(() => {
      expect(mockLinkAhsMutateAsync).toHaveBeenCalledWith({
        id: "listing-1",
        cultivarReferenceId: "cr-ahs-2",
        syncName: true,
      });
    });
  });
});
