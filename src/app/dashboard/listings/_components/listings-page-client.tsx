"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { api, type RouterOutputs } from "@/trpc/react";
import { ListingsTable } from "./listings-table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ListingForm } from "@/components/forms/listing-form";

interface ListingsPageClientProps {
  initialListings: RouterOutputs["listing"]["list"];
}

export function ListingsPageClient({
  initialListings,
}: ListingsPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editingId = searchParams.get("editing");

  // Get the listing being edited
  const { data: editingListing } = api.listing.get.useQuery(
    { id: editingId! },
    {
      enabled: !!editingId,
      initialData: editingId
        ? initialListings.find((l) => l.id === editingId)
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

  return (
    <>
      <ListingsTable initialListings={initialListings} onEdit={setEditing} />

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
                onClose={() => setEditing(null)}
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
