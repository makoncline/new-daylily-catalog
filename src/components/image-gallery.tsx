"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { OptimizedImage } from "@/components/optimized-image";

interface ImageData {
  id: string;
  url: string;
  alt?: string;
}

interface ThumbnailProps {
  image: ImageData;
  isSelected: boolean;
  onClick: () => void;
}

function Thumbnail({ image, isSelected, onClick }: ThumbnailProps) {
  return (
    <div
      className={cn(
        "cursor-pointer overflow-hidden rounded-lg",
        isSelected && "ring-2 ring-primary ring-offset-2",
      )}
      onClick={onClick}
    >
      <OptimizedImage
        src={image.url}
        alt={image.alt ?? "Thumbnail"}
        size="thumbnail"
        className="h-full w-full"
      />
    </div>
  );
}

interface ImageGalleryProps {
  images: ImageData[];
  className?: string;
}

export function ImageGallery({ images, className }: ImageGalleryProps) {
  const [selectedImage, setSelectedImage] = React.useState(images[0] ?? null);

  if (!images.length || !selectedImage) return null;

  return (
    <div className={cn("max-w-3xl space-y-4 p-4", className)}>
      <div className="overflow-hidden rounded-lg">
        <OptimizedImage
          src={selectedImage.url}
          alt={selectedImage.alt ?? "Gallery image"}
          size="full"
          priority
          className="h-full w-full"
        />
      </div>

      <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
        {images.map((image) => (
          <Thumbnail
            key={image.id}
            image={image}
            isSelected={image.id === selectedImage.id}
            onClick={() => setSelectedImage(image)}
          />
        ))}
      </div>
    </div>
  );
}
