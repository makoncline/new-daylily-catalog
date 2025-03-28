"use client";

import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { reportError } from "@/lib/error-utils";
import { cloudflareLoader } from "@/lib/utils/cloudflareLoader";

// Image configuration
export const IMAGE_CONFIG = {
  BLUR: {
    SIZE: 20,
    QUALITY: 5, // Very low quality for blur placeholder
  },
  SIZES: {
    THUMBNAIL: 200,
    FULL: 800,
  },
  QUALITY: {
    MEDIUM: 75, // Good balance for most images
    HIGH: 90, // High quality for full size images
  },
  FIT: "cover" as const,
  FORMAT: "auto" as const,
  DEBUG: {
    BLUR_DELAY: {
      MIN: 500,
      MAX: 1000,
    },
  },
} as const;

interface OptimizedImageProps extends React.HTMLAttributes<HTMLDivElement> {
  src: string;
  alt: string;
  size?: "thumbnail" | "full";
  className?: string;
  priority?: boolean;
  fit?: "contain" | "cover";
}

export function OptimizedImage({
  src,
  alt,
  size = "thumbnail",
  className,
  priority = false,
  fit = IMAGE_CONFIG.FIT,
  ...props
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = React.useState(true);
  const [transformError, setTransformError] = React.useState(false);

  // Get dimensions based on size
  const dimension =
    size === "thumbnail"
      ? IMAGE_CONFIG.SIZES.THUMBNAIL
      : IMAGE_CONFIG.SIZES.FULL;

  const handleLoad = React.useCallback(() => {
    if (process.env.NODE_ENV === "development") {
      // Random delay between MIN and MAX in development
      const randomDelay = Math.floor(
        Math.random() *
          (IMAGE_CONFIG.DEBUG.BLUR_DELAY.MAX -
            IMAGE_CONFIG.DEBUG.BLUR_DELAY.MIN +
            1) +
          IMAGE_CONFIG.DEBUG.BLUR_DELAY.MIN,
      );

      setTimeout(() => {
        setIsLoading(false);
      }, randomDelay);
    } else {
      // In production, transition immediately
      setIsLoading(false);
    }
  }, []);

  const handleError: React.ReactEventHandler<HTMLImageElement> =
    React.useCallback(
      (_error) => {
        if (!transformError) {
          setTransformError(true);

          const transformedUrl = cloudflareLoader({
            src,
            width: dimension,
            quality:
              size === "thumbnail"
                ? IMAGE_CONFIG.QUALITY.MEDIUM
                : IMAGE_CONFIG.QUALITY.HIGH,
            fit,
          });

          const imageLoadError = new Error(
            `Failed to load optimized image resource: ${src}`,
          );

          reportError({
            error: imageLoadError,
            level: "warning",
            context: {
              source: "OptimizedImage",
              src,
              transformedUrl,
              size,
              fit,
            },
          });
        }
      },
      [transformError, src, dimension, size, fit],
    );

  // Get the transformed URLs
  const imageUrl = cloudflareLoader({
    src,
    width: dimension,
    quality:
      size === "thumbnail"
        ? IMAGE_CONFIG.QUALITY.MEDIUM
        : IMAGE_CONFIG.QUALITY.HIGH,
    fit,
  });

  const blurUrl = cloudflareLoader({
    src,
    width: IMAGE_CONFIG.BLUR.SIZE,
    quality: IMAGE_CONFIG.BLUR.QUALITY,
    fit,
  });

  // Props specific to main image
  const sharedImageProps = {
    priority,
    style: { objectFit: fit },
    width: dimension,
    height: dimension,
    unoptimized: true,
    onLoad: handleLoad,
    onError: handleError,
  };

  return (
    <div
      className={cn(
        "relative aspect-square w-full overflow-hidden bg-muted",
        className,
      )}
      {...props}
    >
      {/* Blur placeholder */}
      <Image
        {...sharedImageProps}
        alt={alt}
        src={blurUrl}
        className={cn(
          "absolute inset-0 h-full w-full scale-110 transform-gpu blur-xl",
          isLoading ? "opacity-100" : "opacity-0",
        )}
      />

      {/* Main image */}
      <Image
        {...sharedImageProps}
        alt={alt}
        src={imageUrl}
        className={cn(
          "relative h-full w-full transition-opacity duration-300",
          isLoading ? "opacity-0" : "opacity-100",
        )}
      />
    </div>
  );
}
