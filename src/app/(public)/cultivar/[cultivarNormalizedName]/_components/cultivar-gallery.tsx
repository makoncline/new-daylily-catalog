"use client";

import { useMemo, useState } from "react";
import { OptimizedImage } from "@/components/optimized-image";
import { cn } from "@/lib/utils";
import { type RouterOutputs } from "@/trpc/react";

type CultivarPageOutput = NonNullable<RouterOutputs["public"]["getCultivarPage"]>;
type HeroImage = CultivarPageOutput["heroImages"][number];

interface CultivarGalleryProps {
  images: HeroImage[];
  cultivarName: string;
}

export function CultivarGallery({ images, cultivarName }: CultivarGalleryProps) {
  const safeImages = useMemo(() => images.filter((image) => Boolean(image.url)), [images]);
  const [selectedImageId, setSelectedImageId] = useState(safeImages[0]?.id ?? null);

  const selectedImage =
    safeImages.find((image) => image.id === selectedImageId) ?? safeImages[0] ?? null;

  if (!selectedImage) {
    return null;
  }

  return (
    <section aria-label="Cultivar gallery" className="space-y-3">
      <div className="overflow-hidden rounded-xl border bg-muted/20">
        <OptimizedImage
          src={selectedImage.url}
          alt={selectedImage.alt ?? `${cultivarName} image`}
          size="full"
          priority
          className="max-h-[560px] w-full object-cover"
        />
      </div>

      {safeImages.length > 1 && (
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-6">
          {safeImages.slice(0, 12).map((image) => {
            const isActive = image.id === selectedImage.id;

            return (
              <button
                key={image.id}
                type="button"
                onClick={() => setSelectedImageId(image.id)}
                className={cn(
                  "overflow-hidden rounded-md border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                  isActive ? "ring-2 ring-primary ring-offset-2" : "hover:border-primary/60",
                )}
                aria-label={`Show image ${image.alt ?? image.id}`}
                aria-pressed={isActive}
              >
                <OptimizedImage
                  src={image.url}
                  alt={image.alt ?? `${cultivarName} thumbnail`}
                  size="thumbnail"
                  className="h-16 w-full object-cover"
                />
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
