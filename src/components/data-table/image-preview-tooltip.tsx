"use client";

import * as React from "react";
import Image from "next/image";
import { Image as ImageIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { OptimizedImage } from "@/components/optimized-image";
import { type Image as ImageType } from "@prisma/client";

interface ImagePreviewTooltipProps {
  images: ImageType[];
  ahsImageUrl?: string | null;
}

export function ImagePreviewTooltip({
  images,
  ahsImageUrl,
}: ImagePreviewTooltipProps) {
  if (!images.length && !ahsImageUrl) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <ImageIcon className="h-4 w-4 text-muted-foreground" />
          <span className="sr-only">
            View {images.length + (ahsImageUrl ? 1 : 0)} images
          </span>
        </TooltipTrigger>
        <TooltipContent side="right" className="flex gap-2 p-2">
          {images.map((image) => (
            <OptimizedImage
              key={image.id}
              src={image.url}
              alt="Daylily preview"
              size="thumbnail"
              className="!h-[100px] !w-[100px]"
            />
          ))}
          {ahsImageUrl && (
            <div className="h-[100px] w-[100px] overflow-hidden rounded-md border">
              <Image
                src={ahsImageUrl}
                alt="AHS Daylily preview"
                width={100}
                height={100}
                className="h-full w-full object-cover"
                unoptimized
              />
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
