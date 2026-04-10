import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ManagedCreateDialog } from "@/app/dashboard/_components/managed-create-dialog";

describe("ManagedCreateDialog", () => {
  it("renders the shared dialog frame and forwards actions", () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <ManagedCreateDialog
        confirmLabel="Create Item"
        description="Create description"
        onCancel={onCancel}
        onConfirm={onConfirm}
        onOpenChange={onOpenChange}
        open
        title="Create Item"
      >
        <div>Dialog body</div>
      </ManagedCreateDialog>,
    );

    expect(screen.getByRole("heading", { name: "Create Item" })).toBeInTheDocument();
    expect(screen.getByText("Create description")).toBeInTheDocument();
    expect(screen.getByText("Dialog body")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.click(screen.getByRole("button", { name: "Create Item" }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
