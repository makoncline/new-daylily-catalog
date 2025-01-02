"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  listingFormSchema,
  transformNullToUndefined,
  type ListingFormData,
} from "@/types/schemas/listing";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Expand, GripVertical, Trash2 } from "lucide-react";
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
import { ImageUpload } from "@/components/image-upload";
import { useToast } from "@/hooks/use-toast";
import { type Image } from "@prisma/client";
import { type ListingGetOutput } from "@/server/api/routers/listing";
import { AhsListingLink } from "@/components/ahs-listing-link";
import { api } from "@/trpc/react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useZodForm } from "@/lib/hooks/use-zod-form";
import { type ImageUploadResponse } from "@/types/image";

interface ListingFormProps {
  listing: ListingGetOutput;
}

function SortableImage({
  image,
  dragControls,
}: {
  image: Image;
  dragControls: (attributes: any, listeners: any) => React.ReactNode;
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
      <img
        src={image.url}
        alt="Listing image"
        className="h-full w-full rounded-lg border object-cover"
      />
      {dragControls(attributes ?? {}, listeners ?? {})}
    </div>
  );
}

export function ListingForm({ listing: initialListing }: ListingFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);
  const [listing, setListing] = useState(initialListing);
  const [images, setImages] = useState<Image[]>(initialListing.images);
  const [imageToDelete, setImageToDelete] = useState<Image | null>(null);

  const updateListingMutation = api.listing.update.useMutation({
    onSuccess: () => {
      toast({
        title: "Changes saved",
      });
    },
    onError: () => {
      toast({
        title: "Failed to save changes",
        variant: "destructive",
      });
    },
  });

  const deleteListingMutation = api.listing.delete.useMutation({
    onSuccess: () => {
      toast({
        title: "Listing deleted successfully",
      });
      router.push("/listings");
    },
    onError: () => {
      toast({
        title: "Failed to delete listing",
        variant: "destructive",
      });
    },
  });

  const deleteImageMutation = api.listing.deleteImage.useMutation({
    onSuccess: () => {
      toast({
        title: "Image deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Failed to delete image",
        variant: "destructive",
      });
    },
  });

  const reorderImagesMutation = api.listing.reorderImages.useMutation({
    onSuccess: () => {
      toast({
        title: "Image order updated",
      });
    },
    onError: () => {
      toast({
        title: "Failed to update image order",
        variant: "destructive",
      });
    },
  });

  const addImageMutation = api.listing.addImage.useMutation({
    onSuccess: (newImage) => {
      setImages((prev) => [...prev, newImage]);
      toast({
        title: "Image added successfully",
      });
    },
    onError: () => {
      toast({
        title: "Failed to add image",
        variant: "destructive",
      });
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const form = useZodForm({
    schema: listingFormSchema,
    defaultValues: transformNullToUndefined(
      listingFormSchema.parse(initialListing),
    ),
  });

  // Handle auto-save on blur
  const onFieldBlur = async (field: keyof ListingFormData) => {
    const value = form.getValues(field);
    const initialValue =
      field === "price"
        ? (listing[field] ?? undefined)
        : (listing[field] ?? "");

    // Only save if the value has changed
    if (value !== initialValue) {
      setIsPending(true);
      try {
        const updatedListing = await updateListingMutation.mutateAsync({
          id: listing.id,
          data: {
            name: listing.name,
            price: listing.price ?? undefined,
            publicNote: listing.publicNote ?? undefined,
            privateNote: listing.privateNote ?? undefined,
            [field]: value,
          },
        });
        setListing(updatedListing);
      } finally {
        setIsPending(false);
      }
    }
  };

  async function onDelete() {
    setIsPending(true);
    try {
      await deleteListingMutation.mutateAsync({
        id: listing.id,
      });
    } finally {
      setIsPending(false);
    }
  }

  async function handleImageDelete(image: Image) {
    setIsPending(true);
    try {
      await deleteImageMutation.mutateAsync({
        imageId: image.id,
      });
      setImages((prev) => prev.filter((img) => img.id !== image.id));
    } finally {
      setIsPending(false);
      setImageToDelete(null);
    }
  }

  async function handleDragEnd(event: any) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setImages((prev) => {
      const oldIndex = prev.findIndex((img) => img.id === active.id);
      const newIndex = prev.findIndex((img) => img.id === over.id);
      const newImages = arrayMove(prev, oldIndex, newIndex);

      // Save the new order
      reorderImagesMutation.mutate({
        images: newImages.map((img, index) => ({
          id: img.id,
          order: index,
        })),
      });

      return newImages;
    });
  }

  return (
    <Form {...form}>
      <form className="space-y-8">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} onBlur={() => onFieldBlur("name")} />
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
                    field.onChange(value === "" ? undefined : Number(value));
                  }}
                  onBlur={() => onFieldBlur("price")}
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
                <Textarea
                  {...field}
                  value={field.value ?? ""}
                  onBlur={() => onFieldBlur("publicNote")}
                />
              </FormControl>
              <FormDescription>
                Optional. This note will be visible to everyone.
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
                <Textarea
                  {...field}
                  value={field.value ?? ""}
                  onBlur={() => onFieldBlur("privateNote")}
                />
              </FormControl>
              <FormDescription>
                Optional. This note will only be visible to you.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormItem>
          <FormLabel>AHS Listing</FormLabel>
          <AhsListingLink
            listing={listing}
            onNameChange={(name) => {
              form.setValue("name", name);
              setListing((prev) => ({ ...prev, name }));
            }}
            onUpdate={(updatedListing) => {
              setListing(updatedListing);
            }}
          />
          <FormDescription>
            Optional. Link this listing to an AHS listing to sync data.
          </FormDescription>
        </FormItem>

        <div className="space-y-4">
          <FormItem>
            <FormLabel>Images</FormLabel>
            <FormDescription>
              Upload images of your listing. You can reorder them by dragging.
            </FormDescription>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
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
                    >
                      <SortableImage
                        image={image}
                        dragControls={(attributes, listeners) => (
                          <>
                            <Button
                              type="button"
                              variant="secondary"
                              size="icon"
                              className="absolute left-2 top-2 h-8 w-8 cursor-grab touch-none opacity-0 transition-opacity group-hover:opacity-100"
                              {...attributes}
                              {...listeners}
                            >
                              <GripVertical className="h-4 w-4" />
                              <span className="sr-only">Drag to reorder</span>
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              size="icon"
                              className="absolute right-2 top-2 h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                              asChild
                            >
                              <a
                                href={image.url}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Expand className="h-4 w-4" />
                                <span className="sr-only">View full size</span>
                              </a>
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute bottom-2 right-2 h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
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
          </FormItem>

          <div className="p-4">
            <ImageUpload
              type="listing"
              listingId={listing.id}
              onUploadComplete={(result) => {
                if (result.success && result.url) {
                  addImageMutation.mutate({
                    url: result.url,
                    listingId: listing.id,
                  });
                }
              }}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="button"
            variant="destructive"
            onClick={onDelete}
            disabled={isPending}
          >
            Delete Listing
          </Button>
        </div>
      </form>

      <AlertDialog
        open={!!imageToDelete}
        onOpenChange={() => setImageToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Image</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this image? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => imageToDelete && handleImageDelete(imageToDelete)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Form>
  );
}
