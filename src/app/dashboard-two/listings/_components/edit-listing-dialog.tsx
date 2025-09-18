"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useDashboardTwoListings } from "./listings-provider";
import { api } from "@/trpc/react";
import { AhsListingDisplayTwo } from "./ahs-listing-display-two";
import { AhsListingLinkTwo } from "./ahs-listing-link-two";
import { MultiListSelectTwo } from "./multi-list-select-two";
import { ImageUploadTwo } from "./image-upload-two";
import { ImageManagerTwo } from "./image-manager-two";

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
    setListingAhsId,
    createImage: createListingImage,
    deleteImage: deleteListingImage,
    reorderImages: reorderListingImages,
    createList,
  } = useDashboardTwoListings();

  const listing = useMemo(() => listings.find((l) => l.id === listingId) ?? null, [listings, listingId]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState<number | "">("");
  const [status, setStatus] = useState<string>("published");
  const [privateNote, setPrivateNote] = useState("");
  const [listIds, setListIds] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState("");
  const saveAll = async () => {
    if (!listing) return;
    await updateListing({
      id: listing.id,
      title,
      description,
      price: price === "" ? null : Number(price),
      status: status === "published" ? "" : status,
      privateNote,
    } as any);
    toast.success("Changes saved");
  };

  useEffect(() => {
    if (!listing) return;
    setTitle(listing.title ?? "");
    setDescription((listing.description ?? "") as string);
    setPrice(typeof listing.price === "number" ? listing.price : "");
    const dbStatus = listing.status ?? "";
    setStatus(dbStatus === "" ? "published" : dbStatus);
    setPrivateNote((listing.privateNote ?? "") as string);
    setListIds(listing.lists.map((l) => l.id));
  }, [listing]);

  const saveField = async (data: Partial<{ title: string; description: string; price: number | null; status: string | null; privateNote: string | null }>) => {
    if (!listing) return;
    await updateListing({ id: listing.id, ...data } as any);
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

  // AHS search/link
  const [search, setSearch] = useState("");
  const enabled = search.trim().length >= 3;
  const { data: searchResults = [], isLoading: isSearching } = api.dashboardTwo.searchAhs.useQuery(
    { query: search.trim() },
    { enabled },
  );

  const clearAhs = async () => {
    if (!listing) return;
    await setListingAhsId({ id: listing.id, ahsId: null });
  };

  if (!listing) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Listing</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground">No listing selected.</div>
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
              images={listing.images as any}
              onDeleteImage={async (imageId) => void deleteListingImage({ id: imageId })}
              onReorderImages={async (imgs) => void reorderListingImages({ listingId: listing.id, images: imgs })}
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
              value={price}
              onChange={(e) => setPrice(e.target.value === "" ? "" : Number(e.target.value))}
              onBlur={() => void saveField({ price: price === "" ? null : Number(price) })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={status}
              onValueChange={(val) => {
                setStatus(val);
                void saveField({ status: val === "published" ? "" : val });
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
            <AhsListingLinkTwo listing={listing} onNameChange={(name) => setTitle(name)} />
          </div>

          <div className="flex justify-end gap-3">
            <Button onClick={() => void saveAll()}>Save Changes</Button>
            <Button variant="destructive" onClick={() => void onDelete()}>Delete</Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
