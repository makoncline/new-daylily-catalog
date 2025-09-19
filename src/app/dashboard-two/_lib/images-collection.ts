"use client";

import { createCollection } from "@tanstack/react-db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";

import type { RouterInputs, RouterOutputs } from "@/trpc/react";
import {
  getQueryClient as getClientQueryClient,
  getTrpcClient,
} from "@/trpc/client";
import { cursorKey, getUserCursorKey } from "@/lib/utils/cursor";

const CURSOR_BASE = "images:maxUpdatedAt";
const DELETED_IDS = new Set<string>();

export type ImageCollectionItem =
  RouterOutputs["dashboardTwo"]["getImages"][number];

export const imagesCollection = createCollection(
  queryCollectionOptions<ImageCollectionItem>({
    queryClient: getClientQueryClient(),
    queryKey: ["dashboard-two", "images"],
    enabled: false,
    getKey: (row) => row.id,
    queryFn: async ({ queryKey, client }) => {
      const existingData: ImageCollectionItem[] =
        client.getQueryData(queryKey) ?? [];

      const cursorKeyToUse = getUserCursorKey(CURSOR_BASE);
      const lastSyncTime = localStorage.getItem(cursorKeyToUse);
      const newData = await getTrpcClient().dashboardTwo.syncImages.query({
        since: lastSyncTime ?? null,
      });

      const map = new Map(existingData.map((i) => [i.id, i]));
      newData.forEach((i) => map.set(i.id, i));
      DELETED_IDS.forEach((id) => map.delete(id));

      localStorage.setItem(cursorKeyToUse, new Date().toISOString());
      return Array.from(map.values());
    },
    onInsert: async () => ({ refetch: false }),
    onUpdate: async () => ({ refetch: false }),
    onDelete: async () => ({ refetch: false }),
  }),
);

type CreateImageDraft = RouterInputs["dashboardTwo"]["createImage"];
export async function createImage(draft: CreateImageDraft) {
  const cache =
    getClientQueryClient().getQueryData<ImageCollectionItem[]>([
      "dashboard-two",
      "images",
    ]) ?? [];
  const nextOrder =
    cache
      .filter((i) => i.listingId === draft.listingId)
      .reduce((m, i) => Math.max(m, i.order), -1) + 1;

  const temp: ImageCollectionItem = {
    id: `temp:${crypto.randomUUID()}`,
    url: draft.url,
    order: nextOrder,
    listingId: draft.listingId,
  };

  imagesCollection.utils.writeInsert(temp);

  try {
    const created =
      await getTrpcClient().dashboardTwo.createImage.mutate(draft);
    const tempExists = !!imagesCollection.get(temp.id);
    const realExists = !!imagesCollection.get(created.id);
    imagesCollection.utils.writeBatch(() => {
      if (tempExists) imagesCollection.utils.writeDelete(temp.id);
      if (!realExists) imagesCollection.utils.writeInsert(created);
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
  const cache =
    getClientQueryClient().getQueryData<ImageCollectionItem[]>([
      "dashboard-two",
      "images",
    ]) ?? [];

  const current = cache
    .filter((i) => i.listingId === draft.listingId)
    .sort((a, b) => a.order - b.order);

  const backup = current.map((i) => ({ id: i.id, order: i.order }));

  // optimistic
  imagesCollection.utils.writeBatch(() => {
    draft.images.forEach((img) => {
      imagesCollection.utils.writeUpdate({ id: img.id, order: img.order });
    });
  });

  try {
    await getTrpcClient().dashboardTwo.reorderImages.mutate(draft);
  } catch (err) {
    // rollback
    imagesCollection.utils.writeBatch(() => {
      backup.forEach((img) => {
        imagesCollection.utils.writeUpdate({ id: img.id, order: img.order });
      });
    });
    throw err;
  }
}

export async function deleteImage({ id }: { id: string }) {
  const previous = imagesCollection.get(id);

  // Capture current state before optimistic changes
  const clientCache =
    getClientQueryClient().getQueryData<ImageCollectionItem[]>([
      "dashboard-two",
      "images",
    ]) ?? [];
  const listingId = previous?.listingId ?? null;
  const before = listingId
    ? clientCache
        .filter((i) => i.listingId === listingId)
        .sort((a, b) => a.order - b.order)
        .map((i) => ({ id: i.id, order: i.order }))
    : [];

  imagesCollection.utils.writeDelete(id);

  if (listingId) {
    const remaining = before.filter((i) => i.id !== id);
    imagesCollection.utils.writeBatch(() => {
      remaining.forEach((img, index) => {
        imagesCollection.utils.writeUpdate({ id: img.id, order: index });
      });
    });
  }

  try {
    await getTrpcClient().dashboardTwo.deleteImage.mutate({ id });
  } catch (err) {
    // restore deleted record
    if (previous) imagesCollection.utils.writeInsert(previous);
    // restore original orders
    imagesCollection.utils.writeBatch(() => {
      before.forEach((img) => {
        imagesCollection.utils.writeUpdate({ id: img.id, order: img.order });
      });
    });
    throw err;
  }
}

export async function initializeImagesCollection(userId: string) {
  const trpc = getTrpcClient();
  const queryClient = getClientQueryClient();
  const images = await trpc.dashboardTwo.getImages.query();
  queryClient.setQueryData<ImageCollectionItem[]>(
    ["dashboard-two", "images"],
    images,
  );
  const cursorKeyToUse = cursorKey(CURSOR_BASE, userId);
  localStorage.setItem(cursorKeyToUse, new Date().toISOString());
}
