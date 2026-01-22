"use client";

import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { ImageCropper } from "@/components/image-cropper";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { P } from "@/components/typography";
import { useImageUploadTwo } from "@/hooks/use-image-upload-two";

export function ImageUploadTwo({
  listingId,
  onUploadComplete,
}: {
  listingId: string;
  onUploadComplete?: (result: { success: true }) => void;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { upload, progress, isUploading } = useImageUploadTwo({
    listingId,
    onSuccess: () => onUploadComplete?.({ success: true }),
  });

  const reset = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
  }, [previewUrl]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  }, []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    multiple: false,
  });

  return (
    <div className="space-y-4">
      {!previewUrl && (
        <div
          {...getRootProps()}
          className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center ${isDragActive ? "border-primary" : "border-muted"}`}
        >
          <input {...getInputProps()} />
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
              await upload(result);
              reset();
            }}
            onCancel={reset}
            isDisabled={isUploading}
          />
          {isUploading && (
            <div className="bg-background/50 absolute inset-0 flex items-center justify-center">
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

export function ImageUploadTwoSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-32 w-full rounded-lg" />
    </div>
  );
}
