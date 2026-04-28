"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import Image from "next/image";
import { ImageCropper } from "@/components/image-cropper";
import { APP_CONFIG } from "@/config/constants";
import { IMAGE_CONFIG } from "@/components/optimized-image";
import { Button } from "@/components/ui/button";
import { P } from "@/components/typography";

interface OnboardingDeferredImageUploadProps {
  stagedPreviewUrl: string | null;
  onDeferredUploadReady: (file: Blob) => void;
  onDeferredUploadCleared?: () => void;
}

export function OnboardingDeferredImageUpload({
  stagedPreviewUrl,
  onDeferredUploadReady,
  onDeferredUploadCleared,
}: OnboardingDeferredImageUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const resetCropSelection = useCallback(() => {
    setPreviewUrl(null);
  }, []);

  const clearStagedUpload = useCallback(() => {
    setPreviewUrl(null);
    onDeferredUploadCleared?.();
  }, [onDeferredUploadCleared]);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) {
        return;
      }

      clearStagedUpload();
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    },
    [clearStagedUpload],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [],
    },
    maxSize: APP_CONFIG.UPLOAD.MAX_FILE_SIZE,
    multiple: false,
  });

  return (
    <div className="space-y-4">
      {!previewUrl && !stagedPreviewUrl ? (
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
      ) : null}

      {previewUrl ? (
        <ImageCropper
          src={previewUrl}
          confirmButtonLabel="Continue"
          onCropComplete={(blob) => {
            onDeferredUploadReady(blob);
            setPreviewUrl(null);
          }}
          onCancel={resetCropSelection}
        />
      ) : null}

      {!previewUrl && stagedPreviewUrl ? (
        <div className="space-y-3 rounded-lg border p-3">
          <div
            className="relative aspect-square w-full overflow-hidden rounded-md"
            style={{ maxWidth: IMAGE_CONFIG.SIZES.THUMBNAIL }}
          >
            <Image
              src={stagedPreviewUrl}
              alt="Prepared upload preview"
              fill
              className="object-cover"
              unoptimized
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => setPreviewUrl(stagedPreviewUrl)}
            >
              Adjust crop
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={clearStagedUpload}
            >
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
