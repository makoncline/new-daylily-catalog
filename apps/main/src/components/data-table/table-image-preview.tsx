"use client";

import {
  OptimizedImage,
  type OptimizedImageSource,
} from "@/components/optimized-image";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ImageGallery } from "@/components/image-gallery";

interface TableImagePreviewProps {
  images: OptimizedImageSource[];
  cultivarReferenceImage?: OptimizedImageSource | null;
  imageAlt?: string;
}

export function TableImagePreview({
  images,
  cultivarReferenceImage,
  imageAlt = "Image preview",
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
          type="button"
          aria-label={
            imageAlt === "Image preview" ? undefined : `Preview ${imageAlt}`
          }
          className={cn(
            "group bg-muted/50 focus-visible:ring-ring relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-md border outline-none focus-visible:ring-2",
          )}
        >
          <div className="absolute inset-0 overflow-hidden rounded-[4px]">
            <OptimizedImage
              image={firstImage}
              alt={imageAlt}
              size="thumbnail"
              variant="thumb"
              className="size-full"
            />
          </div>
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogTitle className="sr-only">{imageAlt}</DialogTitle>
        <DialogDescription className="sr-only">
          Cultivar image preview
        </DialogDescription>
        <ImageGallery images={allImages} />
      </DialogContent>
    </Dialog>
  );
}
