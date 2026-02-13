import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RouterOutputs } from "@/trpc/react";
import { AhsListingLink } from "@/components/ahs-listing-link";

const mockLinkAhs = vi.hoisted(() => vi.fn());
const mockUnlinkAhs = vi.hoisted(() => vi.fn());
const mockSyncAhsName = vi.hoisted(() => vi.fn());
const mockToastSuccess = vi.hoisted(() => vi.fn());
const mockToastError = vi.hoisted(() => vi.fn());

vi.mock("@/app/dashboard/_lib/dashboard-db/listings-collection", () => ({
  linkAhs: mockLinkAhs,
  unlinkAhs: mockUnlinkAhs,
  syncAhsName: mockSyncAhsName,
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

type Listing = RouterOutputs["dashboardDb"]["listing"]["list"][number];

function createListing(overrides: Partial<Listing> = {}): Listing {
  const now = new Date();

  return {
    id: "listing-1",
    userId: "user-1",
    title: "New Listing",
    slug: "new-listing",
    price: null,
    description: null,
    privateNote: null,
    status: null,
    createdAt: now,
    updatedAt: now,
    cultivarReferenceId: "cr-ahs-1",
    cultivarReference: {
      id: "cr-ahs-1",
      ahsId: "ahs-1",
      ahsListing: {
        id: "ahs-1",
        name: "Coffee Frenzy",
      },
    },
    ...overrides,
  } as Listing;
}

describe("AhsListingLink", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls unlinkAhs when unlinking", async () => {
    mockUnlinkAhs.mockResolvedValue(
      createListing({
        cultivarReferenceId: null,
        cultivarReference: null,
      }),
    );

    render(<AhsListingLink listing={createListing()} />);

    fireEvent.click(screen.getByRole("button", { name: "Unlink" }));

    await waitFor(() => {
      expect(mockUnlinkAhs).toHaveBeenCalledWith({
        id: "listing-1",
      });
    });
  });

  it("calls linkAhs with cultivarReferenceId when linking", async () => {
    mockLinkAhs.mockResolvedValue(
      createListing({
        cultivarReferenceId: "cr-ahs-2",
        cultivarReference: {
          id: "cr-ahs-2",
          ahsId: "ahs-2",
          ahsListing: {
            id: "ahs-2",
            name: "Coffee Two",
          },
        },
      }),
    );

    render(
      <AhsListingLink
        listing={createListing({
          cultivarReferenceId: null,
          cultivarReference: null,
        })}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Select AHS" }));

    await waitFor(() => {
      expect(mockLinkAhs).toHaveBeenCalledWith({
        id: "listing-1",
        cultivarReferenceId: "cr-ahs-2",
        syncName: true,
      });
    });
  });
});

