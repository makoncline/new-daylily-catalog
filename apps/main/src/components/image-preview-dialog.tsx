"use client";

import { Expand } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ImageGallery } from "@/components/image-gallery";
import type { OptimizedImageSource } from "@/components/optimized-image";

interface ImagePreviewDialogProps {
  images: OptimizedImageSource[];
  className?: string;
}

export function ImagePreviewDialog({
  images,
  className,
}: ImagePreviewDialogProps) {
  if (images.length === 0) return null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className={className}
        >
          <Expand aria-hidden="true" />
          <span className="sr-only">
            View {images.length} image{images.length !== 1 && "s"}
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogTitle className="sr-only">Image preview</DialogTitle>
        <DialogDescription className="sr-only">
          Full-size preview of {images.length} image
          {images.length === 1 ? "." : "s."}
        </DialogDescription>
        <ImageGallery images={images} />
      </DialogContent>
    </Dialog>
  );
}
