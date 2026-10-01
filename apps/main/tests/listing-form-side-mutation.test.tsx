import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ListingForm } from "@/components/forms/listing-form";

const state = vi.hoisted(() => ({
  listing: {
    id: "listing-1",
    title: "Old title",
    description: "Old description",
    price: null,
    privateNote: null,
    status: null,
    updatedAt: new Date("2026-09-25T12:00:00.000Z"),
  },
  updated: {
    id: "listing-1",
    title: "Remote title",
    description: "Old description",
    price: null,
    privateNote: null,
    status: null,
    updatedAt: new Date("2026-09-25T13:00:00.000Z"),
  },
  syncName: false,
}));
const updateListing = vi.hoisted(() =>
  vi.fn<
    (input: {
      expectedUpdatedAt: string;
      data: { title?: string; description?: string | null };
    }) => Promise<unknown>
  >(),
);

vi.mock("@/hooks/use-listing-editor-resource", () => ({
  useListingEditorResource: () => ({
    images: [],
    isReady: true,
    linkedAhs: null,
    linkedCultivarReferenceImage: null,
    listing: state.listing,
    selectedListIds: [],
  }),
}));
vi.mock("@/app/dashboard/_lib/dashboard-db/listings-collection", () => ({
  deleteListing: vi.fn(),
  loadMissingListing: vi.fn(),
  listingsCollection: { get: () => state.updated },
  updateListing,
}));
vi.mock("@/app/dashboard/_lib/dashboard-db/lists-collection", () => ({
  addListingToList: vi.fn(),
  removeListingFromList: vi.fn(),
}));
vi.mock("@/components/forms/listing-form-sections", () => ({
  ListingMediaSection: () => null,
  ListingListsSection: () => null,
  ListingCultivarLinkSection: ({
    onMutationSuccess,
    onNameChange,
  }: {
    onMutationSuccess: (listing: typeof state.updated) => void;
    onNameChange: (name: string) => void;
  }) => (
    <button
      type="button"
      onClick={() => {
        if (state.syncName) onNameChange(state.updated.title);
        onMutationSuccess(state.updated);
      }}
    >
      Apply cultivar change
    </button>
  ),
}));
vi.mock("@/components/currency-input", () => ({
  CurrencyInput: () => null,
}));

describe("listing form after a cultivar mutation", () => {
  beforeEach(() => {
    updateListing.mockReset();
    state.syncName = false;
    state.updated = {
      ...state.listing,
      title: "Remote title",
      updatedAt: new Date("2026-09-25T13:00:00.000Z"),
    };
  });

  it("uses the new version and keeps an unrelated local draft", async () => {
    state.syncName = true;
    updateListing.mockResolvedValue(state.updated);
    const view = render(
      <ListingForm listingId="listing-1" onDelete={vi.fn()} onSave={vi.fn()} />,
    );

    fireEvent.change(screen.getByRole("textbox", { name: "Description" }), {
      target: { value: "Local description" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Apply cultivar change" }),
    );
    const previous = state.listing;
    state.listing = state.updated;
    view.rerender(
      <ListingForm listingId="listing-1" onDelete={vi.fn()} onSave={vi.fn()} />,
    );
    expect(screen.getByRole("textbox", { name: "Description" })).toHaveValue(
      "Local description",
    );
    state.listing = previous;
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => expect(updateListing).toHaveBeenCalledTimes(1));
    const input = updateListing.mock.calls[0]?.[0];
    expect(input?.expectedUpdatedAt).toBe("2026-09-25T13:00:00.000Z");
    expect(input?.data).toMatchObject({
      title: "Remote title",
      description: "Local description",
    });
  });

  it("retains the old version when the same field changed elsewhere", async () => {
    updateListing.mockRejectedValue(
      new Error("Listing changed. Load the latest version."),
    );
    render(
      <ListingForm listingId="listing-1" onDelete={vi.fn()} onSave={vi.fn()} />,
    );

    fireEvent.change(screen.getByRole("textbox", { name: "Name" }), {
      target: { value: "Local title" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Apply cultivar change" }),
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Your unsaved fields are still here",
    );
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => expect(updateListing).toHaveBeenCalledTimes(1));
    expect(updateListing.mock.calls[0]?.[0].expectedUpdatedAt).toBe(
      "2026-09-25T12:00:00.000Z",
    );
  });
});
