import * as React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ListForm, type ListFormHandle } from "@/components/forms/list-form";

const updateListMock = vi.hoisted(() => vi.fn());
const deleteListMock = vi.hoisted(() => vi.fn());
const toastSuccessMock = vi.hoisted(() => vi.fn());
const toastErrorMock = vi.hoisted(() => vi.fn());

vi.mock("@tanstack/react-db", () => ({
  useLiveQuery: () => ({
    data: [
      {
        id: "list-1",
        userId: "user-1",
        title: "My List",
        description: null,
        status: null,
        createdAt: new Date("2025-01-01T00:00:00.000Z"),
        updatedAt: new Date("2025-01-01T00:00:00.000Z"),
        listings: [],
      },
    ],
    isReady: true,
  }),
  eq: vi.fn(),
}));

vi.mock("@/app/dashboard/_lib/dashboard-db/lists-collection", () => ({
  listsCollection: {},
  updateList: updateListMock,
  deleteList: deleteListMock,
}));

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccessMock,
    error: toastErrorMock,
  },
}));

describe("ListForm boundary save semantics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateListMock.mockResolvedValue(undefined);
  });

  it("does not save on field blur", () => {
    render(<ListForm listId="list-1" />);

    const titleInput = screen.getByLabelText("Title");
    fireEvent.change(titleInput, {
      target: { value: "Updated list title" },
    });
    fireEvent.blur(titleInput);

    expect(updateListMock).not.toHaveBeenCalled();
  });

  it("saves on manual save button", async () => {
    render(<ListForm listId="list-1" />);

    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Updated list title" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => {
      expect(updateListMock).toHaveBeenCalledTimes(1);
    });
    expect(toastSuccessMock).toHaveBeenCalledTimes(1);
  });

  it("saves silently on navigate reason via form handle", async () => {
    const formRef = React.createRef<ListFormHandle>();
    render(<ListForm listId="list-1" formRef={formRef} />);

    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Updated list title" },
    });

    await act(async () => {
      const didSave = await formRef.current?.saveChanges("navigate");
      expect(didSave).toBe(true);
    });

    expect(updateListMock).toHaveBeenCalledTimes(1);
    expect(toastSuccessMock).not.toHaveBeenCalled();
    expect(toastErrorMock).not.toHaveBeenCalled();
  });

  it("becomes savable when child mutations mark it dirty", async () => {
    const formRef = React.createRef<ListFormHandle>();
    render(<ListForm listId="list-1" formRef={formRef} />);

    const saveButton = screen.getByRole("button", { name: "Save Changes" });
    expect(saveButton).toBeDisabled();

    act(() => {
      (
        formRef.current as ListFormHandle & {
          markNeedsCommit?: () => void;
        }
      )?.markNeedsCommit?.();
    });

    expect(saveButton).not.toBeDisabled();

    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(updateListMock).toHaveBeenCalledTimes(1);
    });
    expect(updateListMock).toHaveBeenCalledWith({
      id: "list-1",
      data: {
        title: "My List",
        description: undefined,
      },
    });
  });
});
