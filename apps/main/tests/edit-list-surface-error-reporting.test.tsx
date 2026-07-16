import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EditListSurface } from "@/app/dashboard/lists/_components/edit-list-dialog";

const reportError = vi.hoisted(() => vi.fn());

vi.mock("@/lib/error-utils", () => ({
  reportError,
}));

vi.mock("@/components/forms/list-form", () => ({
  ListForm: () => {
    throw new Error("list form failed");
  },
}));

vi.mock("@/components/forms/list-form-skeleton", () => ({
  ListFormSkeleton: () => <div>Loading</div>,
}));

vi.mock("@/components/error-fallback", () => ({
  ErrorFallback: () => <div>Editor unavailable</div>,
}));

describe("EditListSurface error reporting", () => {
  it("reports render failures before showing the fallback", async () => {
    render(<EditListSurface listId="list-1" onClose={vi.fn()} />);

    expect(screen.getByText("Editor unavailable")).toBeVisible();
    await waitFor(() => {
      expect(reportError).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ message: "list form failed" }),
          context: expect.objectContaining({ source: "EditListSurface" }),
        }),
      );
    });
  });
});
