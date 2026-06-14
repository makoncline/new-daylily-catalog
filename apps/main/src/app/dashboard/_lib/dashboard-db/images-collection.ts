"use client";

import { createCollection, type Collection } from "@tanstack/react-db";
import {
  queryCollectionOptions,
  type QueryCollectionUtils,
} from "@tanstack/query-db-collection";
import type { PersistedCollectionPersistence } from "@tanstack/browser-db-sqlite-persistence";
import type { RouterInputs, RouterOutputs } from "@/trpc/react";
import { getQueryClient } from "@/trpc/query-client";
import { getTrpcClient } from "@/trpc/client";
import { createTempId } from "@/lib/utils/create-temp-id";
import { getUserCursorKey } from "@/lib/utils/cursor";
import { runWithDashboardRefreshLock } from "@/app/dashboard/_lib/dashboard-db/dashboard-db-persistence";
import {
  fetchDashboardSyncPages,
  refreshDashboardDbCollectionFromServer,
  writeCursorFromRows,
} from "@/app/dashboard/_lib/dashboard-db/collection-bootstrap";
import {
  dashboardDbCollectionId,
  withDashboardDbPersistence,
} from "@/app/dashboard/_lib/dashboard-db/dashboard-db-persisted-options";

const CURSOR_BASE = "dashboard-db:images:maxUpdatedAt";
const QUERY_KEY = ["dashboard-db", "images"] as const;
const IMAGES_SYNC_PAGE_SIZE = 50;
const DELETED_IDS = new Set<string>();
let shouldSkipNextImagesSync = false;

export type ImageCollectionItem =
  RouterOutputs["dashboardDb"]["image"]["list"][number];
type ImageCollection = Collection<
  ImageCollectionItem,
  string,
  QueryCollectionUtils<ImageCollectionItem>
>;

function sortImages(rows: readonly ImageCollectionItem[]) {
  return [...rows].sort((a, b) => {
    const listingCompare = (a.listingId ?? "").localeCompare(b.listingId ?? "");
    if (listingCompare !== 0) return listingCompare;

    const profileCompare = (a.userProfileId ?? "").localeCompare(
      b.userProfileId ?? "",
    );
    if (profileCompare !== 0) return profileCompare;

    return a.order - b.order;
  });
}

export function suppressNextImagesCollectionSync() {
  shouldSkipNextImagesSync = true;
}

export function clearNextImagesCollectionSyncSuppression() {
  shouldSkipNextImagesSync = false;
}

export async function cleanupImagesCollection() {
  DELETED_IDS.clear();
  shouldSkipNextImagesSync = false;
  await imagesCollection.cleanup();
}

function getExistingImageRows(
  queryKey: readonly unknown[],
): ImageCollectionItem[] {
  const queryRows: ImageCollectionItem[] =
    getQueryClient().getQueryData(queryKey) ?? [];
  const collectionRows: ImageCollectionItem[] = Array.from(
    imagesCollection.values(),
  );

  return queryRows.length >= collectionRows.length ? queryRows : collectionRows;
}

function createImagesCollection(
  persistence: PersistedCollectionPersistence | null,
  userId: string | null,
): ImageCollection {
  const options = queryCollectionOptions<ImageCollectionItem>({
    queryClient: getQueryClient(),
    queryKey: QUERY_KEY,
    enabled: true,
    staleTime: Infinity,
    retry: false,
    getKey: (row) => row.id,
    queryFn: async ({ queryKey }) => {
      const existing = getExistingImageRows(queryKey);

      if (shouldSkipNextImagesSync) {
        shouldSkipNextImagesSync = false;
        return sortImages(existing);
      }

      const cursorKeyToUse = getUserCursorKey(CURSOR_BASE);
      const last = localStorage.getItem(cursorKeyToUse);
      const upserts = await fetchDashboardSyncPages({
        label: "image.sync",
        since: last ?? null,
        pageSize: IMAGES_SYNC_PAGE_SIZE,
        fetchPage: (input) =>
          getTrpcClient().dashboardDb.image.sync.query(input),
      });

      const map = new Map(existing.map((i) => [i.id, i]));
      upserts.forEach((i) => map.set(i.id, i));
      DELETED_IDS.forEach((id) => map.delete(id));

      writeCursorFromRows({ cursorStorageKey: cursorKeyToUse, rows: upserts });
      return sortImages(Array.from(map.values()));
    },
    onInsert: async () => ({ refetch: false }),
    onUpdate: async () => ({ refetch: false }),
    onDelete: async () => ({ refetch: false }),
  });

  return createCollection(
    withDashboardDbPersistence<ImageCollectionItem>({
      options,
      persistence,
      collectionId: dashboardDbCollectionId({ name: "images", userId }),
    }) as Parameters<typeof createCollection>[0],
  ) as unknown as ImageCollection;
}

export let imagesCollection: ImageCollection = createImagesCollection(
  null,
  null,
);

export function resetImagesCollectionWithPersistence(
  persistence: PersistedCollectionPersistence | null,
  userId: string | null,
) {
  DELETED_IDS.clear();
  shouldSkipNextImagesSync = false;
  imagesCollection = createImagesCollection(persistence, userId);
}

type CreateDraft = RouterInputs["dashboardDb"]["image"]["create"];
export async function createImage(draft: CreateDraft) {
  return runWithDashboardRefreshLock(async () => {
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
      id: createTempId(),
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
      const created =
        await getTrpcClient().dashboardDb.image.create.mutate(draft);
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
  });
}

type ReorderDraft = RouterInputs["dashboardDb"]["image"]["reorder"];
export async function reorderImages(draft: ReorderDraft) {
  await runWithDashboardRefreshLock(async () => {
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
  });
}

type DeleteDraft = RouterInputs["dashboardDb"]["image"]["delete"];
export async function deleteImage(draft: DeleteDraft) {
  await runWithDashboardRefreshLock(async () => {
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
  });
}

async function refreshImagesCollectionFromServer(userId: string) {
  await runWithDashboardRefreshLock(async () => {
    await refreshDashboardDbCollectionFromServer({
      userId,
      queryKey: QUERY_KEY,
      cursorBase: CURSOR_BASE,
      fetchRows: () =>
        fetchDashboardSyncPages({
          label: "image.full-refresh",
          since: null,
          pageSize: IMAGES_SYNC_PAGE_SIZE,
          fetchPage: (input) =>
            getTrpcClient().dashboardDb.image.sync.query(input),
        }),
      sortRows: sortImages,
      filterRows: (row) => !DELETED_IDS.has(row.id),
    });
  });
}

export async function initializeImagesCollection(userId: string) {
  await refreshImagesCollectionFromServer(userId);
  suppressNextImagesCollectionSync();
  await imagesCollection.preload();
}
