"use client";

import { ImageUpload } from "@/components/image-upload";
import { ImageManager } from "@/components/image-manager";
import { useProfileImageManagerState } from "@/hooks/use-profile-image-manager-state";

export function ProfileImageManager({
  profileId,
  onMutationSuccess,
}: {
  profileId: string;
  onMutationSuccess?: () => void;
}) {
  const { images, canUploadMore } = useProfileImageManagerState(profileId);

  return (
    <div className="space-y-4">
      <ImageManager
        type="profile"
        images={images}
        referenceId={profileId}
        onMutationSuccess={onMutationSuccess}
      />
      {canUploadMore && (
        <div className="p-4">
          <ImageUpload
            type="profile"
            referenceId={profileId}
            onMutationSuccess={onMutationSuccess}
          />
        </div>
      )}
    </div>
  );
}
