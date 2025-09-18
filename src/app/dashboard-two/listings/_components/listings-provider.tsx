"use client";

import React, { createContext, useContext, useMemo } from "react";
import { useLiveQuery } from "@tanstack/react-db";
import { listingsCollection } from "@/app/dashboard-two/_lib/listings-collection";
import { listsCollection } from "@/app/dashboard-two/_lib/lists-collection";
import { imagesCollection } from "@/app/dashboard-two/_lib/images-collection";
import { ahsCollection } from "@/app/dashboard-two/_lib/ahs-collection";
import { insertListing, deleteListing as deleteListingMutation, setListingAhsId } from "@/app/dashboard-two/_lib/listings-collection";
import {
  createImage,
  deleteImage,
  reorderImages,
} from "@/app/dashboard-two/_lib/images-collection";
import { addListingToList, removeListingFromList, insertList as createListMutation } from "@/app/dashboard-two/_lib/lists-collection";
import { getTrpcClient } from "@/trpc/client";
// Note: Avoid importing legacy TRPC-backed utilities here. Keep this page
// fully on dashboard-two routers + collections.

export type TwoImage = { id: string; url: string; order?: number | null };
export type TwoListRef = { id: string; title: string };
export type TwoAhs = {
  id: string;
  name?: string | null;
  hybridizer?: string | null;
  year?: number | string | null;
  scapeHeight?: string | null;
  bloomSize?: string | null;
  bloomSeason?: string | null;
  ploidy?: string | null;
  foliageType?: string | null;
  budcount?: string | number | null;
  branches?: string | number | null;
  color?: string | null;
  form?: string | null;
  fragrance?: string | null;
  ahsImageUrl?: string | null;
} | null;

export type TwoListingRow = {
  id: string;
  title: string;
  description?: string | null;
  price?: number | null;
  privateNote?: string | null;
  status?: string | null;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
  images: TwoImage[];
  lists: TwoListRef[];
  ahsListing: TwoAhs;
};

type ContextValue = {
  listings: TwoListingRow[];
  lists: TwoListRef[];
  listingCount: number;
  isLoading: boolean;
  // handlers
  createListing: (input: { title: string; ahsId?: string | null }) => Promise<{ id: string }>;
  editListing: (id: string) => void;
  updateListing: (input: { id: string } & Partial<TwoListingRow>) => Promise<void>;
  deleteListing: (id: string) => Promise<void>;
  updateListingLists: (input: { id: string; listIds: string[] }) => Promise<void>;
  setListingAhsId: (input: { id: string; ahsId: string | null }) => Promise<void>;
  createImage: (input: { listingId: string; url: string }) => Promise<void>;
  deleteImage: (input: { id: string }) => Promise<void>;
  reorderImages: (input: {
    listingId: string;
    images: { id: string; order: number }[];
  }) => Promise<void>;
  createList: (title: string) => Promise<{ id: string; title: string }>;
  isPro: boolean;
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
    q.from({ list: listsCollection }).orderBy(({ list }) => list.title ?? "", "asc"),
  );

  const { data: rawImages = [], status: imagesStatus } = useLiveQuery((q) =>
    q
      .from({ img: imagesCollection })
      .orderBy(({ img }) => (img.order ?? 0) as number, "asc"),
  );

  const { data: rawAhs = [], status: ahsStatus } = useLiveQuery((q) =>
    q.from({ ahs: ahsCollection }),
  );

  const lists: TwoListRef[] = useMemo(
    () => rawLists.map((l) => ({ id: l.id, title: l.title })),
    [rawLists],
  );

  const listings: TwoListingRow[] = useMemo(() => {
    return rawListings.map((l) => {
      const images = rawImages
        .filter((img) => img.listingId === l.id)
        .map((img) => ({ id: img.id, url: img.url, order: img.order })) as TwoImage[];

      const memberLists: TwoListRef[] = rawLists
        .filter((lst) => (lst.listings ?? []).some((x) => x.id === l.id))
        .map((lst) => ({ id: lst.id, title: lst.title }));

      const ahs = l.ahsId ? rawAhs.find((a) => a.id === l.ahsId) ?? null : null;
      const ahsListing: TwoAhs = ahs
        ? {
            id: (ahs as any).id,
            name: (ahs as any).name ?? null,
            hybridizer: (ahs as any).hybridizer ?? null,
            year: (ahs as any).year ?? null,
            scapeHeight: (ahs as any).scapeHeight ?? null,
            bloomSize: (ahs as any).bloomSize ?? null,
            bloomSeason: (ahs as any).bloomSeason ?? null,
            form: (ahs as any).form ?? null,
            ploidy: (ahs as any).ploidy ?? null,
            foliageType: (ahs as any).foliageType ?? null,
            bloomHabit: (ahs as any).bloomHabit ?? null,
            budcount: (ahs as any).budcount ?? null,
            branches: (ahs as any).branches ?? null,
            sculpting: (ahs as any).sculpting ?? null,
            foliage: (ahs as any).foliage ?? null,
            flower: (ahs as any).flower ?? null,
            fragrance: (ahs as any).fragrance ?? null,
            parentage: (ahs as any).parentage ?? null,
            color: (ahs as any).color ?? null,
            ahsImageUrl: (ahs as any).ahsImageUrl ?? null,
          }
        : null;

      return {
        id: l.id,
        title: l.title ?? "",
        description: (l as any).description ?? null,
        price: (l as any).price ?? null,
        privateNote: (l as any).privateNote ?? null,
        status: (l as any).status ?? null,
        createdAt: (l as any).createdAt ?? null,
        updatedAt: (l as any).updatedAt ?? null,
        images,
        lists: memberLists,
        ahsListing,
      } as TwoListingRow;
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
      const created = await insertListing({ title });
      if (ahsId) {
        await setListingAhsId({ id: created.id, ahsId });
      }
      return { id: created.id };
    },
    // Editing via legacy dialog is not wired on this page to avoid TRPC.
    editListing: (_id: string) => {},
    updateListing: async ({ id, ...rest }) => {
      const previous = listingsCollection.get(id);
      listingsCollection.utils.writeUpdate({ id, ...rest } as any);
      try {
        const data: any = {};
        ["title", "description", "price", "status", "privateNote"].forEach((k) => {
          if ((rest as any)[k] !== undefined) data[k] = (rest as any)[k];
        });
        await getTrpcClient().dashboardTwo.updateListingFields.mutate({ id, data });
      } catch (err) {
        if (previous) listingsCollection.utils.writeUpdate(previous);
        throw err;
      }
    },
    deleteListing: async (id: string) => {
      await deleteListingMutation({ id });
    },
    updateListingLists: async ({ id, listIds }) => {
      // Compute diffs and apply via list mutations
      const current = rawLists.filter((lst) => (lst.listings ?? []).some((x) => x.id === id));
      const currentIds = new Set(current.map((l) => l.id));
      const wanted = new Set(listIds);

      const toAdd = listIds.filter((lid) => !currentIds.has(lid));
      const toRemove = Array.from(currentIds).filter((lid) => !wanted.has(lid));

      await Promise.all([
        ...toAdd.map((lid) => addListingToList({ listId: lid, listingId: id })),
        ...toRemove.map((lid) => removeListingFromList({ listId: lid, listingId: id })),
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
    <ListingsContext.Provider value={value}>{children}</ListingsContext.Provider>
  );
}

export function useDashboardTwoListings() {
  const ctx = useContext(ListingsContext);
  if (!ctx) throw new Error("useDashboardTwoListings must be used within provider");
  return ctx;
}
