"use client";

import { useState } from "react";
import { type Image } from "@prisma/client";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DraggableAttributes,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { toast } from "sonner";
import { api } from "@/trpc/react";
import type { ImageType } from "@/types/image";
import { Skeleton } from "@/components/ui/skeleton";
import { OptimizedImage } from "@/components/optimized-image";
import { ImagePreviewDialog } from "@/components/image-preview-dialog";
import { getErrorMessage, normalizeError } from "@/lib/error-utils";

interface ImageManagerProps {
  images: Image[];
  onImagesChange: (images: Image[]) => void;
  referenceId: string;
  type: ImageType;
}

function SortableImage({
  image,
  dragControls,
}: {
  image: Image;
  dragControls: (
    attributes: DraggableAttributes,
    listeners: Record<string, unknown>,
  ) => React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative aspect-square">
      <OptimizedImage
        src={image.url}
        alt="Daylily image"
        size="thumbnail"
        className="rounded-lg border"
      />
      {dragControls(attributes ?? {}, listeners ?? {})}
    </div>
  );
}

export function ImageManager({
  images,
  onImagesChange,
  referenceId,
  type,
}: ImageManagerProps) {
  const [isPending, setIsPending] = useState(false);
  const [imageToDelete, setImageToDelete] = useState<Image | null>(null);

  const deleteImageMutation = api.image.deleteImage.useMutation({
    onSuccess: () => {
      toast.success("Image deleted successfully");
    },
    onError: (error, errorInfo) => {
      toast.error("Failed to delete image", {
        description: getErrorMessage(error),
      });
      reportError({
        error: normalizeError(error),
        context: { source: "ImageManager", errorInfo },
      });
    },
  });

  const reorderImagesMutation = api.image.reorderImages.useMutation({
    onSuccess: () => {
      toast.success("Image order updated");
    },
    onError: (error, errorInfo) => {
      toast.error("Failed to update image order", {
        description: getErrorMessage(error),
      });
      reportError({
        error: normalizeError(error),
        context: { source: "ImageManager", errorInfo },
      });
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  async function handleImageDelete(image: Image) {
    setIsPending(true);
    try {
      await deleteImageMutation.mutateAsync({
        type,
        referenceId,
        imageId: image.id,
      });
      onImagesChange(images.filter((img) => img.id !== image.id));
    } finally {
      setIsPending(false);
      setImageToDelete(null);
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const newImages = arrayMove(
      images,
      images.findIndex((img) => img.id === active.id),
      images.findIndex((img) => img.id === over.id),
    );

    onImagesChange(newImages);

    // Save the new order
    reorderImagesMutation.mutate({
      type,
      referenceId,
      images: newImages.map((img, index) => ({
        id: img.id,
        order: index,
      })),
    });
  }

  if (images.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div
        className="grid max-w-[800px] grid-cols-2 gap-4 md:grid-cols-4"
        data-testid="image-manager-grid"
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={images.map((img) => img.id)}>
            {images.map((image) => (
              <div
                key={image.id}
                className="group relative aspect-square"
                data-testid="image-item"
                data-image-id={image.id}
              >
                <SortableImage
                  image={image}
                  dragControls={(attributes, listeners) => (
                    <>
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        className="absolute top-2 left-2 size-8 cursor-grab touch-none"
                        data-testid="image-drag-handle"
                        data-image-id={image.id}
                        {...attributes}
                        {...listeners}
                      >
                        <GripVertical className="h-4 w-4" />
                        <span className="sr-only">Drag to reorder</span>
                      </Button>
                      <ImagePreviewDialog
                        images={[image]}
                        size="sm"
                        className="absolute top-2 right-2"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        disabled={isPending}
                        className="absolute right-2 bottom-2 size-8"
                        data-testid="image-delete-button"
                        data-image-id={image.id}
                        onClick={() => setImageToDelete(image)}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete image</span>
                      </Button>
                    </>
                  )}
                />
              </div>
            ))}
          </SortableContext>
        </DndContext>
      </div>

      <DeleteConfirmDialog
        open={!!imageToDelete}
        onOpenChange={() => setImageToDelete(null)}
        onConfirm={() => imageToDelete && handleImageDelete(imageToDelete)}
        title="Delete Image"
        description="Are you sure you want to delete this image? This action cannot be undone."
      />
    </div>
  );
}

export function ImageManagerSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="relative aspect-square">
            <Skeleton className="h-full w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
