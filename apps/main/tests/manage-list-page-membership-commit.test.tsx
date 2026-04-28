import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ManageListPageLive } from "@/app/dashboard/lists/[listId]/page";

const markNeedsCommitMock = vi.hoisted(() => vi.fn());

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
  createCollection: vi.fn(() => ({})),
}));

vi.mock("@/trpc/query-client", () => ({
  getQueryClient: () => ({
    getQueryData: () => [],
  }),
}));

vi.mock("@/hooks/use-save-before-navigate", () => ({
  useSaveBeforeNavigate: vi.fn(),
}));

vi.mock("@/components/forms/list-form", () => ({
  ListForm: ({ formRef }: { formRef?: { current: unknown } }) => {
    if (formRef) {
      formRef.current = {
        saveChanges: vi.fn().mockResolvedValue(true),
        hasPendingChanges: vi.fn().mockReturnValue(false),
        markNeedsCommit: markNeedsCommitMock,
      };
    }

    return <div>List Form</div>;
  },
}));

vi.mock("@/app/dashboard/lists/[listId]/_components/add-listings-section", () => ({
  AddListingsSection: ({
    onMutationSuccess,
  }: {
    onMutationSuccess?: () => void;
  }) => (
    <button type="button" onClick={onMutationSuccess}>
      Add listing
    </button>
  ),
}));

vi.mock("@/app/dashboard/lists/[listId]/_components/list-listings-table", () => ({
  ListListingsTable: ({
    onMutationSuccess,
  }: {
    onMutationSuccess?: () => void;
  }) => (
    <button type="button" onClick={onMutationSuccess}>
      Remove listing
    </button>
  ),
}));

describe("Manage list membership mutations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("marks list form as needing commit after add/remove membership changes", () => {
    render(<ManageListPageLive listId="list-1" />);

    fireEvent.click(screen.getByRole("button", { name: "Add listing" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove listing" }));

    expect(markNeedsCommitMock).toHaveBeenCalledTimes(2);
  });
});
