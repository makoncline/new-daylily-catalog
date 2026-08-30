"use client";

import { Button } from "@daylily-catalog/ui/components/button";
import * as React from "react";

import { getOrderedStorefrontImages } from "@/lib/storefront-images";
import type { StorefrontImage } from "@/types";

import { StorefrontImageView } from "./storefront-image";

export function ImageGallery({
  images,
  title,
}: {
  images: StorefrontImage[];
  title: string;
}) {
  const orderedImages = React.useMemo(
    () => getOrderedStorefrontImages(images),
    [images],
  );
  const [selectedId, setSelectedId] = React.useState(
    orderedImages.at(0)?.id ?? "",
  );
  const selected =
    orderedImages.find((image) => image.id === selectedId) ??
    orderedImages.at(0);

  if (!selected) {
    return (
      <div className="bg-muted text-muted-foreground grid aspect-square place-items-center rounded-xl border">
        Image not available
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <div className="bg-muted relative aspect-square overflow-hidden rounded-xl border">
        <StorefrontImageView
          image={selected}
          alt={`${title} daylily`}
          sizes="(min-width: 1280px) 592px, (min-width: 1024px) calc(50vw - 3rem), calc(100vw - 2rem)"
          priority
        />
      </div>
      {orderedImages.length > 1 ? (
        <div
          className="grid grid-cols-4 gap-3"
          role="group"
          aria-label={`${title} images`}
        >
          {orderedImages.map((image, index) => (
            <Button
              key={image.id}
              type="button"
              variant="outline"
              className="aria-pressed:ring-primary relative aspect-square h-auto overflow-hidden p-0 aria-pressed:ring-2 aria-pressed:ring-offset-2"
              aria-label={`Show image ${index + 1} of ${orderedImages.length}`}
              aria-pressed={image.id === selected.id}
              onClick={() => setSelectedId(image.id)}
            >
              <StorefrontImageView
                image={image}
                alt=""
                sizes="120px"
                thumbnail
              />
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
