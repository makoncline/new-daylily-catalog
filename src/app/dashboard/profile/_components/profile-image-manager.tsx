"use client";

import React from "react";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { ImageUpload } from "@/components/image-upload";
import { APP_CONFIG } from "@/config/constants";
import { ImageManager, ImageManagerSkeleton } from "@/components/image-manager";
import { ClientOnly } from "@/components/client-only";
import { imagesCollection } from "@/app/dashboard/_lib/dashboard-db/images-collection";

function ProfileImageManagerLive({ profileId }: { profileId: string }) {
  const { data: images = [], isReady } = useLiveQuery(
    (q) =>
      q
        .from({ img: imagesCollection })
        .where(({ img }) => eq(img.userProfileId, profileId))
        .orderBy(({ img }) => img.order, "asc"),
    [profileId],
  );

  if (!isReady) {
    return <ImageManagerSkeleton />;
  }

  return (
    <div className="space-y-4">
      <ImageManager
        type="profile"
        images={images}
        onImagesChange={() => undefined}
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
  return (
    <ClientOnly fallback={<ImageManagerSkeleton />}>
      <ProfileImageManagerLive profileId={profileId} />
    </ClientOnly>
  );
}
