"use client";

import { useEffect, useRef, useState } from "react";
import ReactCrop, {
  type PixelCrop,
  type PercentCrop,
  centerCrop,
  convertToPixelCrop,
  makeAspectCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Button } from "./ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useImageCropWebMcp } from "@/hooks/use-image-crop-webmcp";
import {
  getErrorMessage,
  normalizeError,
  reportError,
} from "@/lib/error-utils";

async function getCroppedBlob(
  image: HTMLImageElement,
  crop: PixelCrop,
  mimeType: string,
  options?: {
    maxOutputPx?: number;
    quality?: number;
  },
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D context not found");

  const sourceWidth = Math.round(crop.width);
  const sourceHeight = Math.round(crop.height);
  const maxOutputPx = options?.maxOutputPx ?? 1600;
  const outputScale = Math.min(
    1,
    maxOutputPx / Math.max(sourceWidth, sourceHeight),
  );
  canvas.width = Math.max(1, Math.round(sourceWidth * outputScale));
  canvas.height = Math.max(1, Math.round(sourceHeight * outputScale));

  ctx.drawImage(
    image,
    Math.round(crop.x),
    Math.round(crop.y),
    sourceWidth,
    sourceHeight,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Canvas is empty"))),
      mimeType,
      options?.quality ?? 0.92,
    );
  });
}

interface ImageCropperProps {
  src: string; // Image source URL
  minPx?: number; // Minimum pixel dimension in the *final* cropped image (default 300)
  mimeType?: string; // MIME type for the output (default "image/webp")
  maxOutputPx?: number;
  quality?: number;
  onCropComplete: (blob: Blob) => void;
  onCancel?: () => void;
  isDisabled?: boolean;
  confirmButtonLabel?: string;
}

export function ImageCropper({
  src,
  minPx = 300,
  mimeType = "image/webp",
  maxOutputPx = 1600,
  quality = 0.98,
  onCropComplete,
  onCancel,
  isDisabled,
  confirmButtonLabel = "Upload",
}: ImageCropperProps) {
  const [crop, setCrop] = useState<PercentCrop>();
  const [initialCrop, setInitialCrop] = useState<PercentCrop>();
  const [naturalDims, setNaturalDims] = useState({ w: 0, h: 0 });
  const [displayDims, setDisplayDims] = useState({ w: 0, h: 0 });
  const imageRef = useRef<HTMLImageElement | null>(null);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    setNaturalDims({ w: naturalWidth, h: naturalHeight });
    setDisplayDims({
      w: (e.currentTarget as HTMLImageElement).width,
      h: (e.currentTarget as HTMLImageElement).height,
    });

    const shortestSide = Math.min(naturalWidth, naturalHeight);
    const size = Math.max(
      Math.min(minPx, shortestSide),
      Math.floor(shortestSide * 0.9),
    );
    const initial = centerCrop(
      makeAspectCrop(
        {
          unit: "%",
          width: (size / naturalWidth) * 100,
        },
        1,
        naturalWidth,
        naturalHeight,
      ),
      naturalWidth,
      naturalHeight,
    );

    setCrop(initial);
    setInitialCrop(initial);
  };

  useEffect(() => {
    const image = imageRef.current;
    if (!image) return;
    const observer = new ResizeObserver(() => {
      setDisplayDims({ w: image.width, h: image.height });
    });
    observer.observe(image);
    return () => observer.disconnect();
  }, []);

  // Dynamically compute the minWidth in displayed px
  // so the final crop is never below minPx in the original image.
  // E.g. if the displayed image is half as large as the original,
  // we want minWidth = minPx * 0.5 for the displayed crop.
  const dynamicMin = (() => {
    if (!naturalDims.w || !displayDims.w) return 0;
    const ratio = displayDims.w / naturalDims.w; // how much the image is scaled down
    return Math.min(minPx, naturalDims.w, naturalDims.h) * ratio;
  })();

  useImageCropWebMcp({
    crop,
    width: naturalDims.w,
    height: naturalDims.h,
    minPx,
    maxOutputPx,
    isDisabled,
    onChange: setCrop,
  });

  const handleCompleteCrop = async () => {
    const img = imageRef.current;
    if (!img || !crop) return;

    try {
      const pxCrop = convertToPixelCrop(
        crop,
        img.naturalWidth,
        img.naturalHeight,
      );

      const blob = await getCroppedBlob(img, pxCrop, mimeType, {
        maxOutputPx,
        quality,
      });
      onCropComplete(blob);
    } catch (error) {
      toast.error("Failed to crop image", {
        description: getErrorMessage(error),
      });
      reportError({
        error: normalizeError(error),
        context: { source: "ImageCropper" },
      });
    }
  };

  const handleReset = () => {
    if (initialCrop) setCrop(initialCrop);
  };

  return (
    <div role="group" aria-label="Image crop" className="flex flex-col gap-4">
      <div className="relative overflow-hidden rounded-lg border">
        <ReactCrop
          crop={crop}
          onChange={(_, percentCrop) => {
            if (!isDisabled) {
              setCrop(percentCrop);
            }
          }}
          aspect={1}
          // Here's where we pass the dynamic min size in displayed px.
          minWidth={dynamicMin}
          minHeight={dynamicMin}
          keepSelection
          className={cn(
            "block max-w-full",
            isDisabled && "pointer-events-none opacity-50",
          )}
        >
          <Image
            ref={imageRef}
            src={src}
            alt="Crop preview"
            onLoad={handleImageLoad}
            className="block h-auto max-h-125 w-auto max-w-full"
            width={naturalDims.w || 1920}
            height={naturalDims.h || 1080}
            unoptimized
          />
        </ReactCrop>
      </div>
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isDisabled}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleReset}
          disabled={isDisabled}
        >
          Reset
        </Button>
        <Button
          type="button"
          onClick={handleCompleteCrop}
          disabled={!crop || isDisabled === true}
        >
          {confirmButtonLabel}
        </Button>
      </div>
    </div>
  );
}
