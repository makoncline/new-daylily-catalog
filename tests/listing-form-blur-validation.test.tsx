import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const updateListingMock = vi.hoisted(() => vi.fn());

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/components/image-manager", () => ({
  ImageManager: () => null,
}));

vi.mock("@/components/image-upload", () => ({
  ImageUpload: () => null,
}));

vi.mock("@/components/multi-list-select", () => ({
  MultiListSelect: () => null,
}));

vi.mock("@/components/ahs-listing-link", () => ({
  AhsListingLink: () => null,
}));

vi.mock("@/components/delete-confirm-dialog", () => ({
  DeleteConfirmDialog: () => null,
}));

vi.mock("@/components/currency-input", () => ({
  CurrencyInput: ({
    value,
    onChange,
    onValueBlur,
  }: {
    value: number | undefined | null;
    onChange: (value: number | null) => void;
    onValueBlur: () => void;
  }) => (
    <input
      aria-label="Price"
      value={value ?? ""}
      onChange={(event) =>
        onChange(event.target.value ? Number(event.target.value) : null)
      }
      onBlur={onValueBlur}
    />
  ),
}));

vi.mock("@/app/dashboard/_lib/dashboard-db/listings-collection", () => ({
  updateListing: updateListingMock,
  deleteListing: vi.fn(),
  listingsCollection: {},
}));

vi.mock("@/app/dashboard/_lib/dashboard-db/cultivar-references-collection", () => ({
  cultivarReferencesCollection: {},
}));

vi.mock("@/app/dashboard/_lib/dashboard-db/images-collection", () => ({
  imagesCollection: {},
}));

vi.mock("@/app/dashboard/_lib/dashboard-db/lists-collection", () => ({
  addListingToList: vi.fn(),
  removeListingFromList: vi.fn(),
  listsCollection: {},
}));

vi.mock("@/lib/error-utils", () => ({
  getErrorMessage: vi.fn((error: unknown) =>
    error instanceof Error ? error.message : String(error ?? "Unknown error"),
  ),
  normalizeError: vi.fn((error) => error),
  reportError: vi.fn(),
}));

import { ListingFormInner } from "@/components/forms/listing-form";

describe("ListingFormInner blur-save behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateListingMock.mockResolvedValue({});
  });

  it("does not persist an empty title on blur", async () => {
    render(
      <ListingFormInner
        listingId="listing-1"
        listing={
          {
            id: "listing-1",
            title: "Original Title",
            price: null,
            description: null,
            privateNote: null,
            status: null,
            cultivarReferenceId: null,
          } as never
        }
        linkedAhs={null}
        images={[]}
        selectedListIds={[]}
        onDelete={vi.fn()}
      />,
    );

    const titleInput = screen.getByLabelText("Name");
    fireEvent.change(titleInput, { target: { value: "" } });
    fireEvent.blur(titleInput);

    await waitFor(() => {
      expect(updateListingMock).not.toHaveBeenCalled();
    });
  });
});
