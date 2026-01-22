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

const reportedImageErrors = new Set<string>();

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

      <OptimizedImageInner
        key={imageUrl}
        alt={alt}
        src={src}
        imageUrl={imageUrl}
        dimension={dimension}
        fit={fit}
        size={size}
        priority={priority}
        onLoad={handleLoad}
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

interface OptimizedImageInnerProps {
  alt: string;
  src: string;
  imageUrl: string;
  dimension: number;
  fit: "contain" | "cover";
  size: "thumbnail" | "full";
  priority: boolean;
  onLoad: React.ReactEventHandler<HTMLImageElement>;
}

function OptimizedImageInner({
  alt,
  src,
  imageUrl,
  dimension,
  fit,
  size,
  priority,
  onLoad,
}: OptimizedImageInnerProps) {
  const [currentSrc, setCurrentSrc] = React.useState(imageUrl);

  const handleError: React.ReactEventHandler<HTMLImageElement> =
    React.useCallback(
      (_error) => {
        if (currentSrc !== src && imageUrl !== src) {
          setCurrentSrc(src);
          return;
        }

        const reportKey = `${src}::${imageUrl}`;
        if (reportedImageErrors.has(reportKey)) return;
        reportedImageErrors.add(reportKey);

        const imageLoadError = new Error(`Failed to load image resource`);
        reportError({
          error: imageLoadError,
          level: "warning",
          context: {
            source: "OptimizedImage",
            src,
            transformedUrl: imageUrl,
            attemptedSrc: currentSrc,
            size,
            fit,
          },
        });
      },
      [currentSrc, imageUrl, src, size, fit],
    );

  return (
    <Image
      alt={alt}
      src={currentSrc}
      width={dimension}
      height={dimension}
      unoptimized
      decoding="async"
      style={{ objectFit: fit }}
      className={cn("relative h-full w-full")}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      onLoad={onLoad}
      onError={handleError}
    />
  );
}
