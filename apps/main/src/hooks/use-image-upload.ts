import { useCallback, useState } from "react";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { uploadFileWithProgress } from "@/lib/utils";
import {
  getSupportedImageContentType,
  type ImageContentType,
  type ImageType,
} from "@/types/image";
import { type Image } from "@prisma/client";
import { APP_CONFIG } from "@/config/constants";
import { capturePosthogEvent } from "@/lib/analytics/posthog";
import {
  getErrorMessage,
  normalizeError,
  reportError,
} from "@/lib/error-utils";
import { createImage } from "@/app/dashboard/_lib/dashboard-db/images-collection";

const uploadExtensionByContentType = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} satisfies Record<ImageContentType, string>;

export function getImageUploadFileName(
  contentType: ImageContentType,
  now = Date.now(),
) {
  const extension = uploadExtensionByContentType[contentType] ?? "jpg";
  return `${now}.${extension}`;
}

interface UseImageUploadOptions {
  type: ImageType;
  referenceId: string;
  isFirstImageUpload?: boolean;
  onSuccess?: (image: Image) => void;
}

export function useImageUpload({
  type,
  referenceId,
  isFirstImageUpload = false,
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

        const contentType = getSupportedImageContentType(file.type);
        if (!contentType) {
          throw new Error("Only JPEG, PNG, and WebP images are supported");
        }

        if (file.size > APP_CONFIG.UPLOAD.MAX_FILE_SIZE) {
          capturePosthogEvent("image_upload_failed", {
            imageType: type,
            referenceId,
            reason: "cropped_file_too_large",
            fileSize: file.size,
            maxFileSize: APP_CONFIG.UPLOAD.MAX_FILE_SIZE,
            stage: "presign",
          });
          throw new Error(
            `Cropped image is over ${Math.round(
              APP_CONFIG.UPLOAD.MAX_FILE_SIZE / 1024 / 1024,
            )}MB. Try a smaller crop or image.`,
          );
        }

        const { imageId, presignedUrl, key, url, r2 } =
          await getPresignedUrlMutation.mutateAsync({
            type,
            fileName: getImageUploadFileName(contentType),
            contentType,
            size: file.size,
            referenceId,
          });

        step = "upload";
        if (r2) {
          await uploadFileWithProgress({
            presignedUrl: r2.presignedUrl,
            contentType,
            file,
            onProgress: (value) => setProgress(Math.floor(value / 2)),
          });
        }

        await uploadFileWithProgress({
          presignedUrl,
          contentType,
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
          ...(r2 ? { imageId, r2OriginalKey: r2.key } : {}),
        });

        toast.success("Image uploaded successfully");

        if (isFirstImageUpload) {
          capturePosthogEvent("first_image_uploaded", {
            imageType: type,
            referenceId,
            fileSize: file.size,
          });
        }

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
        capturePosthogEvent("image_upload_failed", {
          imageType: type,
          referenceId,
          reason: getErrorMessage(error),
          stage: step,
        });
      } finally {
        setIsUploading(false);
        setProgress(0);
      }
    },
    [type, referenceId, isFirstImageUpload, getPresignedUrlMutation, onSuccess],
  );

  return {
    upload,
    progress,
    isUploading,
  };
}
