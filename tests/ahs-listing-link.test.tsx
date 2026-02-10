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
    delete process.env.NEXT_PUBLIC_CULTIVAR_REFERENCE_LINKING_ENABLED;
    window.history.replaceState({}, "", "/");
  });

  it("calls unlinkAhs mutation when unlinking", async () => {
    mockUnlinkAhsMutateAsync.mockResolvedValue(
      createListing({ ahsId: null, ahsListing: null }),
    );

    render(<AhsListingLink listing={createListing()} />);

    fireEvent.click(screen.getByRole("button", { name: "Unlink" }));

    await waitFor(() => {
      expect(mockUnlinkAhsMutateAsync).toHaveBeenCalledWith({
        id: "listing-1",
      });
    });
  });

  it("calls linkAhs mutation with ahsId and syncName when linking", async () => {
    mockLinkAhsMutateAsync.mockResolvedValue(createListing({ ahsId: "ahs-2" }));

    render(
      <AhsListingLink
        listing={createListing({ ahsId: null, ahsListing: null })}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Select AHS" }));

    await waitFor(() => {
      expect(mockLinkAhsMutateAsync).toHaveBeenCalledWith({
        id: "listing-1",
        ahsId: "ahs-2",
        syncName: true,
      });
    });
  });

  it("calls linkAhs mutation with cultivarReferenceId when feature flag is enabled", async () => {
    process.env.NEXT_PUBLIC_CULTIVAR_REFERENCE_LINKING_ENABLED = "true";
    mockLinkAhsMutateAsync.mockResolvedValue(createListing({ ahsId: "ahs-2" }));

    render(
      <AhsListingLink
        listing={createListing({ ahsId: null, ahsListing: null })}
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

  it("uses query param override when set to true", async () => {
    process.env.NEXT_PUBLIC_CULTIVAR_REFERENCE_LINKING_ENABLED = "false";
    window.history.replaceState(
      {},
      "",
      "/?cultivarReferenceLinking=true",
    );
    mockLinkAhsMutateAsync.mockResolvedValue(createListing({ ahsId: "ahs-2" }));

    render(
      <AhsListingLink
        listing={createListing({ ahsId: null, ahsListing: null })}
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

  it("uses query param override when set to false", async () => {
    process.env.NEXT_PUBLIC_CULTIVAR_REFERENCE_LINKING_ENABLED = "true";
    window.history.replaceState(
      {},
      "",
      "/?cultivarReferenceLinking=false",
    );
    mockLinkAhsMutateAsync.mockResolvedValue(createListing({ ahsId: "ahs-2" }));

    render(
      <AhsListingLink
        listing={createListing({ ahsId: null, ahsListing: null })}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Select AHS" }));

    await waitFor(() => {
      expect(mockLinkAhsMutateAsync).toHaveBeenCalledWith({
        id: "listing-1",
        ahsId: "ahs-2",
        syncName: true,
      });
    });
  });
});
