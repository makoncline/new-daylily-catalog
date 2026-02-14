"use client";

import React from "react";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { ImageUpload } from "@/components/image-upload";
import { APP_CONFIG } from "@/config/constants";
import { ImageManager } from "@/components/image-manager";
import {
  imagesCollection,
  type ImageCollectionItem,
} from "@/app/dashboard/_lib/dashboard-db/images-collection";
import { getQueryClient } from "@/trpc/query-client";

function ProfileImageManagerLive({ profileId }: { profileId: string }) {
  const { data: liveImages = [], isReady } = useLiveQuery(
    (q) =>
      q
        .from({ img: imagesCollection })
        .where(({ img }) => eq(img.userProfileId, profileId))
        .orderBy(({ img }) => img.order, "asc"),
    [profileId],
  );

  const queryClient = getQueryClient();
  const seededImages =
    queryClient.getQueryData<ImageCollectionItem[]>(["dashboard-db", "images"]) ??
    [];
  const seededProfileImages = seededImages
    .filter((img) => img.userProfileId === profileId)
    .sort((a, b) => a.order - b.order);

  const images = isReady ? liveImages : seededProfileImages;

  return (
    <div className="space-y-4">
      <ImageManager
        type="profile"
        images={images}
        referenceId={profileId}
      />
      {images.length < APP_CONFIG.UPLOAD.MAX_IMAGES_PER_PROFILE && (
        <div className="p-4">
          <ImageUpload type="profile" referenceId={profileId} />
        </div>
      )}
    </div>
  );
}

export function ProfileImageManager({ profileId }: { profileId: string }) {
  return <ProfileImageManagerLive profileId={profileId} />;
}
