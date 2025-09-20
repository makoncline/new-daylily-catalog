import { useState, useCallback } from "react";
import { uploadFileWithProgress } from "@/lib/utils";
import { toast } from "sonner";
import { getTrpcClient } from "@/trpc/client";
import { imagesCollection } from "@/app/dashboard-two/_lib/images-collection";

export function useImageUploadTwo({
  listingId,
  onSuccess,
}: {
  listingId: string;
  onSuccess?: (image: { id: string; url: string }) => void;
}) {
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const upload = useCallback(
    async (file: Blob) => {
      try {
        setIsUploading(true);
        setProgress(0);
        const client = getTrpcClient();
        const { presignedUrl, url } = await client.dashboardTwo.getPresignedUrl.mutate({
          listingId,
          fileName: `${Date.now()}.jpg`,
          contentType: file.type,
          size: file.size,
        });

        await uploadFileWithProgress({ presignedUrl, file, onProgress: setProgress });

        // Create DB record and update collection
        const created = await client.dashboardTwo.createImage.mutate({ listingId, url });
        // Ensure present in collection cache
        const present = !!imagesCollection.get(created.id);
        if (!present) imagesCollection.utils.writeInsert(created as any);

        toast.success("Image uploaded successfully");
        onSuccess?.(created as any);
        return created as any;
      } finally {
        setIsUploading(false);
        setProgress(0);
      }
    },
    [listingId, onSuccess],
  );

  return { upload, progress, isUploading } as const;
}

