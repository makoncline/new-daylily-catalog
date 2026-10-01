import * as React from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ListingForm } from "@/components/forms/listing-form";
import type { ListingCollectionItem } from "@/app/dashboard/_lib/dashboard-db/listings-collection";

const updateListing = vi.hoisted(() => vi.fn());
const resource = vi.hoisted(() => ({ listing: {} as ListingCollectionItem }));

vi.mock("@/hooks/use-listing-editor-resource", () => ({
  useListingEditorResource: () => ({
    ...resource,
    isReady: true,
    images: [],
    selectedListIds: [],
    linkedAhs: null,
    linkedCultivarHref: null,
    linkedCultivarReferenceImage: null,
  }),
}));
vi.mock("@/app/dashboard/_lib/dashboard-db/listings-collection", () => ({
  updateListing,
  deleteListing: vi.fn(),
}));
vi.mock("@/app/dashboard/_lib/dashboard-db/lists-collection", () => ({
  addListingToList: vi.fn(),
  removeListingFromList: vi.fn(),
}));
vi.mock("@/components/forms/listing-form-sections", () => ({
  ListingMediaSection: () => null,
  ListingListsSection: () => null,
  ListingCultivarLinkSection: ({
    onNameChange,
  }: {
    onNameChange: (name: string) => void;
  }) => (
    <button type="button" onClick={() => onNameChange("Linked cultivar")}>
      Use cultivar name
    </button>
  ),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/error-utils", () => ({
  getErrorMessage: (error: Error) => error.message,
  normalizeError: (error: Error) => error,
  reportError: vi.fn(),
}));

function listing(
  overrides: Partial<ListingCollectionItem> = {},
): ListingCollectionItem {
  return {
    id: "listing-1",
    userId: "user-1",
    title: "Cached name",
    description: "Cached description",
    price: null,
    status: null,
    privateNote: null,
    slug: "cached-name",
    cultivarReferenceId: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  };
}

describe("Listing form refreshed data", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resource.listing = listing();
    updateListing.mockResolvedValue(undefined);
  });

  it("adopts a late snapshot without creating an unsaved draft", async () => {
    const onPendingChangesChange = vi.fn();
    const props = {
      listingId: "listing-1",
      onDelete: vi.fn(),
      onSave: vi.fn(),
      onPendingChangesChange,
    };
    const view = render(<ListingForm {...props} />);
    expect(screen.getByLabelText("Name")).toHaveValue("Cached name");

    resource.listing = listing({
      title: "Saved name",
      description: "Saved description",
    });
    view.rerender(<ListingForm {...props} />);

    await waitFor(() =>
      expect(screen.getByLabelText("Name")).toHaveValue("Saved name"),
    );
    expect(screen.getByLabelText("Description")).toHaveValue(
      "Saved description",
    );
    expect(screen.getByRole("button", { name: "Save Changes" })).toBeDisabled();
    expect(onPendingChangesChange).toHaveBeenLastCalledWith(false);
    expect(updateListing).not.toHaveBeenCalled();
  });

  it("retains changed fields through refresh, failed Save, and rollback", async () => {
    const onSave = vi.fn();
    const props = { listingId: "listing-1", onDelete: vi.fn(), onSave };
    const view = render(<ListingForm {...props} />);
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Draft name" },
    });
    resource.listing = listing({ description: "Fresh description" });
    view.rerender(<ListingForm {...props} />);
    await waitFor(() =>
      expect(screen.getByLabelText("Description")).toHaveValue(
        "Fresh description",
      ),
    );
    expect(screen.getByLabelText("Name")).toHaveValue("Draft name");

    let rejectWrite: ((error: Error) => void) | undefined;
    updateListing.mockReturnValueOnce(
      new Promise<void>((_resolve, reject) => {
        rejectWrite = reject;
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    await waitFor(() => expect(updateListing).toHaveBeenCalledOnce());
    resource.listing = listing({
      title: "Draft name",
      description: "Fresh description",
    });
    view.rerender(<ListingForm {...props} />);
    expect(screen.getByLabelText("Name")).toHaveValue("Draft name");
    resource.listing = listing({ description: "Fresh description" });
    view.rerender(<ListingForm {...props} />);
    await act(async () => rejectWrite?.(new Error("Rejected write")));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Save Changes" }),
      ).toBeEnabled(),
    );
    expect(screen.getByLabelText("Name")).toHaveValue("Draft name");
    expect(onSave).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
    expect(updateListing).toHaveBeenLastCalledWith({
      id: "listing-1",
      data: {
        title: "Draft name",
        description: "Fresh description",
        price: undefined,
        privateNote: undefined,
        status: undefined,
      },
    });
  });

  it("retains a cultivar name change when linked data refreshes", async () => {
    const props = {
      listingId: "listing-1",
      onDelete: vi.fn(),
      onSave: vi.fn(),
    };
    const view = render(<ListingForm {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Use cultivar name" }));
    resource.listing = listing({
      cultivarReferenceId: "cultivar-1",
      description: "Fresh description",
    });
    view.rerender(<ListingForm {...props} />);
    await waitFor(() =>
      expect(screen.getByLabelText("Description")).toHaveValue(
        "Fresh description",
      ),
    );
    expect(screen.getByLabelText("Name")).toHaveValue("Linked cultivar");
    expect(screen.getByRole("button", { name: "Save Changes" })).toBeEnabled();
  });
});
