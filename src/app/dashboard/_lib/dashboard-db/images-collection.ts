"use client";

import { createCollection } from "@tanstack/react-db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import type { RouterInputs, RouterOutputs } from "@/trpc/react";
import { getQueryClient } from "@/trpc/query-client";
import { getTrpcClient } from "@/trpc/client";
import {
  cursorKey,
  getUserCursorKey,
  setCurrentUserId,
} from "@/lib/utils/cursor";

const CURSOR_BASE = "dashboard-db:images:maxUpdatedAt";
const DELETED_IDS = new Set<string>();

export type ImageCollectionItem =
  RouterOutputs["dashboardDb"]["image"]["list"][number];

export const imagesCollection = createCollection(
  queryCollectionOptions<ImageCollectionItem>({
    queryClient: getQueryClient(),
    queryKey: ["dashboard-db", "images"],
    enabled: false,
    getKey: (row) => row.id,
    queryFn: async ({ queryKey, client }) => {
      const existing: ImageCollectionItem[] = client.getQueryData(queryKey) ?? [];

      const cursorKeyToUse = getUserCursorKey(CURSOR_BASE);
      const last = localStorage.getItem(cursorKeyToUse);
      const upserts = await getTrpcClient().dashboardDb.image.sync.query({
        since: last ?? null,
      });

      const map = new Map(existing.map((i) => [i.id, i]));
      upserts.forEach((i) => map.set(i.id, i));
      DELETED_IDS.forEach((id) => map.delete(id));

      localStorage.setItem(cursorKeyToUse, new Date().toISOString());
      return Array.from(map.values());
    },
    onInsert: async () => ({ refetch: false }),
    onUpdate: async () => ({ refetch: false }),
    onDelete: async () => ({ refetch: false }),
  }),
);

type CreateDraft = RouterInputs["dashboardDb"]["image"]["create"];
export async function createImage(draft: CreateDraft) {
  const cache =
    getQueryClient().getQueryData<ImageCollectionItem[]>([
      "dashboard-db",
      "images",
    ]) ?? [];

  const nextOrder =
    cache
      .filter((i) =>
        draft.type === "listing"
          ? i.listingId === draft.referenceId
          : i.userProfileId === draft.referenceId,
      )
      .reduce((m, i) => Math.max(m, i.order), -1) + 1;

  const temp: ImageCollectionItem = {
    id: `temp:${crypto.randomUUID()}`,
    url: draft.url,
    order: nextOrder,
    listingId: draft.type === "listing" ? draft.referenceId : null,
    userProfileId: draft.type === "profile" ? draft.referenceId : null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  imagesCollection.utils.writeInsert(temp);

  try {
    const created = await getTrpcClient().dashboardDb.image.create.mutate(draft);
    const tempExists = !!imagesCollection.get(temp.id);
    const realExists = !!imagesCollection.get(created.id);

    imagesCollection.utils.writeBatch(() => {
      if (tempExists) imagesCollection.utils.writeDelete(temp.id);
      if (!realExists) imagesCollection.utils.writeInsert(created);
    });

    return created;
  } catch (error) {
    try {
      imagesCollection.utils.writeDelete(temp.id);
    } catch {
      // ignore rollback errors
    }
    throw error;
  }
}

type ReorderDraft = RouterInputs["dashboardDb"]["image"]["reorder"];
export async function reorderImages(draft: ReorderDraft) {
  const previous: Array<{ id: string; order: number }> = [];
  draft.images.forEach((img) => {
    const row = imagesCollection.get(img.id);
    if (row) previous.push({ id: row.id, order: row.order });
  });

  imagesCollection.utils.writeBatch(() => {
    draft.images.forEach((img) => {
      imagesCollection.utils.writeUpdate({ id: img.id, order: img.order });
    });
  });

  try {
    await getTrpcClient().dashboardDb.image.reorder.mutate(draft);
  } catch (error) {
    imagesCollection.utils.writeBatch(() => {
      previous.forEach((img) => {
        imagesCollection.utils.writeUpdate({ id: img.id, order: img.order });
      });
    });
    throw error;
  }
}

type DeleteDraft = RouterInputs["dashboardDb"]["image"]["delete"];
export async function deleteImage(draft: DeleteDraft) {
  const previous = imagesCollection.get(draft.imageId);
  DELETED_IDS.add(draft.imageId);

  const cache =
    getQueryClient().getQueryData<ImageCollectionItem[]>([
      "dashboard-db",
      "images",
    ]) ?? [];

  const before = cache
    .filter((i) =>
      draft.type === "listing"
        ? i.listingId === draft.referenceId
        : i.userProfileId === draft.referenceId,
    )
    .sort((a, b) => a.order - b.order)
    .map((i) => ({ id: i.id, order: i.order }));

  imagesCollection.utils.writeDelete(draft.imageId);

  const remaining = before.filter((i) => i.id !== draft.imageId);
  imagesCollection.utils.writeBatch(() => {
    remaining.forEach((img, index) => {
      imagesCollection.utils.writeUpdate({ id: img.id, order: index });
    });
  });

  try {
    await getTrpcClient().dashboardDb.image.delete.mutate(draft);
  } catch (error) {
    if (previous) imagesCollection.utils.writeInsert(previous);
    DELETED_IDS.delete(draft.imageId);
    imagesCollection.utils.writeBatch(() => {
      before.forEach((img) => {
        imagesCollection.utils.writeUpdate({ id: img.id, order: img.order });
      });
    });
    throw error;
  }
}

export async function initializeImagesCollection(userId: string) {
  setCurrentUserId(userId);

  const rows = await getTrpcClient().dashboardDb.image.list.query();
  getQueryClient().setQueryData<ImageCollectionItem[]>(
    ["dashboard-db", "images"],
    rows,
  );

  localStorage.setItem(cursorKey(CURSOR_BASE, userId), new Date().toISOString());
  DELETED_IDS.clear();

  await imagesCollection.preload();
}
