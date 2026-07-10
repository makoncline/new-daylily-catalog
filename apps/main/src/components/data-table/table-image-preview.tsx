"use client";

import {
  OptimizedImage,
  type OptimizedImageSource,
} from "@/components/optimized-image";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { ImageGallery } from "@/components/image-gallery";

interface TableImagePreviewProps {
  images: OptimizedImageSource[];
  cultivarReferenceImage?: OptimizedImageSource | null;
}

export function TableImagePreview({
  images,
  cultivarReferenceImage,
}: TableImagePreviewProps) {
  const allImages: OptimizedImageSource[] = [
    ...images,
    ...(cultivarReferenceImage ? [cultivarReferenceImage] : []),
  ];

  if (allImages.length === 0) return null;

  const firstImage = allImages[0]!;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          className={cn(
            "group bg-muted/50 relative -m-1 flex aspect-square h-[calc(100%_+_1rem)] items-center justify-center rounded-md border",
          )}
        >
          <div className="absolute inset-0 overflow-hidden rounded-[4px]">
            <OptimizedImage
              image={firstImage}
              alt="Image preview"
              size="thumbnail"
              className="size-full"
            />
          </div>
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <ImageGallery images={allImages} />
      </DialogContent>
    </Dialog>
  );
}
