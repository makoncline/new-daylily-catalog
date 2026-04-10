import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useListResource } from "@/app/dashboard/_lib/dashboard-db/use-list-resource";

const useSeededDashboardDbQueryMock = vi.hoisted(() => vi.fn());

vi.mock("@/app/dashboard/_lib/dashboard-db/use-seeded-dashboard-db-query", () => ({
  useSeededDashboardDbQuery: useSeededDashboardDbQueryMock,
}));

vi.mock("@/app/dashboard/_lib/dashboard-db/lists-collection", () => ({
  listsCollection: {},
}));

describe("useListResource", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("filters seeded fallback results by the requested listId", () => {
    useSeededDashboardDbQueryMock.mockReturnValue({
      data: [
        {
          id: "list-2",
          userId: "user-1",
          title: "Other List",
          description: null,
          status: null,
          createdAt: new Date("2025-01-01T00:00:00.000Z"),
          updatedAt: new Date("2025-01-01T00:00:00.000Z"),
          listings: [],
        },
        {
          id: "list-1",
          userId: "user-1",
          title: "Requested List",
          description: null,
          status: null,
          createdAt: new Date("2025-01-01T00:00:00.000Z"),
          updatedAt: new Date("2025-01-01T00:00:00.000Z"),
          listings: [],
        },
      ],
      isReady: false,
    });

    const { result } = renderHook(() => useListResource("list-1"));

    expect(result.current.isReady).toBe(false);
    expect(result.current.list).toMatchObject({
      id: "list-1",
      title: "Requested List",
    });
  });
});
