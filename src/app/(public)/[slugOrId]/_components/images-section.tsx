"use client";

import { ImageGallery } from "@/components/image-gallery";

interface ImagesSectionProps {
  images?: { id: string; url: string }[];
}

export function ImagesSection({ images }: ImagesSectionProps) {
  if (!images?.length) return null;

  return (
    <div id="images">
      <ImageGallery images={images} />
    </div>
  );
}
