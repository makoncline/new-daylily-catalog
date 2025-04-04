"use client";

import { type Image as ImageType } from "@prisma/client";
import { OptimizedImage } from "@/components/optimized-image";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { ImageGallery } from "@/components/image-gallery";

interface TableImagePreviewProps {
  images: ImageType[];
  ahsImageUrl?: string | null;
}

export function TableImagePreview({
  images,
  ahsImageUrl,
}: TableImagePreviewProps) {
  const allImages = [
    ...images,
    ...(ahsImageUrl ? [{ url: ahsImageUrl, id: "ahs-image" }] : []),
  ];

  if (allImages.length === 0) return null;

  const firstImage = allImages[0]!;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          className={cn(
            "group relative -m-1 flex aspect-square h-[calc(100%+1rem)] items-center justify-center rounded-md border bg-muted/50",
          )}
        >
          <div className="absolute overflow-hidden rounded-[4px]">
            <OptimizedImage
              src={firstImage.url}
              alt="Image preview"
              size="thumbnail"
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
