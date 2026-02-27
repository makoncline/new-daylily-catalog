"use client";

import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { ImageCropper } from "@/components/image-cropper";
import { useImageUpload } from "@/hooks/use-image-upload";
import type { ImageType, ImageUploadResponse } from "@/types/image";
import { APP_CONFIG } from "@/config/constants";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { P } from "@/components/typography";
import { Button } from "@/components/ui/button";
import { IMAGE_CONFIG } from "@/components/optimized-image";

export interface ImageUploadProps {
  type: ImageType;
  referenceId: string;
  uploadMode?: "collection" | "direct" | "upload-only";
  deferUpload?: boolean;
  onDeferredUploadReady?: (file: Blob) => void;
  onUploadComplete?: (result: ImageUploadResponse) => void;
  onMutationSuccess?: () => void;
}

export function ImageUpload({
  type,
  referenceId,
  uploadMode = "collection",
  deferUpload = false,
  onDeferredUploadReady,
  onUploadComplete,
  onMutationSuccess,
}: ImageUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [preparedPreviewUrl, setPreparedPreviewUrl] = useState<string | null>(
    null,
  );
  const { upload, progress, isUploading } = useImageUpload({
    type,
    referenceId,
    createMode: uploadMode,
    onSuccess: (result) => {
      onUploadComplete?.({
        success: true,
        url: result.url,
        key: result.key,
        image: result.image,
      });
      onMutationSuccess?.();
    },
  });

  const reset = useCallback(() => {
    if (previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setPreparedPreviewUrl((previousPreviewUrl) => {
      if (previousPreviewUrl) {
        URL.revokeObjectURL(previousPreviewUrl);
      }
      return null;
    });
  }, [previewUrl]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    reset();

    // Create preview URL
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  }, [reset]);

  const handleAdjustCrop = useCallback(() => {
    if (!preparedPreviewUrl) {
      return;
    }

    setPreviewUrl(preparedPreviewUrl);
  }, [preparedPreviewUrl]);

  useEffect(() => {
    return () => {
      if (preparedPreviewUrl) {
        URL.revokeObjectURL(preparedPreviewUrl);
      }
    };
  }, [preparedPreviewUrl]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [], // Accepts all image types
    },
    maxSize: APP_CONFIG.UPLOAD.MAX_FILE_SIZE,
    multiple: false,
  });

  return (
    <div className="space-y-4">
      {!previewUrl && !preparedPreviewUrl && (
        <div
          {...getRootProps()}
          className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center ${
            isDragActive ? "border-primary" : "border-muted"
          }`}
        >
          <input {...getInputProps()} id="image-upload-input" />
          {isDragActive ? (
            <P>Drop the image here...</P>
          ) : (
            <P>Drag and drop an image here, or click to select one</P>
          )}
        </div>
      )}

      {previewUrl && (
        <div className="relative space-y-4">
          <ImageCropper
            src={previewUrl}
            primaryActionLabel={deferUpload ? "Done" : "Upload"}
            onCropComplete={async (result) => {
              if (deferUpload) {
                onDeferredUploadReady?.(result);
                setPreparedPreviewUrl((previousPreviewUrl) => {
                  if (previousPreviewUrl) {
                    URL.revokeObjectURL(previousPreviewUrl);
                  }
                  return URL.createObjectURL(result);
                });
                setPreviewUrl(null);
                return;
              }

              try {
                await upload(result);
                reset();
              } catch {
                // Error is handled in useImageUpload
              }
            }}
            onCancel={reset}
            isDisabled={isUploading}
          />
          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50">
              <div className="text-center">
                <P className="mb-2 text-sm">Uploading image... {progress}%</P>
                <Progress value={progress} className="w-32" />
              </div>
            </div>
          )}
        </div>
      )}

      {deferUpload && preparedPreviewUrl && !previewUrl ? (
        <div className="space-y-3 rounded-lg border p-3">
          <div
            className="aspect-square w-full overflow-hidden rounded-md"
            style={{ maxWidth: IMAGE_CONFIG.SIZES.THUMBNAIL }}
          >
            <img
              src={preparedPreviewUrl}
              alt="Prepared upload preview"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={handleAdjustCrop}>
              Adjust crop
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={reset}>
              Upload a different image
            </Button>
          </div>
          <p className="text-muted-foreground text-xs">
            Image staged. It will upload when you click Save.
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function ImageUploadSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-32 w-full rounded-lg" />
    </div>
  );
}
