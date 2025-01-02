"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { ImageCropper } from "@/components/image-cropper";
import { useImageUpload } from "@/hooks/use-image-upload";
import { type ImageUploadProps } from "@/types/image";
import { validateImage } from "@/lib/image-utils";

export function ImageUpload({
  type,
  referenceId,
  onUploadComplete,
  maxFiles = 1,
}: ImageUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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
    setSelectedFile(null);
    setPreviewUrl(null);
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    try {
      validateImage(file);

      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);

      setSelectedFile(file);
    } catch (error) {
      console.error("File validation failed:", error);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
    },
    maxSize: 5 * 1024 * 1024, // 5MB
    maxFiles,
    multiple: maxFiles > 1,
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
            <p>Drop the image here...</p>
          ) : (
            <p>Drag and drop an image here, or click to select one</p>
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
                <p className="mb-2 text-sm">Uploading image... {progress}%</p>
                <div className="h-1 w-32 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
