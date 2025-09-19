"use client";

import React, { createContext, useContext, useMemo } from "react";
import { useLiveQuery } from "@tanstack/react-db";
import { listingsCollection } from "@/app/dashboard-two/_lib/listings-collection";
import { listsCollection } from "@/app/dashboard-two/_lib/lists-collection";
import { imagesCollection } from "@/app/dashboard-two/_lib/images-collection";
import { ahsCollection } from "@/app/dashboard-two/_lib/ahs-collection";
import {
  insertListing,
  deleteListing as deleteListingMutation,
  setListingAhsId,
  updateListing as updateListingMutation,
} from "@/app/dashboard-two/_lib/listings-collection";
import {
  createImage,
  deleteImage,
  reorderImages,
} from "@/app/dashboard-two/_lib/images-collection";
import {
  addListingToList,
  removeListingFromList,
  insertList as createListMutation,
} from "@/app/dashboard-two/_lib/lists-collection";
import type { ListingRow } from "./types";
import type { RouterInputs } from "@/trpc/react";
// Note: Avoid importing legacy TRPC-backed utilities here. Keep this page
// fully on dashboard-two routers + collections.

type ContextValue = {
  listings: ListingRow[];
  lists: ListingRow["lists"];
  listingCount: number;
  isLoading: boolean;
  isPro: boolean;
  // handlers
  createListing: (input: {
    title: string;
    ahsId?: string | null;
  }) => Promise<{ id: string }>;
  updateListing: (
    input: RouterInputs["dashboardTwo"]["updateListing"],
  ) => Promise<void>;
  deleteListing: (id: string) => Promise<void>;
  updateListingLists: (input: {
    id: string;
    listIds: string[];
  }) => Promise<void>;
  setListingAhsId: (input: {
    id: string;
    ahsId: string | null;
  }) => Promise<void>;
  createImage: (input: { listingId: string; url: string }) => Promise<void>;
  deleteImage: (input: { id: string }) => Promise<void>;
  reorderImages: (input: {
    listingId: string;
    images: { id: string; order: number }[];
  }) => Promise<void>;
  createList: (title: string) => Promise<{ id: string; title: string }>;
};

const ListingsContext = createContext<ContextValue | null>(null);

export function DashboardTwoListingsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Pro gating from legacy stripe router is intentionally not used here.
  const isPro = true;

  const { data: rawListings = [], status: listingsStatus } = useLiveQuery((q) =>
    q
      .from({ listing: listingsCollection })
      .orderBy(({ listing }) => listing.createdAt ?? "", "desc"),
  );

  const { data: rawLists = [], status: listsStatus } = useLiveQuery((q) =>
    q
      .from({ list: listsCollection })
      .orderBy(({ list }) => list.title ?? "", "asc"),
  );

  const { data: rawImages = [], status: imagesStatus } = useLiveQuery((q) =>
    q
      .from({ img: imagesCollection })
      .orderBy(({ img }) => img.order ?? 0, "asc"),
  );

  const { data: rawAhs = [], status: ahsStatus } = useLiveQuery((q) =>
    q.from({ ahs: ahsCollection }),
  );

  const lists = useMemo(
    () => rawLists.map((l) => ({ id: l.id, title: l.title })),
    [rawLists],
  );

  const listings: ListingRow[] = useMemo(() => {
    return rawListings.map((l) => {
      const images = rawImages.filter((img) => img.listingId === l.id);

      const memberLists = rawLists
        .filter((lst) => (lst.listings ?? []).some((x) => x.id === l.id))
        .map((lst) => ({ id: lst.id, title: lst.title }));

      const ahs = l.ahsId
        ? (rawAhs.find((a) => a.id === l.ahsId) ?? null)
        : null;

      return {
        id: l.id,
        title: l.title ?? "",
        description: l.description ?? null,
        price: l.price ?? null,
        privateNote: l.privateNote ?? null,
        status: l.status ?? null,
        createdAt: l.createdAt ?? null,
        updatedAt: l.updatedAt ?? null,
        images,
        lists: memberLists,
        ahsListing: ahs ?? null,
      };
    });
  }, [rawListings, rawImages, rawLists, rawAhs]);

  const isLoading =
    listingsStatus === "loading" ||
    listsStatus === "loading" ||
    imagesStatus === "loading" ||
    ahsStatus === "loading";

  const value: ContextValue = {
    listings,
    lists,
    listingCount: listings.length,
    isLoading,
    isPro,
    createListing: async ({ title, ahsId }) => {
      const created = await insertListing(ahsId ? { title, ahsId } : { title });
      return { id: created.id };
    },
    updateListing: async ({ id, data }) => {
      await updateListingMutation({
        id,
        data,
      });
    },
    deleteListing: async (id: string) => {
      await deleteListingMutation({ id });
    },
    updateListingLists: async ({ id, listIds }) => {
      // Compute diffs and apply via list mutations
      const current = rawLists.filter((lst) =>
        (lst.listings ?? []).some((x) => x.id === id),
      );
      const currentIds = new Set(current.map((l) => l.id));
      const wanted = new Set(listIds);

      const toAdd = listIds.filter((lid) => !currentIds.has(lid));
      const toRemove = Array.from(currentIds).filter((lid) => !wanted.has(lid));

      await Promise.all([
        ...toAdd.map((lid) => addListingToList({ listId: lid, listingId: id })),
        ...toRemove.map((lid) =>
          removeListingFromList({ listId: lid, listingId: id }),
        ),
      ]);
    },
    setListingAhsId: async ({ id, ahsId }) => {
      await setListingAhsId({ id, ahsId });
    },
    createImage: async ({ listingId, url }) => {
      await createImage({ listingId, url });
    },
    deleteImage: async ({ id }) => {
      await deleteImage({ id });
    },
    reorderImages: async ({ listingId, images }) => {
      await reorderImages({ listingId, images });
    },
    createList: async (title: string) => {
      const created = await createListMutation({ title });
      return { id: created.id, title: created.title };
    },
  };

  return (
    <ListingsContext.Provider value={value}>
      {children}
    </ListingsContext.Provider>
  );
}

export function useDashboardTwoListings() {
  const ctx = useContext(ListingsContext);
  if (!ctx)
    throw new Error("useDashboardTwoListings must be used within provider");
  return ctx;
}
