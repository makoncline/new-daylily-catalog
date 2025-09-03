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
  const [loaded, setLoaded] = React.useState(false);
  const [transformError, setTransformError] = React.useState(false);

  const dimension =
    size === "thumbnail"
      ? IMAGE_CONFIG.SIZES.THUMBNAIL
      : IMAGE_CONFIG.SIZES.FULL;

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

  const handleError: React.ReactEventHandler<HTMLImageElement> =
    React.useCallback(
      (_error) => {
        if (!transformError) {
          setTransformError(true);
          const imageLoadError = new Error(
            `Failed to load optimized image resource`,
          );
          reportError({
            error: imageLoadError,
            level: "warning",
            context: {
              source: "OptimizedImage",
              src,
              transformedUrl: imageUrl,
              size,
              fit,
            },
          });
        }
      },
      [transformError, imageUrl, src, size, fit],
    );

  const handleLoad: React.ReactEventHandler<HTMLImageElement> =
    React.useCallback(() => {
      // In development, hold the overlay a bit so you can observe the blur-up
      if (process.env.NODE_ENV === "development") {
        const { MIN, MAX } = IMAGE_CONFIG.DEBUG.BLUR_DELAY;
        const ms = Math.floor(Math.random() * (MAX - MIN + 1)) + MIN;
        const id = setTimeout(() => setLoaded(true), ms);
        return () => clearTimeout(id);
      }
      // In production, fade overlay immediately after paint
      setLoaded(true);
    }, []);

  return (
    <div
      className={cn(
        "relative aspect-square w-full overflow-hidden bg-muted",
        className,
      )}
      {...props}
    >
      {/* LQIP overlay as background image */}
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-0 scale-110 transform-gpu blur-2xl transition-opacity duration-300",
          loaded ? "opacity-0" : "opacity-100",
        )}
        style={{
          backgroundImage: `url(${blurUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      <Image
        alt={alt}
        src={imageUrl}
        width={dimension}
        height={dimension}
        unoptimized
        decoding="async"
        style={{ objectFit: fit }}
        className={cn("relative h-full w-full")}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        onLoad={handleLoad}
        onError={handleError}
      />

      {/* Non-JS fallback ensures the real image is in the HTML for non-JS renderers */}
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={alt}
          width={dimension}
          height={dimension}
          style={{ objectFit: fit }}
        />
      </noscript>
    </div>
  );
}
