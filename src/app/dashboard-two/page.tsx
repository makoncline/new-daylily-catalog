"use client";

import { useLiveQuery } from "@tanstack/react-db";
import { useCallback, useMemo, useState } from "react";
import { SignedIn } from "@clerk/nextjs";
import React from "react";
import { DashboardProvider } from "./_components/listings-init-provider";
import { listingsCollection as listingCollection } from "@/app/dashboard-two/_lib/listings-collection";
import {
  insertListing,
  updateListing,
  deleteListing,
  setListingAhsId,
} from "@/app/dashboard-two/_lib/listings-collection";
import { imagesCollection } from "@/app/dashboard-two/_lib/images-collection";
import {
  createImage as createListingImage,
  deleteImage as deleteListingImage,
  reorderImages as reorderListingImages,
} from "@/app/dashboard-two/_lib/images-collection";
import { listsCollection } from "@/app/dashboard-two/_lib/lists-collection";
import {
  insertList,
  updateList,
  deleteList,
  addListingToList,
  removeListingFromList,
} from "@/app/dashboard-two/_lib/lists-collection";
import { api } from "@/trpc/react";

export default function Page() {
  return (
    <SignedIn>
      <DashboardProvider>
        <PageContent />
      </DashboardProvider>
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
    q
      .from({ list: listsCollection })
      .orderBy(({ list }) => list.createdAt ?? "", "desc"),
  );

  const { data: allImages = [] } = useLiveQuery((q) =>
    q
      .from({ img: imagesCollection })
      .orderBy(({ img }) => (img.order ?? 0) as number, "asc"),
  );

  const addListing = async () => {
    await insertListing({
      title: `New Listing ${crypto.randomUUID().slice(0, 6)}`,
    });
  };

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");

  // Per-listing temporary input for linking an AHS id
  const [linkInputs, setLinkInputs] = useState<Record<string, string>>({});

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
      <AhsSearchBar />

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
                  <div className="text-muted-foreground text-xs">
                    {(() => {
                      const memberLists = allLists.filter((l) =>
                        (l.listings ?? []).some((x) => x.id === item.id),
                      );
                      return memberLists.length
                        ? `Lists: ${memberLists.map((l) => l.title).join(", ")}`
                        : "Lists: (none)";
                    })()}
                  </div>
                  {item.ahsId ? <AhsDetails id={item.ahsId} /> : null}
                  {/* List images with per-image reorder button */}
                  <div className="mt-2 space-y-1 text-xs">
                    <div className="text-muted-foreground">Images:</div>
                    {(() => {
                      const listingImages = allImages
                        .filter((img) => img.listingId === item.id)
                        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
                      if (!listingImages.length) {
                        return (
                          <div className="text-muted-foreground">(none)</div>
                        );
                      }
                      return (
                        <div className="space-y-1">
                          {listingImages.map((img, idx) => (
                            <div
                              key={img.id}
                              className="flex items-center gap-2"
                            >
                              <span className="max-w-[260px] truncate">
                                {img.id}
                              </span>
                              <span className="text-muted-foreground">
                                #{img.order ?? idx}
                              </span>
                              <div
                                className="cursor-pointer rounded-md px-2 py-0.5 text-[10px] text-blue-700 select-none hover:bg-blue-700/10"
                                onClick={async () => {
                                  try {
                                    if (idx === 0) {
                                      console.error(
                                        "No previous image to move before.",
                                      );
                                      return;
                                    }
                                    const prev = listingImages[idx - 1];
                                    if (!prev) {
                                      console.error("Previous image missing.");
                                      return;
                                    }
                                    await reorderListingImages({
                                      listingId: item.id,
                                      images: [
                                        {
                                          id: img.id,
                                          order: prev.order ?? idx - 1,
                                        },
                                        {
                                          id: prev.id,
                                          order: img.order ?? idx,
                                        },
                                      ],
                                    });
                                  } catch (err) {
                                    console.error(
                                      "Failed to move image left:",
                                      err,
                                    );
                                  }
                                }}
                                role="button"
                                tabIndex={0}
                                title="Move this image left"
                              >
                                Left
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Images demo controls */}
              <div
                className="cursor-pointer rounded-md px-3 py-1 text-xs text-purple-700 select-none hover:bg-purple-700/10"
                onClick={async () => {
                  try {
                    await createListingImage({
                      listingId: item.id,
                      url: "https://placehold.co/200",
                    });
                  } catch (err) {
                    console.error("Failed to add placeholder image:", err);
                  }
                }}
                role="button"
                tabIndex={0}
                title="Add placeholder image"
              >
                Add Img
              </div>

              <div
                className="cursor-pointer rounded-md px-3 py-1 text-xs text-amber-700 select-none hover:bg-amber-700/10"
                onClick={async () => {
                  try {
                    const listingImages = allImages.filter(
                      (img) => img.listingId === item.id,
                    );
                    if (!listingImages.length) {
                      console.error("No images to delete for this listing.");
                      return;
                    }
                    const firstImg = listingImages[0];
                    if (!firstImg) {
                      console.error("No images found.");
                      return;
                    }
                    await deleteListingImage({ id: firstImg.id });
                  } catch (err) {
                    console.error("Failed to delete image:", err);
                  }
                }}
                role="button"
                tabIndex={0}
                title="Delete first image"
              >
                Del Img
              </div>

              <div
                className="cursor-pointer rounded-md px-3 py-1 text-xs text-blue-700 select-none hover:bg-blue-700/10"
                onClick={async () => {
                  try {
                    const listingImages = allImages
                      .filter((img) => img.listingId === item.id)
                      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
                    if (listingImages.length < 2) {
                      console.error("Need at least 2 images to reorder.");
                      return;
                    }
                    // Swap first two images' orders (simple left move demo)
                    const i0 = listingImages[0];
                    const i1 = listingImages[1];
                    if (!i0 || !i1) {
                      console.error("Insufficient images to reorder.");
                      return;
                    }
                    await reorderListingImages({
                      listingId: item.id,
                      images: [
                        { id: i1.id, order: i0.order ?? 0 },
                        { id: i0.id, order: i1.order ?? 1 },
                      ],
                    });
                  } catch (err) {
                    console.error("Failed to reorder images:", err);
                  }
                }}
                role="button"
                tabIndex={0}
                title="Move left (swap first two)"
              >
                Left
              </div>

              {/* Simple AHS link input/button for demo */}
              <input
                className="w-48 rounded-md border px-2 py-1 text-xs"
                placeholder="Enter AHS ID"
                value={linkInputs[item.id] ?? ""}
                onChange={(e) =>
                  setLinkInputs((prev) => ({
                    ...prev,
                    [item.id]: e.target.value,
                  }))
                }
              />
              <div
                className="cursor-pointer rounded-md px-3 py-1 text-xs text-purple-700 select-none hover:bg-purple-700/10"
                onClick={async () => {
                  const ahsId = (linkInputs[item.id] ?? "").trim();
                  if (!ahsId) {
                    console.error("Please enter an AHS ID to link.");
                    return;
                  }
                  try {
                    await setListingAhsId({ id: item.id, ahsId });
                  } catch (err) {
                    console.error("Failed to link AHS ID:", err);
                  }
                }}
                role="button"
                tabIndex={0}
                title="Link AHS ID"
              >
                Link AHS
              </div>

              <div
                className="cursor-pointer rounded-md px-3 py-1 text-purple-600 select-none hover:bg-purple-600/10"
                onClick={async () => {
                  const candidates = allLists.filter(
                    (l) => !(l.listings ?? []).some((x) => x.id === item.id),
                  );
                  if (!candidates.length) {
                    console.error("No lists available to add to.");
                    return;
                  }
                  const chosenIndex = Math.floor(
                    Math.random() * candidates.length,
                  );
                  const chosen = candidates[chosenIndex];
                  if (!chosen) {
                    console.error("No lists available to add to.");
                    return;
                  }
                  await addListingToList({
                    listId: chosen.id,
                    listingId: item.id,
                  });
                }}
                role="button"
                tabIndex={0}
                title="Add to random list"
              >
                Add List
              </div>

              <div
                className="cursor-pointer rounded-md px-3 py-1 text-amber-600 select-none hover:bg-amber-600/10"
                onClick={async () => {
                  const member = allLists.find((l) =>
                    (l.listings ?? []).some((x) => x.id === item.id),
                  );
                  if (!member) {
                    console.error("Listing is not in any list to remove from.");
                    return;
                  }
                  await removeListingFromList({
                    listId: member.id,
                    listingId: item.id,
                  });
                }}
                role="button"
                tabIndex={0}
                title="Remove from first list"
              >
                Remove
              </div>

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

      <div className="bg-muted/60 h-px w-full" />

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

        <div className="text-muted-foreground text-sm">
          Total: {allLists.length}
        </div>
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
                  <div className="text-muted-foreground text-xs">
                    {(() => {
                      const titles = (item.listings ?? [])
                        .map(
                          ({ id }) =>
                            allListings.find((l) => l.id === id)?.title,
                        )
                        .filter(Boolean)
                        .join(", ");
                      return titles
                        ? `Listings: ${titles}`
                        : "Listings: (none)";
                    })()}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div
                className="cursor-pointer rounded-md px-3 py-1 text-purple-600 select-none hover:bg-purple-600/10"
                onClick={async () => {
                  const currentIds = new Set(
                    (item.listings ?? []).map((x) => x.id),
                  );
                  const candidates = allListings.filter(
                    (l) => !currentIds.has(l.id),
                  );
                  if (!candidates.length) {
                    console.error("No listings available to add to this list.");
                    return;
                  }
                  const chosenIndex = Math.floor(
                    Math.random() * candidates.length,
                  );
                  const chosen = candidates[chosenIndex];
                  if (!chosen) {
                    console.error("No listings available to add to this list.");
                    return;
                  }
                  await addListingToList({
                    listId: item.id,
                    listingId: chosen.id,
                  });
                }}
                role="button"
                tabIndex={0}
                title="Add random listing to this list"
              >
                Add Listing
              </div>

              <div
                className="cursor-pointer rounded-md px-3 py-1 text-amber-600 select-none hover:bg-amber-600/10"
                onClick={async () => {
                  const first = (item.listings ?? [])[0];
                  if (!first) {
                    console.error("No listings in this list to remove.");
                    return;
                  }
                  await removeListingFromList({
                    listId: item.id,
                    listingId: first.id,
                  });
                }}
                role="button"
                tabIndex={0}
                title="Remove first listing from this list"
              >
                Remove Listing
              </div>

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

function AhsDetails({ id }: { id: string }) {
  const { data } = api.ahs.get.useQuery(
    { id },
    {
      staleTime: 1000 * 60 * 60 * 24 * 7,
      gcTime: 1000 * 60 * 60 * 24 * 14,
    },
  );

  if (!data) return null;

  return (
    <div className="text-muted-foreground mt-1 text-xs">
      {data.name ? `${data.name}` : "Unnamed"}
      {data.hybridizer ? ` • ${data.hybridizer}` : ""}
      {data.year ? ` • ${data.year}` : ""}
    </div>
  );
}

function AhsSearchBar() {
  const [value, setValue] = useState("");
  const enabled = value.trim().length >= 3;
  const { data = [], isLoading } = api.dashboardTwo.searchAhs.useQuery(
    { query: value.trim() },
    { enabled },
  );

  const results = useMemo(() => data ?? [], [data]);

  return (
    <div className="flex flex-col gap-2">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search AHS (name)..."
        className="w-full rounded-md border px-3 py-2"
      />
      {enabled && (
        <div className="rounded-md border p-2 text-sm">
          {isLoading ? (
            <div className="text-muted-foreground">Loading…</div>
          ) : results.length ? (
            <ul className="space-y-1">
              {results.map((r) => (
                <li key={r.id} className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">{r.name ?? "(no name)"}</span>
                    <span className="text-muted-foreground ml-2 text-xs">
                      {r.id}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-muted-foreground">No results</div>
          )}
        </div>
      )}
    </div>
  );
}
