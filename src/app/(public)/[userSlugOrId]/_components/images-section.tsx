"use client";

import { ImageGallery } from "@/components/image-gallery";
import { ImagePlaceholder } from "@/components/image-placeholder";

interface ImagesSectionProps {
  images?: { id: string; url: string }[];
}

export function ImagesSection({ images }: ImagesSectionProps) {
  return (
    <div id="images">
      {images?.length ? <ImageGallery images={images} /> : <ImagePlaceholder />}
    </div>
  );
}
