"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { OptimizedImage } from "@/components/optimized-image";
import { Skeleton } from "@/components/ui/skeleton";

interface ImageData {
  id: string;
  url: string;
  alt?: string;
}

interface ImageGalleryLayoutProps {
  className?: string;
  mainContent: React.ReactNode;
  thumbnailContent?: React.ReactNode;
}

function ImageGalleryLayout({
  className,
  mainContent,
  thumbnailContent,
}: ImageGalleryLayoutProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="overflow-hidden rounded-lg">{mainContent}</div>
      {thumbnailContent && (
        <div className="grid grid-cols-4 gap-2">{thumbnailContent}</div>
      )}
    </div>
  );
}

interface ThumbnailProps {
  image: ImageData;
  isSelected: boolean;
  onClick: () => void;
  generateAltText: (isThumbnail?: boolean) => string;
}

function Thumbnail({
  image,
  isSelected,
  onClick,
  generateAltText,
}: ThumbnailProps) {
  return (
    <div
      className={cn(
        "cursor-pointer overflow-hidden rounded-lg",
        isSelected && "ring-2 ring-primary ring-offset-2",
      )}
      onClick={onClick}
    >
      <OptimizedImage
        src={image.url}
        alt={image.alt ?? generateAltText(true)}
        size="thumbnail"
        className="h-full w-full"
      />
    </div>
  );
}

interface ImageGalleryProps {
  images: ImageData[];
  className?: string;
  profileTitle?: string;
  listingTitle?: string;
  listingName?: string;
}

export function ImageGallery({
  images,
  className,
  profileTitle,
  listingTitle,
  listingName,
}: ImageGalleryProps) {
  const [selectedImage, setSelectedImage] = React.useState(images[0] ?? null);

  // Generate descriptive alt text based on available context
  const generateAltText = (isThumbnail = false) => {
    if (listingTitle || listingName) {
      const displayName = listingTitle ?? listingName;
      return isThumbnail
        ? `${displayName} thumbnail`
        : `${displayName} daylily bloom`;
    }
    if (profileTitle) {
      return isThumbnail
        ? `${profileTitle} thumbnail`
        : `${profileTitle} garden image`;
    }
    return isThumbnail ? "Thumbnail" : "Gallery image";
  };

  if (!images.length || !selectedImage) return null;

  return (
    <ImageGalleryLayout
      className={className}
      mainContent={
        <OptimizedImage
          src={selectedImage.url}
          alt={selectedImage.alt ?? generateAltText(false)}
          size="full"
          priority
          className="h-full w-full"
        />
      }
      thumbnailContent={
        images.length > 1
          ? images.map((image) => (
              <Thumbnail
                key={image.id}
                image={image}
                isSelected={image.id === selectedImage.id}
                onClick={() => setSelectedImage(image)}
                generateAltText={generateAltText}
              />
            ))
          : undefined
      }
    />
  );
}

interface ImageGallerySkeletonProps {
  className?: string;
}

export function ImageGallerySkeleton({ className }: ImageGallerySkeletonProps) {
  return (
    <ImageGalleryLayout
      className={className}
      mainContent={<Skeleton className="aspect-square w-full" />}
      thumbnailContent={Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="aspect-square w-full rounded-lg" />
      ))}
    />
  );
}
