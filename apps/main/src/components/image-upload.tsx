"use client";

import { useState, useCallback } from "react";
import { type FileRejection, useDropzone } from "react-dropzone";
import { ImageCropper } from "@/components/image-cropper";
import { useImageUpload } from "@/hooks/use-image-upload";
import type { ImageType } from "@/types/image";
import { APP_CONFIG } from "@/config/constants";
import { Progress } from "@/components/ui/progress";
import { P } from "@/components/typography";
import { capturePosthogEvent } from "@/lib/analytics/posthog";
import { toast } from "sonner";

export interface ImageUploadProps {
  type: ImageType;
  referenceId: string;
  isFirstImageUpload?: boolean;
  onMutationSuccess?: () => void;
}

export function ImageUpload({
  type,
  referenceId,
  isFirstImageUpload = false,
  onMutationSuccess,
}: ImageUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { upload, progress, isUploading } = useImageUpload({
    type,
    referenceId,
    isFirstImageUpload,
    onSuccess: () => {
      onMutationSuccess?.();
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

  const onDropRejected = useCallback(
    (rejections: FileRejection[]) => {
      const rejection = rejections[0];
      const file = rejection?.file;
      const reason =
        rejection?.errors[0]?.code === "file-too-large"
          ? "file_too_large"
          : (rejection?.errors[0]?.code ?? "dropzone_rejected");

      capturePosthogEvent("image_upload_failed", {
        imageType: type,
        referenceId,
        reason,
        fileSize: file?.size,
        maxFileSize: APP_CONFIG.UPLOAD.MAX_FILE_SIZE,
        stage: "select",
      });

      toast.error("Image is too large", {
        description: `Images must be under ${Math.round(
          APP_CONFIG.UPLOAD.MAX_FILE_SIZE / 1024 / 1024,
        )}MB before cropping.`,
      });
    },
    [referenceId, type],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
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
            <P>Drop the image here…</P>
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
            <div className="bg-background/50 absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <P className="mb-2 text-sm">Uploading image… {progress}%</P>
                <Progress value={progress} className="w-32" />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
