"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import {
  updateListing,
  updateImageOrder,
  deleteImage,
} from "@/server/actions/listing";
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

export function ListingForm({ listing }: ListingFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);
  const [images, setImages] = useState<Image[]>(listing.images);
  const [imageToDelete, setImageToDelete] = useState<Image | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const form = useForm<ListingFormData>({
    resolver: zodResolver(listingFormSchema),
    defaultValues: transformNullToUndefined({
      name: listing.name,
      price: listing.price,
      publicNote: listing.publicNote,
      privateNote: listing.privateNote,
    }),
  });

  async function onSubmit(data: ListingFormData) {
    setIsPending(true);
    try {
      // TODO: Add update listing mutation
      toast({
        title: "Listing updated successfully",
      });
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
      // TODO: Add delete listing mutation
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

  async function handleImageDelete(image: Image) {
    setIsPending(true);
    try {
      await deleteImage(image.id);
      setImages((prev) => prev.filter((img) => img.id !== image.id));
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
      updateImageOrder(active.id, newIndex)
        .then(() => {
          toast({
            title: "Image order updated",
          });
        })
        .catch(() => {
          toast({
            title: "Failed to update image order",
            variant: "destructive",
          });
        });

      return newImages;
    });
  }

  async function saveChanges(data: Partial<ListingFormData>) {
    try {
      await updateListing(listing.id, {
        name: data.name ?? listing.name,
        price: data.price ?? listing.price ?? undefined,
        publicNote: data.publicNote ?? listing.publicNote ?? undefined,
        privateNote: data.privateNote ?? listing.privateNote ?? undefined,
      });
      toast({
        title: "Changes saved",
      });
    } catch {
      toast({
        title: "Failed to save changes",
        variant: "destructive",
      });
    }
  }

  // Handle auto-save on blur
  const onFieldBlur = async (field: keyof ListingFormData) => {
    const value = form.getValues(field);
    const initialValue = listing[field] ?? undefined;

    // Only save if the value has changed
    if (value !== initialValue) {
      setIsPending(true);
      try {
        const data: ListingFormData = {
          name: listing.name,
          price: listing.price ?? undefined,
          publicNote: listing.publicNote ?? undefined,
          privateNote: listing.privateNote ?? undefined,
          [field]: value,
        };

        const updatedListing = await updateListing(listing.id, data);

        // Update the local listing object
        Object.assign(listing, {
          [field]: updatedListing[field],
        });

        toast({
          title: "Changes saved",
        });
      } catch {
        toast({
          title: "Failed to save changes",
          variant: "destructive",
        });
      } finally {
        setIsPending(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          Editing listing: {listing.name}
        </h1>
        <p className="text-muted-foreground">
          Update the details of your listing below.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
                  <Textarea
                    {...field}
                    value={field.value ?? ""}
                    onBlur={() => onFieldBlur("privateNote")}
                  />
                </FormControl>
                <FormDescription>
                  This note will only be visible to you.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormItem>
            <FormLabel>AHS Cultivar</FormLabel>
            <AhsListingLink
              listing={listing}
              onNameChange={async (name) => {
                try {
                  const updatedListing = await updateListing(listing.id, {
                    name,
                    price: listing.price ?? undefined,
                    publicNote: listing.publicNote ?? undefined,
                    privateNote: listing.privateNote ?? undefined,
                  });
                  // Update form and local state
                  form.setValue("name", name);
                  Object.assign(listing, {
                    name: updatedListing.name,
                  });
                } catch (error) {
                  toast({
                    title: "Failed to update name",
                    variant: "destructive",
                  });
                }
              }}
              onUpdate={async () => {
                // Get the updated listing data
                const updatedListing = await updateListing(listing.id, {
                  name: listing.name,
                  price: listing.price ?? undefined,
                  publicNote: listing.publicNote ?? undefined,
                  privateNote: listing.privateNote ?? undefined,
                });
                // Update the local listing object to reflect changes immediately
                Object.assign(listing, {
                  ahsId: updatedListing.ahsId,
                  ahsListing: updatedListing.ahsListing,
                });
              }}
            />
            <FormDescription>
              Link this listing to an officially registered daylily from the AHS
              database.
            </FormDescription>
          </FormItem>

          <div className="space-y-4">
            <FormLabel>Images</FormLabel>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <SortableContext items={images.map((img) => img.id)}>
                    {images.map((image) => (
                      <div key={image.id} className="group relative">
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
                                  <span className="sr-only">
                                    View full size
                                  </span>
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
                </div>
                {images.length < 4 && (
                  <div className="rounded-lg border-2 border-dashed">
                    <ImageUpload
                      type="listing"
                      listingId={listing.id}
                      onUploadComplete={({ success }) => {
                        if (success) {
                          // Refresh listing data to get the new image
                          updateListing(listing.id, {
                            name: listing.name,
                            price: listing.price,
                            publicNote: listing.publicNote,
                            privateNote: listing.privateNote,
                            ahsId: listing.ahsId,
                            listId: listing.listId,
                          }).then((updatedListing) => {
                            setImages(updatedListing.images);
                          });
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            </DndContext>
            <FormDescription>
              Add up to 4 images for your listing. The first image will be used
              as the main image. Drag to reorder.
            </FormDescription>
          </div>

          <div className="flex justify-between">
            <Button
              type="button"
              variant="destructive"
              onClick={onDelete}
              disabled={isPending}
            >
              Delete Listing
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Form>

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
              disabled={isPending}
            >
              {isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
