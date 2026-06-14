import { useCallback, useState } from "react";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { uploadFileWithProgress } from "@/lib/utils";
import { type ImageType } from "@/types/image";
import { type Image } from "@prisma/client";
import {
  getErrorMessage,
  normalizeError,
  reportError,
} from "@/lib/error-utils";
import { createImage } from "@/app/dashboard/_lib/dashboard-db/images-collection";

interface UseImageUploadOptions {
  type: ImageType;
  referenceId: string;
  onSuccess?: (image: Image) => void;
}

export function useImageUpload({
  type,
  referenceId,
  onSuccess,
}: UseImageUploadOptions) {
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const getPresignedUrlMutation =
    api.dashboardDb.image.getPresignedUrl.useMutation();

  const upload = useCallback(
    async (file: Blob) => {
      let step: "presign" | "upload" | "create" = "presign";

      try {
        setIsUploading(true);
        setProgress(0);

        const { imageId, presignedUrl, key, url, r2 } =
          await getPresignedUrlMutation.mutateAsync({
            type,
            fileName: `${Date.now()}.jpg`,
            contentType: file.type,
            size: file.size,
            referenceId,
          });

        step = "upload";
        if (r2) {
          await uploadFileWithProgress({
            presignedUrl: r2.presignedUrl,
            file,
            onProgress: (value) => setProgress(Math.floor(value / 2)),
          });
        }

        await uploadFileWithProgress({
          presignedUrl,
          file,
          onProgress: (value) =>
            setProgress(r2 ? 50 + Math.floor(value / 2) : value),
        });

        step = "create";
        const image = await createImage({
          type,
          referenceId,
          url,
          key,
          imageId,
          r2OriginalKey: r2?.key,
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
    [type, referenceId, getPresignedUrlMutation, onSuccess],
  );

  return {
    upload,
    progress,
    isUploading,
  };
}
