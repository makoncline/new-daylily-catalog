"use client";

import { useMemo, useState } from "react";
import { OptimizedImage } from "@/components/optimized-image";
import { cn } from "@/lib/utils";
import { type RouterOutputs } from "@/trpc/react";

type CultivarPageOutput = NonNullable<
  RouterOutputs["public"]["getCultivarPage"]
>;
type HeroImage = CultivarPageOutput["heroImages"][number];

interface CultivarGalleryProps {
  images: HeroImage[];
  cultivarName: string;
}

export function CultivarGallery({
  images,
  cultivarName,
}: CultivarGalleryProps) {
  const safeImages = useMemo(
    () => images.filter((image) => Boolean(image.url)),
    [images],
  );
  const [selectedImageId, setSelectedImageId] = useState(
    safeImages[0]?.id ?? null,
  );

  const selectedImage =
    safeImages.find((image) => image.id === selectedImageId) ??
    safeImages[0] ??
    null;

  if (!selectedImage) {
    return null;
  }

  return (
    <section aria-label="Cultivar gallery" className="space-y-3">
      <div className="bg-muted/20 max-w-[400px] overflow-hidden rounded-xl border">
        <OptimizedImage
          src={selectedImage.url}
          alt={selectedImage.alt ?? `${cultivarName} image`}
          size="full"
          priority
          className="aspect-square w-full object-cover"
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
                  "focus-visible:ring-primary overflow-hidden rounded-md border focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
                  isActive
                    ? "ring-primary ring-2 ring-offset-2"
                    : "hover:border-primary/60",
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
