import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ManagedEditDialog } from "@/app/dashboard/_components/managed-edit-dialog";
import type { SaveOnNavigateHandle } from "@/hooks/use-save-before-navigate";

vi.mock("@/hooks/use-save-before-navigate", () => ({
  useSaveBeforeNavigate: vi.fn(),
}));

describe("ManagedEditDialog", () => {
  it("saves before closing and then closes when save succeeds", async () => {
    const onClose = vi.fn();
    const handle: SaveOnNavigateHandle<"close" | "navigate"> = {
      hasPendingChanges: vi.fn(() => true),
      saveChanges: vi.fn(async () => true),
    };

    render(
      <ManagedEditDialog
        description="Edit description"
        entityId="item-1"
        fallback={<div>Loading</div>}
        isOpen
        onClose={onClose}
        renderForm={(id, formRef) => {
          formRef.current = handle;
          return <div>Editing {id}</div>;
        }}
        title="Edit Item"
      />,
    );

    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Close" }));

    await waitFor(() => {
      expect(handle.saveChanges).toHaveBeenCalledWith("close");
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("blocks closing when save fails", async () => {
    const onClose = vi.fn();
    const handle: SaveOnNavigateHandle<"close" | "navigate"> = {
      hasPendingChanges: vi.fn(() => true),
      saveChanges: vi.fn(async () => false),
    };

    render(
      <ManagedEditDialog
        description="Edit description"
        entityId="item-1"
        fallback={<div>Loading</div>}
        isOpen
        onClose={onClose}
        renderForm={(id, formRef) => {
          formRef.current = handle;
          return <div>Editing {id}</div>;
        }}
        title="Edit Item"
      />,
    );

    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Close" }));

    await waitFor(() => {
      expect(handle.saveChanges).toHaveBeenCalledWith("close");
    });
    expect(onClose).not.toHaveBeenCalled();
  });
});
