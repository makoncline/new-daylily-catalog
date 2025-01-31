"use client";

import { ImageIcon } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { OptimizedImage } from "@/components/optimized-image";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface ImagePopoverProps {
  /**
   * List of images to display in the popover
   * Each image should have a url and id
   */
  images: Array<{ url: string; id: string }>;
  /**
   * Optional class name for the trigger button
   */
  className?: string;
  /**
   * Optional trigger button size. Defaults to "md"
   */
  size?: "sm" | "md";
}

export function ImagePopover({
  images,
  className,
  size = "md",
}: ImagePopoverProps) {
  if (!images.length) return null;

  const isSingleImage = images.length === 1;
  const buttonSize = size === "sm" ? "h-8 w-8" : "h-10 w-10";
  const iconSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(buttonSize, "p-0", className)}
        >
          <ImageIcon className={cn(iconSize, "text-muted-foreground")} />
          <span className="sr-only">
            View {images.length} image{!isSingleImage && "s"}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="right"
        align="start"
        sideOffset={8}
        className={cn(
          "w-fit p-2 shadow-lg",
          !isSingleImage ? "grid grid-cols-2 gap-2" : "",
        )}
      >
        {images.map((image) => (
          <div
            key={image.id}
            className={cn(
              "overflow-hidden rounded-md",
              isSingleImage
                ? "aspect-square w-[300px]"
                : "aspect-square w-[100px]",
            )}
          >
            <OptimizedImage
              src={image.url}
              alt="Image preview"
              size="thumbnail"
              className="h-full w-full object-cover"
            />
          </div>
        ))}
      </PopoverContent>
    </Popover>
  );
}
