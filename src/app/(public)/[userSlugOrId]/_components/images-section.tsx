"use client";

import { ImageGallery } from "@/components/image-gallery";
import { ImagePlaceholder } from "@/components/image-placeholder";

interface ImagesSectionProps {
  images?: { id: string; url: string }[];
  profileTitle?: string;
}

export function ImagesSection({ images, profileTitle }: ImagesSectionProps) {
  return (
    <div id="images">
      {images?.length ? (
        <ImageGallery images={images} profileTitle={profileTitle} />
      ) : (
        <ImagePlaceholder />
      )}
    </div>
  );
}
