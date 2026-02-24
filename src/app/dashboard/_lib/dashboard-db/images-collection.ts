"use client";

import { createCollection } from "@tanstack/react-db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import type { RouterInputs, RouterOutputs } from "@/trpc/react";
import { getQueryClient } from "@/trpc/query-client";
import { getTrpcClient } from "@/trpc/client";
import { getUserCursorKey } from "@/lib/utils/cursor";
import { schedulePersistDashboardDbForCurrentUser } from "@/app/dashboard/_lib/dashboard-db/dashboard-db-persistence";
import {
  bootstrapDashboardDbCollection,
  writeCursorFromRows,
} from "@/app/dashboard/_lib/dashboard-db/collection-bootstrap";

const CURSOR_BASE = "dashboard-db:images:maxUpdatedAt";
const IMAGES_QUERY_KEY = ["dashboard-db", "images"] as const;
const DELETED_IDS = new Set<string>();

export type ImageCollectionItem =
  RouterOutputs["dashboardDb"]["image"]["list"][number];

export const imagesCollection = createCollection(
  queryCollectionOptions<ImageCollectionItem>({
    queryClient: getQueryClient(),
    queryKey: IMAGES_QUERY_KEY,
    enabled: true,
    getKey: (row) => row.id,
    queryFn: async ({ queryKey }) => {
      const existing: ImageCollectionItem[] =
        getQueryClient().getQueryData(queryKey) ?? [];

      const cursorKeyToUse = getUserCursorKey(CURSOR_BASE);
      const last = localStorage.getItem(cursorKeyToUse);
      const upserts = await getTrpcClient().dashboardDb.image.sync.query({
        since: last ?? null,
      });

      const map = new Map(existing.map((i) => [i.id, i]));
      upserts.forEach((i) => map.set(i.id, i));
      DELETED_IDS.forEach((id) => map.delete(id));

      writeCursorFromRows({ cursorStorageKey: cursorKeyToUse, rows: upserts });
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
    getQueryClient().getQueryData<ImageCollectionItem[]>(IMAGES_QUERY_KEY) ?? [];

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
    status: null,
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

    schedulePersistDashboardDbForCurrentUser();
    void getQueryClient().invalidateQueries({ queryKey: IMAGES_QUERY_KEY });
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
    schedulePersistDashboardDbForCurrentUser();
    void getQueryClient().invalidateQueries({ queryKey: IMAGES_QUERY_KEY });
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
    getQueryClient().getQueryData<ImageCollectionItem[]>(IMAGES_QUERY_KEY) ?? [];

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
    schedulePersistDashboardDbForCurrentUser({ delayMs: 0 });
    void getQueryClient().invalidateQueries({ queryKey: IMAGES_QUERY_KEY });
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
  await bootstrapDashboardDbCollection<ImageCollectionItem>({
    userId,
    queryKey: ["dashboard-db", "images"],
    cursorBase: CURSOR_BASE,
    collection: imagesCollection,
    fetchSeed: () => getTrpcClient().dashboardDb.image.list.query(),
    onSeeded: () => {
      DELETED_IDS.clear();
    },
  });
}
