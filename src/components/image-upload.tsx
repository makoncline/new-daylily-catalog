"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { ImageCropper } from "@/components/image-cropper";
import { useImageUpload } from "@/hooks/use-image-upload";
import type { ImageType, ImageUploadResponse } from "@/types/image";
import { APP_CONFIG } from "@/config/constants";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { P } from "@/components/typography";

export interface ImageUploadProps {
  type: ImageType;
  referenceId: string;
  onUploadComplete?: (result: ImageUploadResponse) => void;
}

export function ImageUpload({
  type,
  referenceId,
  onUploadComplete,
}: ImageUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { upload, progress, isUploading } = useImageUpload({
    type,
    referenceId,
    onSuccess: (image) => {
      onUploadComplete?.({
        success: true,
        url: image.url,
        key: image.url.split("/").pop() ?? "",
        image,
      });
    },
  });

  const reset = useCallback(() => {
    setPreviewUrl(null);
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Create preview URL
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

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
      {!previewUrl && (
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
            onCropComplete={async (result) => {
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
