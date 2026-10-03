"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
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
import type { ImageType } from "@/types/image";
import { Skeleton } from "@/components/ui/skeleton";
import { OptimizedImage } from "@/components/optimized-image";
import { ImagePreviewDialog } from "@/components/image-preview-dialog";
import { useConfirmableAsyncAction } from "@/hooks/use-confirmable-async-action";
import {
  getErrorMessage,
  normalizeError,
  reportError,
} from "@/lib/error-utils";
import {
  deleteImage,
  loadImageFromPrimary,
  type ImageCollectionItem,
  reorderImages,
} from "@/app/dashboard/_lib/dashboard-db/images-collection";

interface ImageManagerProps {
  images: ImageCollectionItem[];
  onImagesChange?: (images: ImageCollectionItem[]) => void;
  onMutationSuccess?: () => void;
  prioritizeImages?: boolean;
  referenceId: string;
  type: ImageType;
}

function SortableImage({
  image,
  dragControls,
  priority,
}: {
  image: ImageCollectionItem;
  dragControls: (
    attributes: DraggableAttributes,
    listeners: Record<string, unknown>,
  ) => React.ReactNode;
  priority: boolean;
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
        image={image}
        alt="Daylily image"
        size="thumbnail"
        className="rounded-lg border"
        priority={priority}
      />
      {dragControls(attributes ?? {}, listeners ?? {})}
    </div>
  );
}

export function ImageManager({
  images,
  onImagesChange,
  onMutationSuccess,
  prioritizeImages = false,
  referenceId,
  type,
}: ImageManagerProps) {
  const searchParams = useSearchParams();
  const reviewImageId =
    searchParams?.get("intent") === "remove_image"
      ? searchParams?.get("imageId")
      : null;
  const reviewKey = reviewImageId
    ? `${type}:${referenceId}:${reviewImageId}`
    : null;
  const [loadedReviewKey, setLoadedReviewKey] = useState<string | null>(null);
  const openedImageRef = useRef<string | null>(null);
  const [imageToDelete, setImageToDelete] =
    useState<ImageCollectionItem | null>(null);
  const {
    isDialogOpen: isDeleteDialogOpen,
    isPending,
    openDialog: openDeleteDialog,
    runAction: confirmDelete,
    setIsDialogOpen: setIsDeleteDialogOpen,
  } = useConfirmableAsyncAction({
    action: async () => {
      if (!imageToDelete) {
        return;
      }

      await deleteImage({
        type,
        referenceId,
        imageId: imageToDelete.id,
      });
    },
    onSuccess: () => {
      if (!imageToDelete) {
        return;
      }

      onImagesChange?.(images.filter((img) => img.id !== imageToDelete.id));
      toast.success("Image deleted successfully");
      onMutationSuccess?.();
      setImageToDelete(null);
    },
    onError: (error) => {
      toast.error("Failed to delete image", {
        description: getErrorMessage(error),
      });
      reportError({
        error: normalizeError(error),
        context: { source: "ImageManager" },
      });
    },
  });

  useEffect(() => {
    if (!reviewImageId || !reviewKey) return;
    let cancelled = false;
    void loadImageFromPrimary({ type, referenceId, imageId: reviewImageId })
      .then(() => {
        if (!cancelled) setLoadedReviewKey(reviewKey);
      })
      .catch(() => {
        if (!cancelled)
          toast.error("This image removal link is no longer current.");
      });
    return () => {
      cancelled = true;
    };
  }, [type, referenceId, reviewImageId, reviewKey]);

  useEffect(() => {
    if (
      !reviewImageId ||
      loadedReviewKey !== reviewKey ||
      openedImageRef.current === reviewKey
    )
      return;
    const image = images.find((item) => item.id === reviewImageId);
    if (!image) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled || openedImageRef.current === reviewKey) return;
      openedImageRef.current = reviewKey;
      setImageToDelete(image);
      openDeleteDialog();
    });
    return () => {
      cancelled = true;
    };
  }, [images, loadedReviewKey, reviewImageId, reviewKey, openDeleteDialog]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const newImages = arrayMove(
      images,
      images.findIndex((img) => img.id === active.id),
      images.findIndex((img) => img.id === over.id),
    );

    onImagesChange?.(newImages);

    // Save the new order
    try {
      await reorderImages({
        type,
        referenceId,
        images: newImages.map((img, index) => ({
          id: img.id,
          order: index,
        })),
      });
      toast.success("Image order updated");
      onMutationSuccess?.();
    } catch (error) {
      toast.error("Failed to update image order", {
        description: getErrorMessage(error),
      });
      reportError({
        error: normalizeError(error),
        context: { source: "ImageManager" },
      });
    }
  }

  if (images.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        className="grid max-w-200 grid-cols-2 gap-4 md:grid-cols-4"
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
                  priority={prioritizeImages}
                  dragControls={(attributes, listeners) => (
                    <>
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        className="absolute top-2 left-2 cursor-grab touch-none"
                        data-testid="image-drag-handle"
                        data-image-id={image.id}
                        {...attributes}
                        {...listeners}
                      >
                        <GripVertical aria-hidden="true" />
                        <span className="sr-only">Drag to reorder</span>
                      </Button>
                      <ImagePreviewDialog
                        images={[image]}
                        className="absolute top-2 right-2"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        disabled={isPending}
                        className="absolute right-2 bottom-2"
                        data-testid="image-delete-button"
                        data-image-id={image.id}
                        onClick={() => {
                          setImageToDelete(image);
                          openDeleteDialog();
                        }}
                      >
                        <Trash2 aria-hidden="true" />
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
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          setIsDeleteDialogOpen(open);
          if (!open) {
            setImageToDelete(null);
          }
        }}
        onConfirm={() => {
          if (!imageToDelete) {
            return;
          }

          void confirmDelete();
        }}
        title="Delete Image"
        description={`Delete image ${imageToDelete?.id ?? ""}? This action cannot be undone.`}
      />
    </div>
  );
}

export function ImageManagerSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="relative aspect-square">
            <Skeleton className="size-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
