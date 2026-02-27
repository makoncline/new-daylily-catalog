import { useCallback, useState } from "react";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { uploadFileWithProgress } from "@/lib/utils";
import { type ImageType } from "@/types/image";
import { type Image } from "@prisma/client";
import { getErrorMessage, normalizeError, reportError } from "@/lib/error-utils";
import { createImage } from "@/app/dashboard/_lib/dashboard-db/images-collection";

interface UseImageUploadOptions {
  type: ImageType;
  referenceId: string;
  createMode?: "collection" | "direct";
  onSuccess?: (image: Image) => void;
}

export function useImageUpload({
  type,
  referenceId,
  createMode = "collection",
  onSuccess,
}: UseImageUploadOptions) {
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const getPresignedUrlMutation =
    api.dashboardDb.image.getPresignedUrl.useMutation();
  const createImageMutation = api.dashboardDb.image.create.useMutation();

  const upload = useCallback(
    async (file: Blob) => {
      let step: "presign" | "upload" | "create" = "presign";

      try {
        setIsUploading(true);
        setProgress(0);

        const { presignedUrl, key, url } =
          await getPresignedUrlMutation.mutateAsync({
            type,
            fileName: `${Date.now()}.jpg`,
            contentType: file.type,
            size: file.size,
            referenceId,
          });

        step = "upload";
        await uploadFileWithProgress({
          presignedUrl,
          file,
          onProgress: setProgress,
        });

        step = "create";
        const image =
          createMode === "collection"
            ? await createImage({
                type,
                referenceId,
                url,
                key,
              })
            : await createImageMutation.mutateAsync({
                type,
                referenceId,
                url,
                key,
              });

        toast.success("Image uploaded successfully");

        onSuccess?.(image);
        return image;
      } catch (error) {
        toast.error(
          step === "presign"
            ? "Failed to get upload URL"
            : step === "upload"
              ? "Failed to upload image"
              : "Failed to save image",
          {
            description: getErrorMessage(error),
          },
        );
        reportError({
          error: normalizeError(error),
          context: { source: "useImageUpload", step },
        });
      } finally {
        setIsUploading(false);
        setProgress(0);
      }
    },
    [
      type,
      referenceId,
      createMode,
      getPresignedUrlMutation,
      createImageMutation,
      onSuccess,
    ],
  );

  return {
    upload,
    progress,
    isUploading,
  };
}
