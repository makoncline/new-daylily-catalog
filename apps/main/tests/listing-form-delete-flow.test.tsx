import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ListingForm } from "@/components/forms/listing-form";

const mocks = vi.hoisted(() => ({
  deleteListing: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("@/app/dashboard/_lib/dashboard-db/listings-collection", () => ({
  deleteListing: mocks.deleteListing,
  updateListing: vi.fn(),
}));

vi.mock("@/hooks/use-listing-editor-resource", () => ({
  useListingEditorResource: () => ({
    images: [],
    isReady: true,
    linkedAhs: null,
    linkedCultivarReferenceImage: null,
    listing: {
      id: "listing-1",
      userId: "user-1",
      title: "Delete me",
      slug: "delete-me",
      price: null,
      description: null,
      privateNote: null,
      status: null,
      createdAt: new Date("2026-07-15T00:00:00.000Z"),
      updatedAt: new Date("2026-07-15T00:00:00.000Z"),
      cultivarReferenceId: null,
    },
    selectedListIds: [],
  }),
}));

vi.mock("@/components/forms/listing-form-sections", () => ({
  ListingCultivarLinkSection: () => null,
  ListingListsSection: () => null,
  ListingMediaSection: () => null,
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: mocks.toastSuccess,
  },
}));

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((nextResolve) => {
    resolve = nextResolve;
  });

  return { promise, resolve };
}

describe("ListingForm delete flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("closes the editor while the confirmed delete continues in the background", async () => {
    const deletion = deferred();
    const onDelete = vi.fn();
    let markOptimisticallyDeleted: (() => void) | undefined;
    mocks.deleteListing.mockImplementation(
      (input: { onOptimisticDelete?: () => void }) => {
        markOptimisticallyDeleted = input.onOptimisticDelete;
        return deletion.promise;
      },
    );

    render(
      <ListingForm
        listingId="listing-1"
        onDelete={onDelete}
        onSave={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete Listing" }));
    fireEvent.click(
      await screen.findByRole("button", { name: /^Delete$/ }),
    );

    expect(mocks.deleteListing).toHaveBeenCalledWith({
      id: "listing-1",
      onOptimisticDelete: expect.any(Function),
    });
    expect(onDelete).not.toHaveBeenCalled();

    act(() => {
      markOptimisticallyDeleted?.();
    });

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(mocks.toastSuccess).not.toHaveBeenCalled();

    await act(async () => {
      deletion.resolve();
      await deletion.promise;
    });

    expect(mocks.toastSuccess).toHaveBeenCalledWith(
      "Listing deleted successfully",
    );
  });
});
