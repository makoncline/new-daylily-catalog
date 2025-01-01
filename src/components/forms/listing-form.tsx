"use client";

import { useRouter } from "next/navigation";
import {
  listingFormSchema,
  transformNullToUndefined,
  type ListingFormData,
} from "@/types/schemas/listing";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useZodForm } from "@/lib/hooks/use-zod-form";
import {
  updateListing,
  deleteListing,
  deleteImage,
  updateImageOrder,
} from "@/server/actions/listing";
import {
  Check,
  ChevronsUpDown,
  Search,
  X,
  ExternalLink,
  GripVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { api } from "@/trpc/react";

import type { ListingGetOutput } from "@/server/api/routers/listing";
import type { AhsListing } from "@prisma/client";
import { AhsListingLink } from "@/components/ahs-listing-link";
import { ImageUpload } from "@/components/image-upload";
import { LISTING_CONFIG } from "@/config/constants";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface SortableImageProps {
  image: ListingGetOutput["images"][number];
  isPending: boolean;
  onDelete: (id: string) => void;
}

function SortableImage({ image, isPending, onDelete }: SortableImageProps) {
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
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative aspect-square overflow-hidden rounded-lg border",
        isDragging && "opacity-50",
      )}
    >
      <img
        src={image.url}
        alt="Listing image"
        className="h-full w-full object-cover"
      />
      <div className="absolute inset-4 flex justify-between">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={() => onDelete(image.id)}
            disabled={isPending}
          >
            <X className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="h-8 w-8 cursor-grab opacity-0 transition-opacity active:cursor-grabbing group-hover:opacity-100"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </Button>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={() => window.open(image.url, "_blank")}
        >
          <ExternalLink className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function ListingForm({ listing }: { listing: ListingGetOutput }) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);
  const [uploadKey, setUploadKey] = useState(0);
  const [images, setImages] = useState(listing.images);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor),
  );

  const form = useZodForm({
    schema: listingFormSchema,
    defaultValues: {
      ...transformNullToUndefined(listingFormSchema.parse(listing)),
    },
  });

  async function onSubmit(values: ListingFormData) {
    setIsPending(true);
    try {
      await updateListing(listing.id, values);
      toast({
        title: "Listing updated successfully",
      });
      router.push("/listings");
    } catch {
      toast({
        title: "Failed to update listing",
        variant: "destructive",
      });
    } finally {
      setIsPending(false);
    }
  }

  async function onDelete() {
    if (!window.confirm("Are you sure you want to delete this listing?")) {
      return;
    }

    setIsPending(true);
    try {
      await deleteListing(listing.id);
      toast({
        title: "Listing deleted successfully",
      });
      router.push("/listings");
    } catch {
      toast({
        title: "Failed to delete listing",
        variant: "destructive",
      });
    } finally {
      setIsPending(false);
    }
  }

  async function handleImageDelete(imageId: string) {
    if (
      !window.confirm(
        "Are you sure you want to delete this image? This cannot be undone.",
      )
    ) {
      return;
    }

    setIsPending(true);
    try {
      await deleteImage(imageId);
      setImages((prev) => prev.filter((img) => img.id !== imageId));
      toast({
        title: "Image deleted successfully",
      });
    } catch {
      toast({
        title: "Failed to delete image",
        variant: "destructive",
      });
    } finally {
      setIsPending(false);
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = images.findIndex((img) => img.id === active.id);
    const newIndex = images.findIndex((img) => img.id === over.id);

    setImages((prev) => arrayMove(prev, oldIndex, newIndex));

    try {
      await updateImageOrder(active.id as string, newIndex);
      toast({
        title: "Image order updated successfully",
      });
    } catch {
      // Revert the order if the update fails
      setImages(listing.images);
      toast({
        title: "Failed to update image order",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="p-8">
      <h1 className="mb-4 text-2xl font-bold">
        Editing listing: {listing.name}
      </h1>

      <div className="space-y-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        field.onChange(
                          value === "" ? undefined : Number(value),
                        );
                      }}
                    />
                  </FormControl>
                  <FormDescription>Optional. Price in dollars.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="publicNote"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Public Note</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormDescription>
                    This note will be visible to everyone.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="privateNote"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Private Note</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormDescription>
                    This note will only be visible to you.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-between">
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : "Save Changes"}
              </Button>

              <Button
                type="button"
                variant="destructive"
                disabled={isPending}
                onClick={onDelete}
              >
                {isPending ? "Deleting..." : "Delete Listing"}
              </Button>
            </div>
          </form>
        </Form>

        <div className="border-t pt-8">
          <AhsListingLink
            listing={listing}
            onNameChange={(name) => {
              form.setValue("name", name);
            }}
          />
        </div>

        <div className="border-t pt-8">
          <div className="mb-4">
            <h2 className="font-medium">Images</h2>
            <p className="text-sm text-muted-foreground">
              Add up to {LISTING_CONFIG.IMAGES.MAX_COUNT} images for your
              listing. The first image will be used as the main image. Drag to
              reorder.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={images} strategy={rectSortingStrategy}>
                {images.map((image) => (
                  <SortableImage
                    key={image.id}
                    image={image}
                    isPending={isPending}
                    onDelete={handleImageDelete}
                  />
                ))}
              </SortableContext>
            </DndContext>
            {images.length < LISTING_CONFIG.IMAGES.MAX_COUNT && (
              <div className="aspect-square">
                <ImageUpload
                  key={uploadKey}
                  type="listing"
                  listingId={listing.id}
                  maxFiles={1}
                  onUploadComplete={async ({ success }) => {
                    if (success) {
                      setUploadKey((prev) => prev + 1);
                      // Get the updated listing with the new image
                      const updatedListing = await updateListing(
                        listing.id,
                        form.getValues(),
                      );
                      // Update the local images state
                      setImages(updatedListing.images);
                    }
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
