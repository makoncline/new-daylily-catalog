import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import { useLiveQuery } from "@tanstack/react-db";
import { QueryClient } from "@tanstack/react-query";
import type { RouterInputs, RouterOutputs } from "@/trpc/react";

type SyncInput = RouterInputs["dashboardTwo"]["syncListings"];
type SyncOutput = RouterOutputs["dashboardTwo"]["syncListings"];
type InsertInput = RouterInputs["dashboardTwo"]["insertListing"];
type UpdateInput = RouterInputs["dashboardTwo"]["updateListing"];
type DeleteInput = RouterInputs["dashboardTwo"]["deleteListing"];

type ListingRecord = SyncOutput[number];
type MinimalListing = Pick<ListingRecord, "id" | "title"> &
  Partial<ListingRecord>;

const toListingRecord = (partial: MinimalListing): ListingRecord => ({
  id: partial.id,
  title: partial.title,
  userId: partial.userId ?? "user-1",
  slug:
    partial.slug ??
    partial.title.toLowerCase().replace(/\s+/g, "-").slice(0, 32),
  price: partial.price ?? null,
  description: partial.description ?? null,
  privateNote: partial.privateNote ?? null,
  ahsId: partial.ahsId ?? null,
  status: partial.status ?? null,
  createdAt: partial.createdAt ?? new Date(0),
  updatedAt: partial.updatedAt ?? new Date(0),
});

const trpcClientMocks = vi.hoisted(() => {
  let queryClient!: QueryClient;
  const syncMock = vi.fn<(input: SyncInput) => Promise<SyncOutput>>();
  const insertMock = vi.fn<(input: InsertInput) => void | Promise<void>>();
  const updateMock = vi.fn<(input: UpdateInput) => void | Promise<void>>();
  const deleteMock = vi.fn<(input: DeleteInput) => void | Promise<void>>();
  return { queryClient, syncMock, insertMock, updateMock, deleteMock };
});
import {
  listingsCollection,
  insertListing,
  updateListing,
  deleteListing,
} from "@/lib/listings-collection";

vi.mock("@/trpc/client", () => ({
  getQueryClient: vi.fn(() => {
    const client = new QueryClient();
    trpcClientMocks.queryClient = client;
    return client;
  }),
  getTrpcClient: () => ({
    dashboardTwo: {
      syncListings: { query: trpcClientMocks.syncMock },
      insertListing: { mutate: trpcClientMocks.insertMock },
      updateListing: { mutate: trpcClientMocks.updateMock },
      deleteListing: { mutate: trpcClientMocks.deleteMock },
    },
  }),
}));

// --- types & test utilities ------------------------------------------------------

const setNextSync = (items: MinimalListing[]) =>
  trpcClientMocks.syncMock.mockResolvedValueOnce(items.map(toListingRecord));
const expectUI = async (count: number, titles: string) => {
  await waitFor(() => {
    expect(screen.getByTestId("count").textContent).toBe(String(count));
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
  const { data: items = [] } = useLiveQuery((q) =>
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
  trpcClientMocks.queryClient = new QueryClient();
  trpcClientMocks.queryClient.clear();
  vi.clearAllMocks();
});

describe("listingsCollection flow: empty → insert → update → delete", () => {
  it("renders live state via useLiveQuery (no manual refetches)", async () => {
    setNextSync([]);
    await renderAndStart();

    await waitFor(() => expect(trpcClientMocks.syncMock).toHaveBeenCalled());
    const firstCall = trpcClientMocks.syncMock.mock.calls[0];
    expect(firstCall?.[0]).toEqual(expect.objectContaining({ since: null }));
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
