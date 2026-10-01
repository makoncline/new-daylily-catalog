"use client";

import { useEffect, useId, useRef, useState } from "react";
import ReactCrop, {
  type PixelCrop,
  type PercentCrop,
  centerCrop,
  convertToPercentCrop,
  convertToPixelCrop,
  makeAspectCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Image from "next/image";
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
  const [cropInputs, setCropInputs] = useState({ left: "", top: "", size: "" });
  const [cropError, setCropError] = useState<string | null>(null);
  const cropControlId = useId();
  const imageRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const setSelection = (
    next: PercentCrop,
    width = naturalDims.w,
    height = naturalDims.h,
  ) => {
    setCrop(next);
    const pixels = convertToPixelCrop(next, width, height);
    setCropInputs({
      left: String(Math.round(pixels.x)),
      top: String(Math.round(pixels.y)),
      size: String(Math.round(pixels.width)),
    });
    setCropError(null);
  };

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

    setSelection(initial, naturalWidth, naturalHeight);
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

  const selectedPixels = crop
    ? convertToPixelCrop(crop, naturalDims.w, naturalDims.h)
    : null;
  const hasPendingCrop = Boolean(
    selectedPixels &&
      (cropInputs.left !== String(Math.round(selectedPixels.x)) ||
        cropInputs.top !== String(Math.round(selectedPixels.y)) ||
        cropInputs.size !== String(Math.round(selectedPixels.width))),
  );

  const applyCropInputs = () => {
    const left = cropInputs.left.trim() ? Number(cropInputs.left) : NaN;
    const top = cropInputs.top.trim() ? Number(cropInputs.top) : NaN;
    const size = cropInputs.size.trim() ? Number(cropInputs.size) : NaN;
    const minimum = Math.min(minPx, naturalDims.w, naturalDims.h);
    if (
      ![left, top, size].every(Number.isInteger) ||
      left < 0 ||
      top < 0 ||
      size < minimum ||
      left + size > naturalDims.w ||
      top + size > naturalDims.h
    ) {
      setCropError(
        `Use whole pixels. The square must be at least ${minimum}px and stay inside the image.`,
      );
      return;
    }
    setSelection(
      convertToPercentCrop(
        { unit: "px", x: left, y: top, width: size, height: size },
        naturalDims.w,
        naturalDims.h,
      ),
    );
  };

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
    if (initialCrop) setSelection(initialCrop);
  };

  return (
    <div ref={containerRef} className="space-y-4">
      <div className="relative overflow-hidden rounded-lg border">
        <ReactCrop
          crop={crop}
          onChange={(_, percentCrop) => {
            if (!isDisabled) {
              setSelection(percentCrop);
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
        >
          <Image
            ref={imageRef}
            src={src}
            alt="Crop preview"
            onLoad={handleImageLoad}
            className="block h-auto max-h-[500px] w-auto max-w-full"
            width={naturalDims.w || 1920}
            height={naturalDims.h || 1080}
            unoptimized
          />
        </ReactCrop>
      </div>
      <fieldset disabled={!crop || isDisabled === true} className="space-y-2">
        <legend className="text-sm font-medium">Square crop</legend>
        <p
          id={`${cropControlId}-help`}
          className="text-muted-foreground text-sm"
        >
          Drag the square, or enter pixels and select Apply crop. Image:{" "}
          {naturalDims.w} × {naturalDims.h}px.
        </p>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ["left", "Left (px)", 0, naturalDims.w],
              ["top", "Top (px)", 0, naturalDims.h],
              [
                "size",
                "Size (px)",
                Math.min(minPx, naturalDims.w, naturalDims.h),
                Math.min(naturalDims.w, naturalDims.h),
              ],
            ] as const
          ).map(([field, label, minimum, maximum]) => (
            <div key={field} className="space-y-1">
              <Label htmlFor={`${cropControlId}-${field}`}>{label}</Label>
              <Input
                id={`${cropControlId}-${field}`}
                type="number"
                inputMode="numeric"
                min={minimum}
                max={maximum}
                step={1}
                value={cropInputs[field]}
                aria-describedby={`${cropControlId}-help`}
                onChange={(event) => {
                  setCropInputs((current) => ({
                    ...current,
                    [field]: event.target.value,
                  }));
                  setCropError(null);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    applyCropInputs();
                  }
                }}
              />
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={applyCropInputs}
          disabled={!hasPendingCrop}
        >
          Apply crop
        </Button>
        {cropError && (
          <p role="alert" className="text-destructive text-sm">
            {cropError}
          </p>
        )}
        {selectedPixels && (
          <p role="status" className="text-muted-foreground text-sm">
            Upload size:{" "}
            {Math.min(maxOutputPx, Math.round(selectedPixels.width))} ×{" "}
            {Math.min(maxOutputPx, Math.round(selectedPixels.height))}px.
          </p>
        )}
      </fieldset>
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
          disabled={!crop || hasPendingCrop || isDisabled === true}
        >
          {confirmButtonLabel}
        </Button>
      </div>
    </div>
  );
}
