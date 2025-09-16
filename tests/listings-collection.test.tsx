import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import { useLiveQuery } from "@tanstack/react-db";

// --- mocks ---------------------------------------------------------------
vi.mock("@/trpc/client", () => {
  const { QueryClient } = require("@tanstack/query-core");
  const queryClient = new QueryClient();
  const syncMock = vi.fn();
  const insertMock = vi.fn();
  const updateMock = vi.fn();
  const deleteMock = vi.fn();
  return {
    getQueryClient: vi.fn(() => queryClient),
    getTrpcClient: () => ({
      dashboardTwo: {
        syncListings: { query: syncMock },
        insertListing: { mutate: insertMock },
        updateListing: { mutate: updateMock },
        deleteListing: { mutate: deleteMock },
      },
    }),
    __mocks: { queryClient, syncMock, insertMock, updateMock, deleteMock },
  };
});
import { __mocks as trpcClientMocks } from "@/trpc/client";
import {
  listingsCollection,
  insertListing,
  updateListing,
  deleteListing,
} from "@/lib/listings-collection";

// --- types & test utilities ------------------------------------------------------
type Item = { id: string; title?: string };

const setNextSync = (items: Array<Item>) =>
  trpcClientMocks.syncMock.mockResolvedValueOnce(items);
const expectUI = async (count: number, titles: string) => {
  await waitFor(() => {
    expect(screen.getByTestId("count")).toHaveTextContent(String(count));
    expect(screen.getByTestId("titles").textContent).toBe(titles);
  });
};
const renderAndStart = async () =>
  await act(async () => {
    render(<ListingsViewer />);
    listingsCollection.startSyncImmediate();
  });

// Minimal viewer to assert live state
function ListingsViewer() {
  const { data: items = [] } = useLiveQuery<Item>((q) =>
    q
      .from({ row: listingsCollection })
      .orderBy(({ row }) => (row.title ?? "") as string, "asc"),
  );
  return (
    <div>
      <div data-testid="count">{items.length}</div>
      <div data-testid="titles">{items.map((i) => i.title).join(",")}</div>
    </div>
  );
}

beforeEach(() => {
  localStorage.clear();
  trpcClientMocks.queryClient.clear();
  vi.clearAllMocks(); // resets sync/insert/update/delete mocks
});

afterEach(() => {
  // Stop any background sync work to prevent cross-test leakage
  if (listingsCollection.stopSync) {
    listingsCollection.stopSync();
  }
});

describe("listingsCollection flow: empty → insert → update → delete", () => {
  it("renders live state via useLiveQuery (no manual refetches)", async () => {
    setNextSync([]);
    await renderAndStart();

    await waitFor(() => expect(trpcClientMocks.syncMock).toHaveBeenCalled());
    const [[params]] = trpcClientMocks.syncMock.mock.calls;
    expect(params).toEqual(expect.objectContaining({ since: null }));
    await expectUI(0, "");

    // Insert
    setNextSync([{ id: "1", title: "Hello" }]);
    await act(async () => {
      await insertListing({ title: "Hello" });
    });
    expect(trpcClientMocks.insertMock).toHaveBeenCalledWith({ title: "Hello" });
    expect(trpcClientMocks.insertMock).toHaveBeenCalledTimes(1);
    await expectUI(1, "Hello");

    // Update
    setNextSync([{ id: "1", title: "Hello Updated" }]);
    await act(async () => {
      await updateListing({ id: "1", title: "Hello Updated" });
    });
    expect(trpcClientMocks.updateMock).toHaveBeenCalledWith({
      id: "1",
      title: "Hello Updated",
    });
    expect(trpcClientMocks.updateMock).toHaveBeenCalledTimes(1);
    await expectUI(1, "Hello Updated");

    // Delete
    setNextSync([]); // incremental sync removes
    await act(async () => {
      await deleteListing({ id: "1" });
    });
    expect(trpcClientMocks.deleteMock).toHaveBeenCalledWith({ id: "1" });
    expect(trpcClientMocks.deleteMock).toHaveBeenCalledTimes(1);
    await expectUI(0, "");
  });
});
