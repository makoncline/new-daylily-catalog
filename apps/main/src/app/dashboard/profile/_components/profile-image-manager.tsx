"use client";

import { ImageUpload } from "@/components/image-upload";
import { ImageManager } from "@/components/image-manager";
import { useProfileImageManagerState } from "@/hooks/use-profile-image-manager-state";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";

export function ProfileImageManager({
  profileId,
  onMutationSuccess,
}: {
  profileId: string;
  onMutationSuccess?: () => void;
}) {
  const { images, canUploadMore } = useProfileImageManagerState(profileId);

  return (
    <div className="flex flex-col gap-4">
      {images.length === 0 && (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No profile images</EmptyTitle>
            <EmptyDescription>
              Add an image to show visitors your garden.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
      <ImageManager
        type="profile"
        images={images}
        prioritizeImages
        referenceId={profileId}
        onMutationSuccess={onMutationSuccess}
      />
      {canUploadMore && (
        <ImageUpload
          type="profile"
          referenceId={profileId}
          isFirstImageUpload={images.length === 0}
          onMutationSuccess={onMutationSuccess}
        />
      )}
    </div>
  );
}
