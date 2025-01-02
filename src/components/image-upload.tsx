"use client";

import { useCallback, useState, useRef } from "react";
import { useDropzone } from "react-dropzone";
import ReactCrop, {
  type Crop,
  centerCrop,
  makeAspectCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { type ImageUploadProps } from "@/types/image";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number,
) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: "%",
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight,
    ),
    mediaWidth,
    mediaHeight,
  );
}

function getCroppedImg(
  image: HTMLImageElement,
  crop: Crop,
  mimeType: string,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("No 2d context");
  }

  const pixelRatio = window.devicePixelRatio;
  canvas.width = Math.floor(crop.width * scaleX * pixelRatio);
  canvas.height = Math.floor(crop.height * scaleY * pixelRatio);

  ctx.scale(pixelRatio, pixelRatio);
  ctx.imageSmoothingQuality = "high";

  const cropX = crop.x * scaleX;
  const cropY = crop.y * scaleY;

  ctx.save();

  // Move the crop origin to the canvas origin (0,0)
  ctx.translate(-cropX, -cropY);
  // Draw the cropped image at the correct position
  ctx.drawImage(
    image,
    0,
    0,
    image.naturalWidth,
    image.naturalHeight,
    0,
    0,
    image.naturalWidth,
    image.naturalHeight,
  );

  ctx.restore();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Failed to create blob"));
          return;
        }
        resolve(blob);
      },
      mimeType,
      1,
    );
  });
}

export function ImageUpload({
  type,
  referenceId,
  onUploadComplete = () => {
    console.log("Upload complete");
  },
  maxFiles = 1,
}: ImageUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<Crop>();
  const [isUploading, setIsUploading] = useState(false);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const { toast } = useToast();
  const [uploadProgress, setUploadProgress] = useState(0);

  const getPresignedUrlMutation = api.image.getPresignedUrl.useMutation({
    onError: () => {
      toast({
        title: "Failed to get upload URL",
        variant: "destructive",
      });
    },
  });

  const createImageMutation = api.image.createImage.useMutation({
    onError: () => {
      toast({
        title: "Failed to save image",
        variant: "destructive",
      });
    },
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Create preview URL
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    setSelectedFile(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
    },
    maxSize: MAX_FILE_SIZE,
    maxFiles,
    multiple: maxFiles > 1,
  });

  const handleUpload = async () => {
    if (!selectedFile || !completedCrop || !imageRef.current) return;

    try {
      setIsUploading(true);
      setUploadProgress(0);

      // Get presigned URL with original content type
      const { presignedUrl, key, url } =
        await getPresignedUrlMutation.mutateAsync({
          type,
          fileName: selectedFile.name,
          contentType: selectedFile.type,
          size: selectedFile.size,
          referenceId,
        });

      // Create the cropped image blob with original mime type
      const croppedBlob = await getCroppedImg(
        imageRef.current,
        completedCrop,
        selectedFile.type,
      );

      // Upload to S3 with progress tracking
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(progress);
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error("Upload failed"));
          }
        });

        xhr.addEventListener("error", () => {
          reject(new Error("Upload failed"));
        });

        xhr.open("PUT", presignedUrl);
        xhr.setRequestHeader("Content-Type", selectedFile.type);
        xhr.send(croppedBlob);
      });

      // Create the image in the database
      const image = await createImageMutation.mutateAsync({
        type,
        referenceId,
        url,
        key,
      });

      // Consider the upload successful if we got this far
      onUploadComplete({
        url,
        key,
        success: true,
        image,
      });
      toast({
        title: "Image uploaded successfully",
      });

      // Reset state to initial
      setSelectedFile(null);
      setPreviewUrl(null);
      setCrop(undefined);
      setCompletedCrop(undefined);
      setUploadProgress(0);
    } catch (error) {
      console.error("Upload failed:", error);
      toast({
        title: "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

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
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-lg border">
            <ReactCrop
              crop={crop}
              onChange={(c) => !isUploading && setCrop(c)}
              onComplete={(c) => !isUploading && setCompletedCrop(c)}
              aspect={1}
              className={cn(
                "max-w-full",
                isUploading && "pointer-events-none opacity-50",
              )}
              style={{ display: "block" }}
            >
              <img
                ref={imageRef}
                src={previewUrl}
                alt="Preview"
                onLoad={(e) => {
                  const img = e.currentTarget;
                  const initial = centerAspectCrop(img.width, img.height, 1);
                  setCrop(initial);
                  setCompletedCrop(initial);
                }}
                className="block h-full w-full object-cover"
              />
            </ReactCrop>
            {isUploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                <div className="text-center">
                  <p className="mb-2 text-sm">
                    Uploading image... {uploadProgress}%
                  </p>
                  <div className="h-1 w-32 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setPreviewUrl(null);
                setSelectedFile(null);
                setCrop(undefined);
                setCompletedCrop(undefined);
              }}
              disabled={isUploading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!completedCrop || isUploading}
              className="flex-1"
            >
              {isUploading ? "Uploading..." : "Upload Image"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
