"use client";

import { eq, useLiveSuspenseQuery } from "@tanstack/react-db";
import { APP_CONFIG } from "@/config/constants";
import { imagesCollection } from "@/app/dashboard/_lib/dashboard-db/collections";

export function useProfileImageManagerState(profileId: string) {
  const { data: images } = useLiveSuspenseQuery({
    query: (q) =>
      q
        .from({ img: imagesCollection })
        .where(({ img }) => eq(img.userProfileId, profileId))
        .orderBy(({ img }) => img.order, "asc"),
  });

  const canUploadMore =
    images.length < APP_CONFIG.UPLOAD.MAX_IMAGES_PER_PROFILE;

  return {
    images,
    canUploadMore,
  };
}
