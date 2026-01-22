"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useDashboardTwoListings } from "./listings-provider";
import { AhsListingLinkTwo } from "./ahs-listing-link-two";
import { MultiListSelectTwo } from "./multi-list-select-two";
import { ImageUploadTwo } from "./image-upload-two";
import { ImageManagerTwo } from "./image-manager-two";
import { fromDbStatus, toDbStatus } from "./status";
import type { UiStatus, ListingRow } from "./types";

export function EditListingDialog({
  listingId,
  open,
  onOpenChange,
}: {
  listingId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const {
    listings,
    lists,
    updateListing,
    deleteListing,
    updateListingLists,
    deleteImage: deleteListingImage,
    reorderImages: reorderListingImages,
    createList,
  } = useDashboardTwoListings();

  const listing = useMemo(
    () => listings.find((l) => l.id === listingId) ?? null,
    [listings, listingId],
  );

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState<string>("");
  const [status, setStatus] = useState<UiStatus>("published");
  const [privateNote, setPrivateNote] = useState("");
  const [listIds, setListIds] = useState<string[]>([]);

  const saveAll = async () => {
    if (!listing) return;
    await updateListing({
      id: listing.id,
      data: {
        title,
        description,
        price: (() => {
          const p = price.trim() === "" ? null : Number(price);
          return Number.isFinite(p as number) ? (p as number) : null;
        })(),
        status: toDbStatus(status),
        privateNote,
      },
    });
    toast.success("Changes saved");
  };

  useEffect(() => {
    if (!listing) return;
    setTitle(listing.title ?? "");
    setDescription(listing.description ?? "");
    setPrice(listing.price ? String(listing.price) : "");
    setStatus(fromDbStatus(listing.status));
    setPrivateNote(listing.privateNote ?? "");
    setListIds(listing.lists.map((l) => l.id));
  }, [listing]);

  const saveField = async (
    data: Partial<
      Pick<
        ListingRow,
        "title" | "description" | "price" | "status" | "privateNote"
      >
    >,
  ) => {
    if (!listing) return;
    await updateListing({ id: listing.id, data });
    toast.success("Saved");
  };

  const onDelete = async () => {
    if (!listing) return;
    await deleteListing(listing.id);
    toast.success("Listing deleted");
    onOpenChange(false);
  };

  const onSelectLists = async (ids: string[]) => {
    if (!listing) return;
    setListIds(ids);
    await updateListingLists({ id: listing.id, listIds: ids });
  };

  if (!listing) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Listing</DialogTitle>
          </DialogHeader>
          <div className="text-muted-foreground text-sm">
            No listing selected.
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Listing</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Name</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => void saveField({ title })}
            />
          </div>

          {/* Images (match legacy position) */}
          <div className="space-y-2">
            <Label>Images</Label>
            <ImageManagerTwo
              images={listing.images}
              onDeleteImage={async (imageId) =>
                void deleteListingImage({ id: imageId })
              }
              onReorderImages={async (imgs) =>
                void reorderListingImages({
                  listingId: listing.id,
                  images: imgs,
                })
              }
            />
            <ImageUploadTwo listingId={listing.id} />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => void saveField({ description })}
              className="min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">Price</Label>
            <Input
              id="price"
              type="number"
              min={0}
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              onBlur={() =>
                void saveField({
                  price: (() => {
                    const p = price.trim() === "" ? null : Number(price);
                    return Number.isFinite(p as number) ? (p as number) : null;
                  })(),
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={status}
              onValueChange={(val: UiStatus) => {
                setStatus(val);
                void saveField({ status: toDbStatus(val) });
              }}
            >
              <SelectTrigger id="status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="hidden">Hidden</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="privateNote">Private Notes</Label>
            <Textarea
              id="privateNote"
              value={privateNote}
              onChange={(e) => setPrivateNote(e.target.value)}
              onBlur={() => void saveField({ privateNote })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="list-select">Lists</Label>
            <MultiListSelectTwo
              lists={lists}
              values={listIds}
              onSelect={(ids) => void onSelectLists(ids)}
              onCreateList={async (title) => createList(title)}
            />
          </div>

          <div className="space-y-2">
            <Label>Link to Daylily Database Listing</Label>
            <AhsListingLinkTwo
              listing={listing}
              onNameChange={(name) => setTitle(name)}
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button onClick={() => void saveAll()}>Save Changes</Button>
            <Button variant="destructive" onClick={() => void onDelete()}>
              Delete
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
