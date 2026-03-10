import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CreateListingDialog } from "@/app/dashboard/listings/_components/create-listing-dialog";

const mockInsertListing = vi.hoisted(() => vi.fn());
const mockSetEditingId = vi.hoisted(() => vi.fn());

vi.mock("@/trpc/react", () => ({
  api: {
    dashboardDb: {
      ahs: {
        get: {
          useQuery: () => ({ data: null }),
        },
      },
    },
  },
}));

vi.mock("@/app/dashboard/_lib/dashboard-db/listings-collection", () => ({
  insertListing: async (input: { title: string; cultivarReferenceId: string | null }) => {
    mockInsertListing(input);
    return { id: "listing-1", title: input.title };
  },
}));

vi.mock("jotai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("jotai")>();
  return {
    ...actual,
    useSetAtom: () => mockSetEditingId,
  };
});

vi.mock("@/components/ahs-listing-select", () => ({
  AhsListingSelect: ({
    onSelect,
  }: {
    onSelect: (result: {
      id: string;
      name: string;
      cultivarReferenceId: string;
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

vi.mock("@/components/ahs-listing-display", () => ({
  AhsListingDisplay: () => null,
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/error-utils", () => ({
  getErrorMessage: vi.fn((error: unknown) =>
    error instanceof Error ? error.message : String(error ?? "Unknown error"),
  ),
  normalizeError: vi.fn((error) => error),
  reportError: vi.fn(),
}));

describe("CreateListingDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses selected AHS name when title input is blank", async () => {
    render(<CreateListingDialog onOpenChange={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Select AHS" }));

    const titleInput = screen.getByLabelText("Listing Title");
    fireEvent.change(titleInput, { target: { value: "   " } });

    fireEvent.click(screen.getByRole("button", { name: "Create Listing" }));

    await waitFor(() => {
      expect(mockInsertListing).toHaveBeenCalledWith({
        title: "Coffee Two",
        cultivarReferenceId: "cr-ahs-2",
      });
    });
  });
});
