import { ImageManager } from "@/components/image-manager";
import { ImageUpload } from "@/components/image-upload";
import { type RouterOutputs } from "@/trpc/react";
import { useState } from "react";
import { type Image } from "@prisma/client";
import { useToast } from "@/hooks/use-toast";
import { type ImageUploadResponse } from "@/types/image";

interface ProfileImageManagerProps {
  initialProfile: RouterOutputs["userProfile"]["get"];
}

export function ProfileImageManager({
  initialProfile,
}: ProfileImageManagerProps) {
  const { id: referenceId } = initialProfile;
  const [images, setImages] = useState(initialProfile.images);
  const { toast } = useToast();

  const handleUploadComplete = (result: ImageUploadResponse) => {
    if (result.success && result.image) {
      setImages((prev: Image[]) => [...prev, result.image]);
      toast({
        title: "Image added successfully",
      });
    }
  };

  return (
    <div className="space-y-4">
      <ImageManager
        type="profile"
        images={images}
        onImagesChange={setImages}
        referenceId={referenceId}
      />
      <div className="p-4">
        <ImageUpload
          type="profile"
          referenceId={referenceId}
          onUploadComplete={handleUploadComplete}
        />
      </div>
    </div>
  );
}
