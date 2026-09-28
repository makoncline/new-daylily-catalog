import * as React from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ListForm, type ListFormHandle } from "@/components/forms/list-form";

const updateListMock = vi.hoisted(() => vi.fn());
const deleteListMock = vi.hoisted(() => vi.fn());
const loadMissingListMock = vi.hoisted(() => vi.fn());
const missingListState = vi.hoisted(() => ({
  missing: false,
  title: "My List",
  updatedAt: new Date("2025-01-01T00:00:00.000Z"),
}));
const toastSuccessMock = vi.hoisted(() => vi.fn());
const toastErrorMock = vi.hoisted(() => vi.fn());

vi.mock("@tanstack/react-db", () => ({
  useLiveQuery: () => ({
    data: missingListState.missing
      ? []
      : [
          {
            id: "list-1",
            userId: "user-1",
            title: missingListState.title,
            description: null,
            status: null,
            createdAt: new Date("2025-01-01T00:00:00.000Z"),
            updatedAt: missingListState.updatedAt,
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
  loadMissingList: loadMissingListMock,
}));

vi.mock("@/trpc/query-client", () => ({
  getQueryClient: () => ({
    getQueryData: () => [],
  }),
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
    missingListState.missing = false;
    missingListState.title = "My List";
    missingListState.updatedAt = new Date("2025-01-01T00:00:00.000Z");
    updateListMock.mockImplementation(async ({ data }) => ({
      title: data.title ?? "My List",
      description: data.description ?? null,
      updatedAt: new Date("2025-01-02T00:00:00.000Z"),
    }));
  });

  it("does not save on field blur", async () => {
    render(<ListForm listId="list-1" />);

    const titleInput = await screen.findByLabelText("Title");
    fireEvent.change(titleInput, {
      target: { value: "Updated list title" },
    });
    fireEvent.blur(titleInput);

    expect(updateListMock).not.toHaveBeenCalled();
  });

  it("saves on manual save button", async () => {
    render(<ListForm listId="list-1" />);

    fireEvent.change(await screen.findByLabelText("Title"), {
      target: { value: "Updated list title" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => {
      expect(updateListMock).toHaveBeenCalledTimes(1);
    });
    expect(toastSuccessMock).toHaveBeenCalledTimes(1);
  });

  it("shows success toast on navigate reason via form handle", async () => {
    const formRef = React.createRef<ListFormHandle>();
    render(<ListForm listId="list-1" formRef={formRef} />);

    fireEvent.change(await screen.findByLabelText("Title"), {
      target: { value: "Updated list title" },
    });

    await act(async () => {
      const didSave = await formRef.current?.saveChanges("navigate");
      expect(didSave).toBe(true);
    });

    expect(updateListMock).toHaveBeenCalledTimes(1);
    expect(toastSuccessMock).toHaveBeenCalledTimes(1);
    expect(toastSuccessMock).toHaveBeenCalledWith("List updated", {
      description: "Your list has been updated successfully",
    });
    expect(toastErrorMock).not.toHaveBeenCalled();
  });

  it("becomes savable when child mutations mark it dirty", async () => {
    const formRef = React.createRef<ListFormHandle>();
    render(<ListForm listId="list-1" formRef={formRef} />);

    const saveButton = await screen.findByRole("button", {
      name: "Save Changes",
    });
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

    await waitFor(() => expect(saveButton).toBeDisabled());
    expect(updateListMock).not.toHaveBeenCalled();
  });

  it("preserves unsaved fields when a newer list arrives", async () => {
    const view = render(<ListForm listId="list-1" />);
    const titleInput = await screen.findByLabelText("Title");
    fireEvent.change(titleInput, { target: { value: "My draft" } });

    missingListState.title = "Remote title";
    missingListState.updatedAt = new Date("2025-01-02T00:00:00.000Z");
    view.rerender(<ListForm listId="list-1" />);

    expect(titleInput).toHaveValue("My draft");
    expect(screen.getByRole("status")).toHaveTextContent(
      "Your unsaved fields are still here",
    );
  });

  it("opens deletion review from a deep link without deleting on load", async () => {
    let finishRefresh: () => void = () => {};
    loadMissingListMock.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        finishRefresh = resolve;
      }),
    );
    render(<ListForm listId="list-1" openDeleteOnMount />);

    await waitFor(() => {
      expect(loadMissingListMock).toHaveBeenCalledWith("list-1");
    });
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    await act(async () => {
      missingListState.title = "Current list title";
      finishRefresh();
    });
    expect(await screen.findByRole("alertdialog")).toBeVisible();
    expect(
      screen.getByText(
        "Delete Current list title? This action cannot be undone.",
      ),
    ).toBeVisible();
    expect(deleteListMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });
    expect(deleteListMock).not.toHaveBeenCalled();
  });

  it("checks the primary once when a linked list is missing locally", async () => {
    missingListState.missing = true;
    loadMissingListMock.mockRejectedValueOnce(new Error("List not found"));
    render(<ListForm listId="missing-list" />);

    await waitFor(() => {
      expect(loadMissingListMock).toHaveBeenCalledOnce();
    });
    expect(loadMissingListMock).toHaveBeenCalledWith("missing-list");
    expect(await screen.findByRole("status")).toHaveTextContent(
      "This list is unavailable",
    );
    expect(deleteListMock).not.toHaveBeenCalled();
  });

  it("does not review a cached list when its primary refresh fails", async () => {
    loadMissingListMock.mockRejectedValueOnce(new Error("Primary unavailable"));
    render(<ListForm listId="list-1" openDeleteOnMount />);

    expect(await screen.findByRole("status")).toHaveTextContent(
      "This list is unavailable",
    );
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(deleteListMock).not.toHaveBeenCalled();
  });
});
