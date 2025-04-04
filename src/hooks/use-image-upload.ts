import { useState, useCallback } from "react";
import { api } from "@/trpc/react";
import { useToast } from "@/hooks/use-toast";
import { uploadFileWithProgress } from "@/lib/utils";
import { type ImageType } from "@/types/image";
import { type Image } from "@prisma/client";
import { getErrorMessage, normalizeError } from "@/lib/error-utils";

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
  const { toast } = useToast();

  const getPresignedUrlMutation = api.image.getPresignedUrl.useMutation({
    onError: (error, errorInfo) => {
      toast({
        title: "Failed to get upload URL",
        description: getErrorMessage(error),
        variant: "destructive",
      });
      reportError({
        error: normalizeError(error),
        context: { source: "useImageUpload", errorInfo },
      });
    },
  });

  const createImageMutation = api.image.createImage.useMutation({
    onError: (error, errorInfo) => {
      toast({
        title: "Failed to save image",
        description: getErrorMessage(error),
        variant: "destructive",
      });
      reportError({
        error: normalizeError(error),
        context: { source: "useImageUpload", errorInfo },
      });
    },
  });

  const upload = useCallback(
    async (file: Blob) => {
      try {
        setIsUploading(true);
        setProgress(0);

        // Get presigned URL
        const { presignedUrl, key, url } =
          await getPresignedUrlMutation.mutateAsync({
            type,
            fileName: `${Date.now()}.jpg`,
            contentType: file.type,
            size: file.size,
            referenceId,
          });

        // Upload to S3
        await uploadFileWithProgress({
          presignedUrl,
          file,
          onProgress: setProgress,
        });

        // Create database record
        const image = await createImageMutation.mutateAsync({
          type,
          referenceId,
          url,
          key,
        });

        toast({
          title: "Image uploaded successfully",
        });

        onSuccess?.(image);
        return image;
      } catch (error) {
        toast({
          title: "Failed to upload image",
          description: getErrorMessage(error),
          variant: "destructive",
        });
        reportError({
          error: normalizeError(error),
          context: { source: "useImageUpload" },
        });
      } finally {
        setIsUploading(false);
        setProgress(0);
      }
    },
    [
      type,
      referenceId,
      getPresignedUrlMutation,
      createImageMutation,
      toast,
      onSuccess,
    ],
  );

  return {
    upload,
    progress,
    isUploading,
  };
}
