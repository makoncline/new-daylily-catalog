"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ReactCrop, {
  type PixelCrop,
  type PercentCrop,
  centerCrop,
  makeAspectCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Button } from "./ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { getErrorMessage, normalizeError } from "@/lib/error-utils";

async function getCroppedBlob(
  image: HTMLImageElement,
  crop: PixelCrop,
  mimeType: string,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D context not found");

  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  canvas.width = Math.floor(crop.width * scaleX);
  canvas.height = Math.floor(crop.height * scaleY);

  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Canvas is empty"))),
      mimeType,
      1,
    );
  });
}

interface ImageCropperProps {
  src: string; // Image source URL
  minPx?: number; // Minimum pixel dimension in the *final* cropped image (default 300)
  mimeType?: string; // MIME type for the output (default "image/jpeg")
  onCropComplete: (blob: Blob) => void;
  onCancel?: () => void;
  isDisabled?: boolean;
}

// This approach:
// 1. Uses % cropping plus built-in helpers (centerCrop, makeAspectCrop).
// 2. Dynamically calculates minWidth/minHeight in displayed px, ensuring the final crop is never below `minPx` in the full-res image.
// 3. Recomputes upon window resize so the min crop adapts to any layout changes.
export function ImageCropper({
  src,
  minPx = 300,
  mimeType = "image/jpeg",
  onCropComplete,
  onCancel,
  isDisabled,
}: ImageCropperProps) {
  const [crop, setCrop] = useState<PercentCrop>();
  const [initialCrop, setInitialCrop] = useState<PercentCrop>();
  const [naturalDims, setNaturalDims] = useState({ w: 0, h: 0 });
  const [displayDims, setDisplayDims] = useState({ w: 0, h: 0 });
  const imageRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { toast } = useToast();

  // Measure displayed image on load and create a large centered square crop in %.
  const handleImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { naturalWidth, naturalHeight } = e.currentTarget;
      setNaturalDims({ w: naturalWidth, h: naturalHeight });
      setDisplayDims({
        w: (e.currentTarget as HTMLImageElement).width,
        h: (e.currentTarget as HTMLImageElement).height,
      });

      const aspect = 1;
      const initial = centerCrop(
        makeAspectCrop(
          {
            unit: "%",
            width: 90, // Start at 90% of whichever dimension is smaller
          },
          aspect,
          naturalWidth,
          naturalHeight,
        ),
        naturalWidth,
        naturalHeight,
      );

      setCrop(initial);
      setInitialCrop(initial);
    },
    [],
  );

  // Re-measure displayed width/height on window resize,
  // so minWidth/minHeight can adapt. This uses a simple window resize approach.
  useEffect(() => {
    function handleResize() {
      if (imageRef.current) {
        setDisplayDims({
          w: imageRef.current.width,
          h: imageRef.current.height,
        });
      }
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Dynamically compute the minWidth in displayed px
  // so the final crop is never below minPx in the original image.
  // E.g. if the displayed image is half as large as the original,
  // we want minWidth = minPx * 0.5 for the displayed crop.
  const dynamicMin = (() => {
    if (!naturalDims.w || !displayDims.w) return 0;
    const ratio = displayDims.w / naturalDims.w; // how much the image is scaled down
    return minPx * ratio; // min displayed px to ensure final crop is at least minPx
  })();

  const handleCompleteCrop = async () => {
    const img = imageRef.current;
    if (!img || !crop) return;

    try {
      const pxCrop: PixelCrop = {
        unit: "px",
        x: (crop.x / 100) * displayDims.w,
        y: (crop.y / 100) * displayDims.h,
        width: (crop.width / 100) * displayDims.w,
        height: (crop.height / 100) * displayDims.h,
      };

      const blob = await getCroppedBlob(img, pxCrop, mimeType);
      onCropComplete(blob);
    } catch (error) {
      toast({
        title: "Failed to crop image",
        description: getErrorMessage(error),
        variant: "destructive",
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
    <div ref={containerRef} className="space-y-4">
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
            "max-w-full",
            isDisabled && "pointer-events-none opacity-50",
          )}
          style={{ display: "block" }}
        >
          <Image
            ref={imageRef}
            src={src}
            alt="Crop preview"
            onLoad={handleImageLoad}
            className="block max-h-[500px] w-full object-contain"
            width={1920}
            height={1080}
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
          disabled={isDisabled ?? !crop}
        >
          Upload
        </Button>
      </div>
    </div>
  );
}
