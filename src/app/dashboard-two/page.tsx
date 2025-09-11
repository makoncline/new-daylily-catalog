"use client";

import { createCollection, useLiveQuery } from "@tanstack/react-db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { useCallback, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/trpc/react";
import { SignedIn } from "@clerk/nextjs";

// TODO: the get is currently returning all the listings on update
// i want it to only return the listing that was updated and update the local collection

interface ListingItem {
  id: string;
  title: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function Page() {
  return (
    <SignedIn>
      <PageContent />
    </SignedIn>
  );
}

function PageContent() {
  const createListing = api.dashboardTwo.createListing.useMutation();
  const updateListing = api.dashboardTwo.updateListing.useMutation();
  const deleteListing = api.dashboardTwo.deleteListing.useMutation();
  const getListings = api.dashboardTwo.getListings.useQuery();

  const queryClientForDemo = useQueryClient();

  const listingCollectionRef = useRef(
    createCollection<ListingItem>(
      queryCollectionOptions<ListingItem>({
        queryKey: ["dashboard-two", "listings"],
        queryFn: async () => {
          const listings = await getListings.refetch();
          return listings.data ?? [];
        },
        getKey: (item) => item.id,
        queryClient: queryClientForDemo,
        onInsert: async ({ transaction }) => {
          const { modified: newListing } = transaction.mutations[0];
          await createListing.mutateAsync(newListing);
        },
        onUpdate: async ({ transaction }) => {
          const { original, modified } = transaction.mutations[0];
          await updateListing.mutateAsync({
            id: original.id,
            title: modified.title,
          });
        },
        onDelete: async ({ transaction }) => {
          const { original } = transaction.mutations[0];
          await deleteListing.mutateAsync({ id: original.id });
        },
      }),
    ),
  );

  const listingCollection = listingCollectionRef.current;

  const { data: allListings = [] } = useLiveQuery((q) =>
    q
      .from({ listing: listingCollection })
      .orderBy(({ listing }) => listing.createdAt ?? "", "desc"),
  );

  const addListing = useCallback(() => {
    const id = crypto.randomUUID();
    listingCollection.insert({
      id,
      title: `New Listing ${id.slice(0, 6)}`,
    });
  }, [listingCollection]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");

  const startRename = useCallback((id: string, currentTitle: string) => {
    setEditingId(id);
    setEditingValue(currentTitle);
  }, []);

  const cancelRename = useCallback(() => {
    setEditingId(null);
    setEditingValue("");
  }, []);

  const saveRename = useCallback(() => {
    if (!editingId) return;
    listingCollection.update(editingId, (draft) => {
      draft.title = editingValue;
      draft.updatedAt = new Date().toISOString();
    });
    setEditingId(null);
    setEditingValue("");
  }, [editingId, editingValue, listingCollection]);

  const removeListing = useCallback(
    (id: string) => {
      listingCollection.delete(id);
    },
    [listingCollection],
  );

  return (
    <div className="flex w-full flex-col gap-6 p-6">
      <div className="text-xl font-semibold">TanStack DB Listing Example</div>

      <div className="flex items-center gap-4">
        <div
          className="cursor-pointer rounded-md bg-black px-4 py-2 text-white select-none hover:opacity-90 dark:bg-white dark:text-black"
          onClick={addListing}
          role="button"
          tabIndex={0}
        >
          Add Listing
        </div>

        <div className="text-muted-foreground text-sm">
          Total: {allListings.length}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {allListings.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between rounded-md border p-3"
          >
            <div className="flex items-center gap-3">
              {editingId === item.id ? (
                <div className="flex items-center gap-2">
                  <input
                    className="w-64 rounded-md border px-2 py-1"
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                  />
                </div>
              ) : (
                <div>{item.title}</div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {editingId === item.id ? (
                <>
                  <div
                    className="text-muted-foreground hover:bg-muted/10 cursor-pointer rounded-md px-3 py-1 select-none"
                    onClick={cancelRename}
                    role="button"
                    tabIndex={0}
                    title="Cancel"
                  >
                    Cancel
                  </div>
                  <div
                    className="cursor-pointer rounded-md px-3 py-1 text-green-600 select-none hover:bg-green-600/10"
                    onClick={saveRename}
                    role="button"
                    tabIndex={0}
                    title="Save"
                  >
                    Save
                  </div>
                </>
              ) : (
                <div
                  className="cursor-pointer rounded-md px-3 py-1 text-blue-600 select-none hover:bg-blue-600/10"
                  onClick={() => startRename(item.id, item.title)}
                  role="button"
                  tabIndex={0}
                  title="Rename"
                >
                  Rename
                </div>
              )}

              <div
                className="cursor-pointer rounded-md px-3 py-1 text-red-600 select-none hover:bg-red-600/10"
                onClick={() => removeListing(item.id)}
                role="button"
                tabIndex={0}
                title="Delete"
              >
                Delete
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="text-muted-foreground text-xs">
        Based on TanStack DB Quick Start. See docs:
        https://tanstack.com/db/latest/docs/quick-start
      </div>
    </div>
  );
}
