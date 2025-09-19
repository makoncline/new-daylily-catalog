"use client";

import { Expand } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { ImageGallery } from "@/components/image-gallery";
import { cn } from "@/lib/utils";

interface ImagePreviewDialogProps {
  images: Array<{
    id: string;
    url: string;
    alt?: string;
  }>;
  className?: string;
  size?: "sm" | "md";
}

export function ImagePreviewDialog({
  images,
  className,
  size = "md",
}: ImagePreviewDialogProps) {
  if (images.length === 0) return null;

  const buttonSize = size === "sm" ? "h-8 w-8" : "h-10 w-10";
  const iconSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className={cn(buttonSize, className)}
        >
          <Expand className={iconSize} />
          <span className="sr-only">
            View {images.length} image{images.length !== 1 && "s"}
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <ImageGallery images={images} />
      </DialogContent>
    </Dialog>
  );
}
