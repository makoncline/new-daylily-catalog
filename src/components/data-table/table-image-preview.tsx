"use client";

import { OptimizedImage } from "@/components/optimized-image";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { ImageGallery } from "@/components/image-gallery";

type PreviewImg = { id: string; url: string };

interface TableImagePreviewProps {
  images: PreviewImg[];
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
            "group bg-muted/50 relative -m-1 flex aspect-square h-[calc(100%_+_1rem)] items-center justify-center rounded-md border",
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
