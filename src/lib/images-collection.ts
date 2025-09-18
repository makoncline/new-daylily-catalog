"use client";

import { createCollection } from "@tanstack/react-db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";

import { type Optional } from "prisma/generated/sqlite-client/runtime/library";
import type { QueryClient } from "@tanstack/query-core";
import type { RouterInputs, RouterOutputs } from "@/trpc/react";
import {
  getQueryClient as getClientQueryClient,
  getTrpcClient,
} from "@/trpc/client";

let _queryClient: QueryClient | undefined = undefined;
const getQueryClient = () => {
  if (_queryClient) return _queryClient;
  _queryClient = getClientQueryClient();
  return _queryClient;
};

const CURSOR_KEY = "images:maxUpdatedAt";
const DELETED_IDS = new Set<string>();

export type ImageCollectionItem = Optional<
  RouterOutputs["dashboardTwo"]["getImages"][number]
> & {
  id: string;
  url: string;
  order: number;
  listingId: string | null;
};

export const imagesCollection = createCollection(
  queryCollectionOptions<ImageCollectionItem>({
    queryClient: getQueryClient(),
    queryKey: ["dashboard-two", "images"],
    getKey: (row) => row.id,
    queryFn: async ({ queryKey, client }) => {
      const existingData: ImageCollectionItem[] =
        client.getQueryData(queryKey) ?? [];

      const lastSyncTime = localStorage.getItem(CURSOR_KEY);
      const newData = await getTrpcClient().dashboardTwo.syncImages.query({
        since: lastSyncTime ?? null,
      });

      const existingMap = new Map(existingData.map((item) => [item.id, item]));
      newData.forEach((item) => existingMap.set(item.id, item));
      DELETED_IDS.forEach((id) => existingMap.delete(id));

      localStorage.setItem(CURSOR_KEY, new Date().toISOString());
      return Array.from(existingMap.values());
    },
    onInsert: async () => ({ refetch: false }),
    onUpdate: async () => ({ refetch: false }),
    onDelete: async () => ({ refetch: false }),
  }),
);

type CreateImageDraft = RouterInputs["dashboardTwo"]["createImage"];
export async function createImage(draft: CreateImageDraft) {
  // Optimistic insert: temp id
  const existing =
    getQueryClient().getQueryData(["dashboard-two", "images"]) ?? [];
  const nextOrder =
    (existing
      .filter((i) => i.listingId === draft.listingId)
      .reduce((m, i) => Math.max(m, i.order ?? 0), -1) ?? -1) + 1;

  const temp = {
    id: `temp:${crypto.randomUUID()}`,
    url: draft.url,
    order: nextOrder,
    listingId: draft.listingId,
  } as ImageCollectionItem;

  imagesCollection.utils.writeInsert(temp);
  try {
    const created =
      await getTrpcClient().dashboardTwo.createImage.mutate(draft);
    const tempPresent = !!imagesCollection.get(temp.id);
    const realPresent = !!imagesCollection.get(created.id);
    imagesCollection.utils.writeBatch(() => {
      if (tempPresent) imagesCollection.utils.writeDelete(temp.id);
      if (!realPresent)
        imagesCollection.utils.writeInsert(created as ImageCollectionItem);
    });
    return created;
  } catch (err) {
    try {
      imagesCollection.utils.writeDelete(temp.id);
    } catch {}
    throw err;
  }
}

type ReorderDraft = RouterInputs["dashboardTwo"]["reorderImages"];
export async function reorderImages(draft: ReorderDraft) {
  // Optimistic: update orders for given listing id
  const cache = getQueryClient().getQueryData(["dashboard-two", "images"]);
  const current = cache.filter((i) => i.listingId === draft.listingId);
  const backup = current.map((i) => ({ id: i.id, order: i.order }));

  imagesCollection.utils.writeBatch(() => {
    draft.images.forEach((img) => {
      imagesCollection.utils.writeUpdate({
        id: img.id,
        order: img.order,
      } as Partial<ImageCollectionItem> & { id: string });
    });
  });

  try {
    await getTrpcClient().dashboardTwo.reorderImages.mutate(draft);
  } catch (err) {
    // rollback
    imagesCollection.utils.writeBatch(() => {
      backup.forEach((img) =>
        imagesCollection.utils.writeUpdate({
          id: img.id,
          order: img.order,
        } as Partial<ImageCollectionItem> & { id: string }),
      );
    });
    throw err;
  }
}

export async function deleteImage({ id }: { id: string }) {
  const previous = imagesCollection.get(id);
  imagesCollection.utils.writeDelete(id);
  // Optimistically renumber remaining images for this listing
  if (previous?.listingId) {
    const cache =
      getQueryClient().getQueryData(["dashboard-two", "images"]) ?? [];
    const remaining = cache
      .filter((i) => i.listingId === previous.listingId)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    imagesCollection.utils.writeBatch(() => {
      remaining.forEach((img, index) => {
        imagesCollection.utils.writeUpdate({
          id: img.id,
          order: index,
        } as Partial<ImageCollectionItem> & { id: string });
      });
    });
  }
  try {
    await getTrpcClient().dashboardTwo.deleteImage.mutate({ id });
  } catch (err) {
    if (previous) imagesCollection.utils.writeInsert(previous);
    throw err;
  }
}

export async function initializeImagesCollection() {
  const trpc = getTrpcClient();
  const queryClient = getQueryClient();
  const images = await trpc.dashboardTwo.getImages.query();
  queryClient.setQueryData<ImageCollectionItem[]>(
    ["dashboard-two", "images"],
    images,
  );
  localStorage.setItem(CURSOR_KEY, new Date().toISOString());
}
