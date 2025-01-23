"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { OptimizedImage } from "@/components/optimized-image";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface ImageGalleryProps {
  images: {
    id: string;
    url: string;
    alt?: string;
  }[];
  className?: string;
}

export function ImageGallery({ images, className }: ImageGalleryProps) {
  const [selectedImage, setSelectedImage] = React.useState(images[0] ?? null);

  if (!images.length || !selectedImage) return null;

  return (
    <div className={cn("space-y-4", className)}>
      <OptimizedImage
        src={selectedImage.url}
        alt={selectedImage.alt ?? "Gallery image"}
        size="full"
        priority
        className="aspect-[16/9]"
      />

      <ScrollArea>
        <div className="flex gap-2">
          {images.map((image) => (
            <button
              key={image.id}
              onClick={() => setSelectedImage(image)}
              className={cn(
                "relative h-20 w-20 rounded-lg ring-offset-background transition-all hover:opacity-80",
                selectedImage.id === image.id &&
                  "ring-2 ring-primary ring-offset-2",
              )}
            >
              <OptimizedImage
                src={image.url}
                alt={image.alt ?? "Thumbnail"}
                size="thumbnail"
                className="h-full w-full"
              />
            </button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
