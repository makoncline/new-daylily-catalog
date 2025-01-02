import { type Crop } from "react-image-crop";

export interface CropConfig {
  aspect: number;
  minWidth?: number;
  maxWidth?: number;
}

export interface CropResult {
  blob: Blob;
  dimensions: {
    width: number;
    height: number;
  };
}

export function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number,
) {
  // For a square crop box, use the smaller dimension
  const size = Math.min(mediaWidth, mediaHeight);
  const width = size;
  const height = size;

  // Center the crop box
  const x = (mediaWidth - width) / 2;
  const y = (mediaHeight - height) / 2;

  // Convert to percentages
  return {
    unit: "%",
    width: (width / mediaWidth) * 100,
    height: (height / mediaHeight) * 100,
    x: (x / mediaWidth) * 100,
    y: (y / mediaHeight) * 100,
    aspect,
  } as const;
}

export async function getCroppedBlob(
  image: HTMLImageElement,
  crop: Crop,
  mimeType: string,
): Promise<CropResult> {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const pixelRatio = window.devicePixelRatio;

  if (!ctx) {
    throw new Error("No 2d context");
  }

  // Convert percentage to pixels if needed
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  const cropX =
    (crop.unit === "%" ? (crop.x * image.width) / 100 : crop.x) * scaleX;
  const cropY =
    (crop.unit === "%" ? (crop.y * image.height) / 100 : crop.y) * scaleY;
  const cropWidth =
    (crop.unit === "%" ? (crop.width * image.width) / 100 : crop.width) *
    scaleX;
  const cropHeight =
    (crop.unit === "%" ? (crop.height * image.height) / 100 : crop.height) *
    scaleY;

  const MIN_SIZE = 100;
  if (cropWidth < MIN_SIZE || cropHeight < MIN_SIZE) {
    throw new Error(
      `Final cropped image must be at least ${MIN_SIZE}x${MIN_SIZE}px`,
    );
  }

  canvas.width = Math.floor(cropWidth * pixelRatio);
  canvas.height = Math.floor(cropHeight * pixelRatio);

  ctx.scale(pixelRatio, pixelRatio);
  ctx.imageSmoothingQuality = "high";

  ctx.drawImage(
    image,
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    0,
    0,
    cropWidth,
    cropHeight,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Failed to create blob"));
          return;
        }
        resolve({
          blob,
          dimensions: {
            width: canvas.width,
            height: canvas.height,
          },
        });
      },
      mimeType,
      1,
    );
  });
}
