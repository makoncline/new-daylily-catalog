"use client";

import { useLiveQuery } from "@tanstack/react-db";
import { useCallback, useState } from "react";
import { SignedIn } from "@clerk/nextjs";
import React from "react";
import { listingsCollection as listingCollection } from "@/lib/listings-collection";
import {
  insertListing,
  updateListing,
  deleteListing,
} from "@/lib/listings-collection";
import { listsCollection } from "@/lib/lists-collection";
import { insertList, updateList, deleteList } from "@/lib/lists-collection";

export default function Page() {
  return (
    <SignedIn>
      <PageContent />
    </SignedIn>
  );
}

function PageContent() {
  const { data: allListings = [] } = useLiveQuery((q) =>
    q
      .from({ listing: listingCollection })
      .orderBy(({ listing }) => listing.createdAt ?? "", "desc"),
  );

  const { data: allLists = [] } = useLiveQuery((q) =>
    q.from({ list: listsCollection }).orderBy(({ list }) => list.createdAt ?? "", "desc"),
  );

  const addListing = async () => {
    await insertListing({
      title: `New Listing ${crypto.randomUUID().slice(0, 6)}`,
    });
  };

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

  const saveRename = useCallback(async () => {
    if (!editingId) return;

    try {
      await updateListing({ id: editingId, title: editingValue });
    } finally {
      setEditingId(null);
      setEditingValue("");
    }
  }, [editingId, editingValue]);

  const removeListing = async (id: string) => {
    await deleteListing({ id });
  };

  const addList = async () => {
    await insertList({ title: `New List ${crypto.randomUUID().slice(0, 6)}` });
  };

  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editingListValue, setEditingListValue] = useState<string>("");

  const startRenameList = useCallback((id: string, currentTitle: string) => {
    setEditingListId(id);
    setEditingListValue(currentTitle);
  }, []);

  const cancelRenameList = useCallback(() => {
    setEditingListId(null);
    setEditingListValue("");
  }, []);

  const saveRenameList = useCallback(async () => {
    if (!editingListId) return;
    try {
      await updateList({ id: editingListId, title: editingListValue });
    } finally {
      setEditingListId(null);
      setEditingListValue("");
    }
  }, [editingListId, editingListValue]);

  const removeList = async (id: string) => {
    await deleteList({ id });
  };

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
                <div>
                  {item.title} {item.id}
                </div>
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

      <div className="h-px w-full bg-muted/60" />

      <div className="text-xl font-semibold">TanStack DB List Example</div>

      <div className="flex items-center gap-4">
        <div
          className="cursor-pointer rounded-md bg-black px-4 py-2 text-white select-none hover:opacity-90 dark:bg-white dark:text-black"
          onClick={addList}
          role="button"
          tabIndex={0}
        >
          Add List
        </div>

        <div className="text-muted-foreground text-sm">Total: {allLists.length}</div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {allLists.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between rounded-md border p-3"
          >
            <div className="flex items-center gap-3">
              {editingListId === item.id ? (
                <div className="flex items-center gap-2">
                  <input
                    className="w-64 rounded-md border px-2 py-1"
                    value={editingListValue}
                    onChange={(e) => setEditingListValue(e.target.value)}
                  />
                </div>
              ) : (
                <div>
                  {item.title} {item.id}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {editingListId === item.id ? (
                <>
                  <div
                    className="text-muted-foreground hover:bg-muted/10 cursor-pointer rounded-md px-3 py-1 select-none"
                    onClick={cancelRenameList}
                    role="button"
                    tabIndex={0}
                    title="Cancel"
                  >
                    Cancel
                  </div>
                  <div
                    className="cursor-pointer rounded-md px-3 py-1 text-green-600 select-none hover:bg-green-600/10"
                    onClick={saveRenameList}
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
                  onClick={() => startRenameList(item.id, item.title)}
                  role="button"
                  tabIndex={0}
                  title="Rename"
                >
                  Rename
                </div>
              )}

              <div
                className="cursor-pointer rounded-md px-3 py-1 text-red-600 select-none hover:bg-red-600/10"
                onClick={() => removeList(item.id)}
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
