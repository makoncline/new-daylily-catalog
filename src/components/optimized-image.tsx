"use client";

import * as React from "react";
import Image from "next/image";
import { env } from "@/env.js";
import { cn } from "@/lib/utils";
import { logError } from "@/lib/error-utils";

// Image configuration
const IMAGE_CONFIG = {
  BLUR: {
    SIZE: 20,
    QUALITY: 5, // Very low quality for blur placeholder
  },
  SIZES: {
    THUMBNAIL: 200,
    FULL: 800,
  },
  QUALITY: {
    LOW: 60, // Good for thumbnails, very compressed
    MEDIUM: 75, // Good balance for most images
    HIGH: 90, // High quality for full size images
  },
  FIT: "cover" as const,
  FORMAT: "auto" as const,
  DEBUG: {
    BLUR_DELAY: {
      MIN: 100,
      MAX: 1000,
    },
  },
} as const;

// Custom error class for transform failures
class CloudflareTransformError extends Error {
  constructor(
    message: string,
    public readonly context: {
      src: string;
      transformedUrl: string;
      size?: "thumbnail" | "full";
      fit?: string;
    },
  ) {
    super(message);
    this.name = "CloudflareTransformError";
  }
}

// Cloudflare image loader following their recommended pattern
const cloudflareLoader = ({
  src,
  width,
  quality,
  fit = IMAGE_CONFIG.FIT,
  format = IMAGE_CONFIG.FORMAT,
}: {
  src: string;
  width: number;
  quality?: number;
  fit?: "scale-down" | "contain" | "cover" | "crop" | "pad";
  format?: "auto" | "webp" | "avif" | "json";
}) => {
  const params = [`width=${width}`, `fit=${fit}`, `format=${format}`];
  if (quality) {
    params.push(`quality=${quality}`);
  }

  const paramsString = params.join(",");

  // In development, use full URL
  if (process.env.NODE_ENV === "development") {
    return `${env.NEXT_PUBLIC_CLOUDFLARE_URL}/cdn-cgi/image/${paramsString}/${src}`;
  }

  // In production, use relative URL
  return `/cdn-cgi/image/${paramsString}/${src}`;
};

interface OptimizedImageProps extends React.HTMLAttributes<HTMLDivElement> {
  src: string;
  alt: string;
  size?: "thumbnail" | "full";
  className?: string;
  priority?: boolean;
  fit?: "scale-down" | "contain" | "cover" | "crop" | "pad";
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

  const handleError = React.useCallback(() => {
    if (!transformError) {
      setTransformError(true);

      const transformedUrl = cloudflareLoader({
        src,
        width: dimension,
        quality:
          size === "thumbnail"
            ? IMAGE_CONFIG.QUALITY.LOW
            : IMAGE_CONFIG.QUALITY.HIGH,
        fit,
      });

      const cfError = new CloudflareTransformError(
        "Cloudflare image transform failed",
        {
          src,
          transformedUrl,
          size,
          fit,
        },
      );

      logError(cfError, {
        componentStack: `
          at OptimizedImage
          at Image (${src})
        `,
      });
    }
  }, [transformError, src, dimension, size, fit]);

  // Get the transformed URL for the main image
  const imageUrl = cloudflareLoader({
    src,
    width: dimension,
    quality:
      size === "thumbnail"
        ? IMAGE_CONFIG.QUALITY.LOW
        : IMAGE_CONFIG.QUALITY.HIGH,
    fit,
  });

  // Get the transformed URL for the blur placeholder
  const blurUrl = cloudflareLoader({
    src,
    width: IMAGE_CONFIG.BLUR.SIZE,
    quality: IMAGE_CONFIG.BLUR.QUALITY,
    fit,
  });

  return (
    <div
      className={cn(
        "relative aspect-square w-full overflow-hidden bg-muted",
        className,
      )}
      {...props}
    >
      <Image
        src={imageUrl}
        alt={alt}
        width={dimension}
        height={dimension}
        className={cn(
          "h-full w-full transition-opacity duration-300",
          `object-${fit}`,
          isLoading ? "opacity-0" : "opacity-100",
        )}
        onLoadingComplete={handleLoad}
        onError={handleError}
        priority={priority}
        unoptimized
        placeholder="blur"
        blurDataURL={blurUrl}
      />
    </div>
  );
}
