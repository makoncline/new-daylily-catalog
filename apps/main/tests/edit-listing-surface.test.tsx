import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EditListingSurface } from "@/app/dashboard/listings/_components/edit-listing-dialog";

const saveChanges = vi.hoisted(() => vi.fn());

vi.mock("@/components/forms/listing-form", async () => {
  const React = await import("react");

  return {
    ListingForm: ({
      formRef,
      onSave,
    }: {
      formRef: React.RefObject<{
        hasPendingChanges: () => boolean;
        saveChanges: (reason: string) => Promise<boolean>;
      } | null>;
      onSave: () => void;
    }) => {
      const [name, setName] = React.useState("Saved listing");
      const isDirty = name !== "Saved listing";

      formRef.current = {
        hasPendingChanges: () => isDirty,
        saveChanges: async (reason: string) => {
          saveChanges(reason);
          onSave();
          return true;
        },
      };

      return (
        <label>
          Name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
      );
    },
  };
});

vi.mock("@/components/forms/listing-form-skeleton", () => ({
  ListingFormSkeleton: () => <div>Loading</div>,
}));

describe("EditListingSurface", () => {
  beforeEach(() => {
    saveChanges.mockReset();
  });

  it("keeps changes local until the user explicitly saves or discards", async () => {
    const onClose = vi.fn();
    render(<EditListingSurface listingId="listing-1" onClose={onClose} />);

    expect(screen.queryByText("Unsaved listing")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Changed listing" },
    });

    await waitFor(() => {
      expect(screen.getByText("Unsaved listing")).toBeVisible();
    });
    expect(saveChanges).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(saveChanges).toHaveBeenCalledWith("manual");
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    onClose.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "Discard" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(saveChanges).toHaveBeenCalledTimes(1);
  });
});
