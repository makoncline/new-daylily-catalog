"use client";

import { eq, useLiveQuery } from "@tanstack/react-db";
import { APP_CONFIG } from "@/config/constants";
import {
  imagesCollection,
  type ImageCollectionItem,
} from "@/app/dashboard/_lib/dashboard-db/images-collection";
import {
  DASHBOARD_DB_QUERY_KEYS,
} from "@/app/dashboard/_lib/dashboard-db/dashboard-db-keys";
import { getQueryClient } from "@/trpc/query-client";

export function useProfileImageManagerState(profileId: string) {
  const { data: liveImages = [], isReady } = useLiveQuery(
    (q) =>
      q
        .from({ img: imagesCollection })
        .where(({ img }) => eq(img.userProfileId, profileId))
        .orderBy(({ img }) => img.order, "asc"),
    [profileId],
  );

  const seededImages =
    getQueryClient().getQueryData<ImageCollectionItem[]>(
      DASHBOARD_DB_QUERY_KEYS.images,
    ) ?? [];

  const seededProfileImages = seededImages
    .filter((img) => img.userProfileId === profileId)
    .sort((a, b) => a.order - b.order);

  const images = isReady ? liveImages : seededProfileImages;
  const canUploadMore =
    images.length < APP_CONFIG.UPLOAD.MAX_IMAGES_PER_PROFILE;

  return {
    images,
    canUploadMore,
  };
}
