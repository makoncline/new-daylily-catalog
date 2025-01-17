"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/trpc/react";
import { ListingsTable } from "./_components/listings-table";
import { CreateListingButton } from "./_components/create-listing-button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ListingForm } from "@/components/forms/listing-form";
import { Suspense } from "react";

async function ListingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editingId = searchParams.get("editing");

  // Get all listings
  const { data: listings } = api.listing.list.useQuery();

  // Get the listing being edited
  const { data: editingListing } = api.listing.get.useQuery(
    { id: editingId! },
    {
      enabled: !!editingId,
      initialData: editingId
        ? listings?.find((l) => l.id === editingId)
        : undefined,
    },
  );

  const setEditing = (id: string | null) => {
    const params = new URLSearchParams(searchParams);
    if (id) {
      params.set("editing", id);
    } else {
      params.delete("editing");
    }
    router.replace(`?${params.toString()}`);
  };

  if (!listings) return null;

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Listings</h1>
          <p className="mt-2 text-muted-foreground">
            Manage and showcase your daylilies.
          </p>
        </div>
        <CreateListingButton />
      </div>

      <div className="mt-8">
        <ListingsTable initialListings={listings} onEdit={setEditing} />
      </div>

      <Dialog
        open={!!editingId}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto sm:max-w-xl md:max-w-2xl lg:max-w-4xl">
          {editingListing && (
            <>
              <DialogHeader>
                <DialogTitle>Edit: {editingListing.name}</DialogTitle>
                <DialogDescription>
                  Make changes to your listing here.
                </DialogDescription>
              </DialogHeader>
              <ListingForm
                initialListing={editingListing}
                onDelete={() => setEditing(null)}
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ListingsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ListingsContent />
    </Suspense>
  );
}
